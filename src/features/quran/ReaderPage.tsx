import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, StickyNote } from 'lucide-react'
import { Spinner } from '../../components/Common'
import { toast, useDocumentTitle, useLive, usePlayer, useQuran, useKeepAwake } from '../../hooks'
import { ayahMeta, BASMALA_SURAH_EXCEPTIONS, loadTranslation, type QuranData, type Translation } from '../../services/quran'
import { bookmarks, kv, notes, reading } from '../../db/repos'
import { useSettings } from '../../state/SettingsContext'
import type { ReaderMode } from '../../state/settings'
import { dayKey } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'
import { ReaderChrome } from './reader/ReaderChrome'
import { AyahNum, Flourish, SurahTitle } from './reader/Ornaments'
import { ReaderSheets, useReaderSheets } from './reader/ReaderSheets'
import type { Note } from '../../db/db'

export function ReaderPage() {
  const { data, error } = useQuran()
  const params = useParams()
  const surah = Math.min(114, Math.max(1, Number(params.surah) || 1))
  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return <Spinner />
  return <Reader key={surah} data={data} surah={surah} />
}

export function useTranslationText(enabled: string): Translation | null {
  const [t, setT] = useState<Translation | null>(null)
  useEffect(() => {
    if (enabled === 'none') { setT(null); return }
    let alive = true
    loadTranslation(enabled).then((x) => alive && setT(x)).catch(() => alive && toast('تعذر تحميل الترجمة'))
    return () => { alive = false }
  }, [enabled])
  return t
}

/** تسجيل قراءة نطاق من الآيات في سجل التقدم (بإجراء صريح من المستخدم) */
async function logRead(data: QuranData, surah: number, from: number, to: number) {
  const pages = new Set<number>()
  for (let x = from; x <= to; x++) pages.add(ayahMeta(data.meta, surah, x).page)
  await reading.log({ date: dayKey(), surah, from, to, ayahs: to - from + 1, pages: [...pages] })
}

function Reader({ data, surah }: { data: QuranData; surah: number }) {
  const s = data.meta.surahs[surah - 1]
  useDocumentTitle(`سورة ${s.name}`)
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { settings, update, ready } = useSettings()
  useKeepAwake(settings.keepAwake)
  const target = Math.min(s.count, Math.max(1, Number(sp.get('ayah')) || 1))
  const [current, setCurrent] = useState(target)
  const readFrom = useRef(target)
  const sheets = useReaderSheets()
  const p = usePlayer()
  const translation = useTranslationText(settings.translation)
  const marks = useLive(() => bookmarks.all(), ['bookmarks'], [])
  const marked = useMemo(() => new Set(marks.filter((b) => b.surah === surah).map((b) => b.ayah)), [marks, surah])
  const noteList = useLive(() => notes.all(), ['notes'], [] as Note[])
  const noted = useMemo(() => new Set(noteList.filter((n) => n.surah === surah).map((n) => n.ayah)), [noteList, surah])
  const mode = settings.readerMode

  // من اختار «صفحات المصحف» يُفتح له المصحف على صفحة الآية نفسها
  useEffect(() => {
    if (ready && mode === 'mushaf' && !sp.has('flow')) nav(`/mushaf/${ayahMeta(data.meta, surah, target).page}?s=${surah}&a=${target}`, { replace: true })
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const changeMode = (m: ReaderMode) => {
    update({ readerMode: m })
    if (m === 'mushaf') nav(`/mushaf/${ayahMeta(data.meta, surah, current).page}?s=${surah}&a=${current}`)
  }

  const markRead = async (_s: number, a: number) => {
    const from = Math.min(readFrom.current, a)
    await logRead(data, surah, from, a)
    readFrom.current = a + 1
    toast(`سُجّلت قراءة ${a - from + 1} آية`)
  }

  // حفظ آخر موضع قراءة (لا يمس العلامات المرجعية)
  useEffect(() => { kv.set('quran:last', { surah, ayah: current, at: Date.now() }).catch(() => {}) }, [surah, current])

  const playingHere = p.status !== 'idle' && p.surah === surah && !p.playingBasmala
  const meta = ayahMeta(data.meta, surah, current)

  return (
    <ReaderChrome title={`سورة ${s.name}`} subtitle={`الصفحة ${meta.page} • الجزء ${meta.juz}`} infoHref={`/quran/${surah}/info`}
      current={{ surah, ayah: current, surahName: s.name, count: s.count }} onModeChange={changeMode} onTafsir={(su, a) => sheets.setTafsir({ surah: su, ayah: a })}>
      {mode === 'focus'
        ? <FocusView data={data} surah={surah} ayah={current} onAyah={setCurrent} translation={translation} playing={playingHere ? p.ayah : null} onOpen={(a) => sheets.setActions({ surah, ayah: a })} />
        : <FlowView data={data} surah={surah} target={target} highlightTarget={sp.has('ayah')} onVisible={setCurrent} translation={translation}
            playing={playingHere ? p.ayah : null} marked={marked} noted={noted} onOpen={(a) => sheets.setActions({ surah, ayah: a })}
            onFinish={async () => { await logRead(data, surah, Math.min(readFrom.current, s.count), s.count); readFrom.current = s.count + 1; toast('سُجّلت قراءة السورة') }} />}
      <ReaderSheets data={data} s={sheets} onMarkRead={markRead} />
    </ReaderChrome>
  )
}

interface FlowProps {
  data: QuranData; surah: number; target: number; highlightTarget: boolean; translation: Translation | null; playing: number | null
  marked: Set<number>; noted: Set<number>; onVisible: (a: number) => void; onOpen: (a: number) => void; onFinish: () => void
}

/** القراءة المتتابعة: السورة نصًا متصلًا كالمصحف مع فواصل الصفحات، أو آية بآية عند تفعيل الترجمة */
function FlowView({ data, surah, target, highlightTarget, translation, playing, marked, noted, onVisible, onOpen, onFinish }: FlowProps) {
  const nav = useNavigate()
  const s = data.meta.surahs[surah - 1]
  const verses = data.verses[surah - 1]

  useEffect(() => {
    if (target > 1) document.getElementById(`ayah-${target}`)?.scrollIntoView({ block: 'center' })
  }, [target])

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-ayah]'))
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.ayah))
      if (!vis.length) return
      clearTimeout(timer)
      timer = setTimeout(() => onVisible(Math.min(...vis)), 500)
    }, { rootMargin: '-90px 0px -55% 0px' })
    els.forEach((e) => io.observe(e))
    return () => { io.disconnect(); clearTimeout(timer) }
  }, [surah, translation, onVisible])

  useEffect(() => {
    if (playing) document.getElementById(`ayah-${playing}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [playing])

  // تقسيم السورة بحسب صفحات المصحف لعرض فواصل الصفحات
  const pages = useMemo(() => {
    const out: { page: number; ayahs: number[] }[] = []
    verses.forEach((_, i) => {
      const pg = ayahMeta(data.meta, surah, i + 1).page
      if (!out.length || out[out.length - 1].page !== pg) out.push({ page: pg, ayahs: [] })
      out[out.length - 1].ayahs.push(i + 1)
    })
    return out
  }, [data, surah, verses])

  const cls = (a: number) => 'q-ayah' + (playing === a ? ' playing' : !playing && highlightTarget && a === target ? ' current' : '')
  const flags = (a: number) => (marked.has(a) || noted.has(a)) && (
    <span className="ayah-marks" aria-hidden="true">{marked.has(a) && <BookmarkCheck size={14} />}{noted.has(a) && <StickyNote size={14} />}</span>
  )
  const open = (a: number) => ({
    role: 'button', tabIndex: 0, 'aria-label': `الآية ${a} — اضغط لعرض الخيارات`,
    onClick: () => onOpen(a), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(a) } },
  })

  return (
    <div className="q-paper-wrap">
      <article className="q-paper" aria-label={`سورة ${s.name}`}>
        <SurahTitle name={s.name} />
        {!BASMALA_SURAH_EXCEPTIONS.has(surah) && <p className="q-text q-basmala">{data.verses[0][0]}</p>}
        {translation ? (
          verses.map((text, i) => (
            <div key={i} id={`ayah-${i + 1}`} data-ayah={i + 1} className={cls(i + 1) + ' q-row'}>
              <p className="q-text" {...open(i + 1)}>{text} <AyahNum n={i + 1} />{flags(i + 1)}</p>
              <p className="translation" dir="ltr" lang="en">{translation.verses[surah - 1][i]}</p>
            </div>
          ))
        ) : (
          pages.map((pg, k) => (
            <Fragment key={pg.page}>
              {k > 0 && <div className="q-page-sep" aria-label={`الصفحة ${pg.page}`}><span>{toArabicDigits(pg.page)}</span></div>}
              <p className="q-text q-flow">
                {pg.ayahs.map((a) => (
                  <span key={a} id={`ayah-${a}`} data-ayah={a} className={cls(a)} {...open(a)}>
                    {verses[a - 1]} <AyahNum n={a} />{flags(a)}{' '}
                  </span>
                ))}
              </p>
            </Fragment>
          ))
        )}
        {translation && <p className="source">الترجمة: {translation.name} — {translation.source}</p>}
      </article>
      <div className="q-after">
        <button className="btn" disabled={surah === 1} aria-label="السورة السابقة" onClick={() => nav(`/quran/${surah - 1}?flow=1`)}><ChevronRight size={16} /> {surah > 1 ? data.meta.surahs[surah - 2].name : ''}</button>
        <button className="btn btn-primary" onClick={onFinish}><BookOpen size={16} /> أتممت قراءة السورة</button>
        <button className="btn" disabled={surah === 114} aria-label="السورة التالية" onClick={() => nav(`/quran/${surah + 1}?flow=1`)}>{surah < 114 ? data.meta.surahs[surah].name : ''} <ChevronLeft size={16} /></button>
      </div>
    </div>
  )
}

/** وضع التركيز: آية واحدة كبيرة في منتصف الشاشة، والتنقل بالأزرار أو الأسهم أو السحب */
function FocusView({ data, surah, ayah, onAyah, translation, playing, onOpen }: { data: QuranData; surah: number; ayah: number; onAyah: (a: number) => void; translation: Translation | null; playing: number | null; onOpen: (a: number) => void }) {
  const nav = useNavigate()
  const s = data.meta.surahs[surah - 1]
  const touch = useRef<number | null>(null)
  const go = (d: 1 | -1) => {
    const a = ayah + d
    if (a >= 1 && a <= s.count) onAyah(a)
    else if (a > s.count && surah < 114) nav(`/quran/${surah + 1}?flow=1`)
    else if (a < 1 && surah > 1) nav(`/quran/${surah - 1}?ayah=${data.meta.surahs[surah - 2].count}&flow=1`)
  }
  useEffect(() => { if (playing && playing !== ayah) onAyah(playing) }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select,[role="dialog"]')) return
      if (e.key === 'ArrowLeft') go(1)
      if (e.key === 'ArrowRight') go(-1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  return (
    <div className="q-focus" onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 60) go(dx > 0 ? 1 : -1) }}>
      <div className="q-focus-card" aria-live="polite">
        {ayah === 1 && <SurahTitle name={s.name} small />}
        <Flourish />
        <p className={'q-text q-focus-text' + (playing === ayah ? ' playing' : '')} id={`ayah-${ayah}`} data-ayah={ayah} role="button" tabIndex={0}
          aria-label={`الآية ${ayah} — اضغط لعرض الخيارات`} onClick={() => onOpen(ayah)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(ayah) }}>
          {data.verses[surah - 1][ayah - 1]}
        </p>
        <div className="q-focus-num"><AyahNum n={ayah} /></div>
        {translation && <p className="translation" dir="ltr" lang="en" style={{ textAlign: 'center' }}>{translation.verses[surah - 1][ayah - 1]}</p>}
        <Flourish flip />
      </div>
      <div className="q-focus-nav">
        <button className="rd-icon" onClick={() => go(-1)} disabled={surah === 1 && ayah === 1} aria-label="الآية السابقة"><ChevronRight size={22} /></button>
        <div className="q-focus-progress">
          <div className="progress"><span style={{ width: `${(ayah / s.count) * 100}%` }} /></div>
          <small>الآية {toArabicDigits(ayah)} من {toArabicDigits(s.count)}</small>
        </div>
        <button className="rd-icon" onClick={() => go(1)} disabled={surah === 114 && ayah === s.count} aria-label="الآية التالية"><ChevronLeft size={22} /></button>
      </div>
    </div>
  )
}
