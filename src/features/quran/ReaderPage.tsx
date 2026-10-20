import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookmarkCheck, ChevronLeft, ChevronRight, Maximize2, Minimize2, Minus, MoreHorizontal, Play, Plus, BookOpen, StickyNote, Columns2 } from 'lucide-react'
import { Spinner } from '../../components/Common'
import { toast, useDocumentTitle, useLive, usePlayer, useQuran } from '../../hooks'
import { ayahMeta, BASMALA_SURAH_EXCEPTIONS, loadTranslation, type QuranData, type Translation } from '../../services/quran'
import { bookmarks, kv, notes, reading } from '../../db/repos'
import { toArabicDigits } from '../../lib/arabic'
import { player } from '../../services/audio'
import { useSettings } from '../../state/SettingsContext'
import { dayKey } from '../../lib/dates'
import { TafsirPanel } from '../learn/TafsirPanel'
import { AyahSheet } from './AyahSheet'
import { ReaderOptions } from './ReaderOptions'
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

function Reader({ data, surah }: { data: QuranData; surah: number }) {
  const s = data.meta.surahs[surah - 1]
  useDocumentTitle(`سورة ${s.name}`)
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { settings, update } = useSettings()
  const target = Math.min(s.count, Math.max(1, Number(sp.get('ayah')) || 1))
  const [current, setCurrent] = useState(target)
  const [focus, setFocus] = useState(false)
  const [sheetFor, setSheetFor] = useState<number | null>(null)
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [tafsirFor, setTafsirFor] = useState<number | null>(null)
  const [goto, setGoto] = useState('')
  const readFrom = useRef(target)
  const p = usePlayer()
  const translation = useTranslationText(settings.translation)
  const marks = useLive(() => bookmarks.all(), ['bookmarks'], [])
  const marked = useMemo(() => new Set(marks.filter((b) => b.surah === surah).map((b) => b.ayah)), [marks, surah])
  const noteList = useLive(() => notes.all(), ['notes'], [] as Note[])
  const noted = useMemo(() => new Set(noteList.filter((n) => n.surah === surah).map((n) => n.ayah)), [noteList, surah])
  const verses = data.verses[surah - 1]

  // من اختار «وضع المصحف» افتراضيًا يُفتح له المصحف على صفحة الآية نفسها
  const { ready } = useSettings()
  useEffect(() => {
    if (ready && settings.readerMode === 'mushaf' && !sp.has('flow')) nav(`/mushaf/${ayahMeta(data.meta, surah, target).page}?s=${surah}&a=${target}`, { replace: true })
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = document.getElementById(`ayah-${target}`)
    if (el && target > 1) el.scrollIntoView({ block: 'start' })
  }, [target])

  // حفظ آخر موضع قراءة تلقائيًا بحسب الآية الظاهرة أعلى الشاشة (لا يمس العلامات المرجعية)
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-ayah]'))
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.ayah))
      if (!vis.length) return
      const top = Math.min(...vis)
      clearTimeout(timer)
      timer = setTimeout(() => {
        setCurrent(top)
        kv.set('quran:last', { surah, ayah: top, at: Date.now() }).catch(() => {})
      }, 600)
    }, { rootMargin: '-80px 0px -60% 0px' })
    els.forEach((e) => io.observe(e))
    kv.set('quran:last', { surah, ayah: target, at: Date.now() }).catch(() => {})
    return () => { io.disconnect(); clearTimeout(timer) }
  }, [surah, target])

  const playingHere = p.status !== 'idle' && p.surah === surah && !p.playingBasmala
  useEffect(() => {
    if (playingHere) document.getElementById(`ayah-${p.ayah}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [playingHere, p.ayah])

  const markRead = async (a: number) => {
    const from = Math.min(readFrom.current, a)
    const pages = new Set<number>()
    for (let x = from; x <= a; x++) pages.add(ayahMeta(data.meta, surah, x).page)
    await reading.log({ date: dayKey(), surah, from, to: a, ayahs: a - from + 1, pages: [...pages] })
    readFrom.current = a + 1
    toast(`سُجّلت قراءة ${a - from + 1} آية`)
  }

  const meta1 = ayahMeta(data.meta, Math.min(surah, 114), Math.min(current, s.count))

  return (
    <div className={`reader reader-bg-${settings.readerBg}` + (focus ? ' focus-mode' : '')}>
      <div className="reader-bar">
        <div className="row">
          <button className="btn btn-sm" disabled={surah === 1} onClick={() => nav(`/quran/${surah - 1}`)} aria-label="السورة السابقة"><ChevronRight size={16} /> <span className="hide-sm">السابقة</span></button>
          <button className="btn btn-sm" disabled={surah === 114} onClick={() => nav(`/quran/${surah + 1}`)} aria-label="السورة التالية"><span className="hide-sm">التالية</span> <ChevronLeft size={16} /></button>
          <span className="small muted">الجزء {meta1.juz} • الحزب {meta1.hizb} • ص {meta1.page}</span>
        </div>
        <div className="row">
          <form onSubmit={(e) => { e.preventDefault(); const n = Number(goto); if (n >= 1 && n <= s.count) { nav(`/quran/${surah}?ayah=${n}`); setGoto('') } else toast(`أدخل رقمًا بين 1 و${s.count}`) }} className="row">
            <input className="input" style={{ width: 76, minHeight: 32, padding: '0.2rem 0.5rem' }} type="number" min={1} max={s.count} placeholder="آية" aria-label="رقم الآية" value={goto} onChange={(e) => setGoto(e.target.value)} />
          </form>
          <button className="btn btn-sm icon-btn" onClick={() => update({ quranFontSize: Math.max(18, settings.quranFontSize - 2) })} aria-label="تصغير الخط"><Minus size={16} /></button>
          <button className="btn btn-sm icon-btn" onClick={() => update({ quranFontSize: Math.min(56, settings.quranFontSize + 2) })} aria-label="تكبير الخط"><Plus size={16} /></button>
          <button className="btn btn-sm icon-btn" onClick={() => nav(`/mushaf/${meta1.page}`)} aria-label="وضع المصحف (صفحات)" title="وضع المصحف"><Columns2 size={16} /></button>
          <button className="btn btn-sm" onClick={() => player.play({ reciterId: settings.reciterId, surah, surahName: s.name, from: 1, to: s.count, startAt: current })}><Play size={16} /> <span className="hide-sm">استماع</span></button>
          <ReaderOptions />
          <button className="btn btn-sm icon-btn" onClick={() => { setFocus((f) => !f); if (!focus) document.documentElement.requestFullscreen?.().catch(() => {}); else if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }} aria-pressed={focus} aria-label={focus ? 'إنهاء وضع التركيز' : 'وضع القراءة دون مشتتات'}>
            {focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className="reader-paper">
        <header className="surah-header">
          <h1>سورة {s.name}</h1>
          <div className="small muted">{s.type === 'meccan' ? 'مكية' : 'مدنية'} • {s.count} آية • ترتيبها {s.n}</div>
        </header>
        {!BASMALA_SURAH_EXCEPTIONS.has(surah) && <p className="quran-text basmala-line">{data.verses[0][0]}</p>}
        <p className="small muted reader-hint">اضغط على أي آية لعرض الخيارات: الاستماع، التفسير، المشاركة، العلامات…</p>

        {verses.map((text, i) => {
          const a = i + 1
          const m = ayahMeta(data.meta, surah, a)
          const prevPage = a > 1 ? ayahMeta(data.meta, surah, a - 1).page : 0
          const isPlaying = playingHere && p.ayah === a
          return (
            <div key={a}>
              {m.page !== prevPage && a > 1 && <div className="page-mark">الصفحة {m.page}{m.juz !== ayahMeta(data.meta, surah, a - 1).juz ? ` • بداية الجزء ${m.juz}` : ''}</div>}
              <div id={`ayah-${a}`} data-ayah={a} className={'ayah-row' + (isPlaying ? ' playing' : a === target && sp.get('ayah') ? ' current' : '')}>
                <div className="ayah-main">
                  <p className="quran-text ayah-tap" style={{ margin: 0 }} role="button" tabIndex={0} aria-label={`الآية ${a} — اضغط لعرض الخيارات`}
                    onClick={() => setSheetFor(a)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheetFor(a) } }}>
                    {text} <span className="ayah-num">{toArabicDigits(a)}</span>
                    {m.sajda && <span className="badge badge-hadith" style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem' }}>سجدة</span>}
                  </p>
                  <span className="ayah-flags">
                    {marked.has(a) && <BookmarkCheck size={16} color="var(--gold)" aria-label="عليها علامة" />}
                    {noted.has(a) && <StickyNote size={16} color="var(--gold)" aria-label="عليها ملاحظة" />}
                    <button className="btn btn-ghost btn-sm icon-btn ayah-more" onClick={() => setSheetFor(a)} aria-label={`خيارات الآية ${a}`}><MoreHorizontal size={16} /></button>
                  </span>
                </div>
                {translation && <p className="translation" dir="ltr" lang="en">{translation.verses[surah - 1][a - 1]}</p>}
                {noteFor === a && <NoteEditor surah={surah} ayah={a} onClose={() => setNoteFor(null)} />}
                {tafsirFor === a && <div><TafsirPanel surah={surah} ayah={a} /><button className="btn btn-ghost btn-sm" onClick={() => setTafsirFor(null)}>إغلاق التفسير</button></div>}
              </div>
            </div>
          )
        })}
        {translation && <p className="source">الترجمة: {translation.name} — المصدر: {translation.source}</p>}
      </div>

      <div className="spread" style={{ margin: '1.5rem 0' }}>
        {surah > 1 ? <Link className="btn" to={`/quran/${surah - 1}`}><ChevronRight size={16} /> سورة {data.meta.surahs[surah - 2].name}</Link> : <span />}
        <button className="btn btn-primary" onClick={() => markRead(s.count)}><BookOpen size={16} /> أتممت قراءة السورة</button>
        {surah < 114 ? <Link className="btn" to={`/quran/${surah + 1}`}>سورة {data.meta.surahs[surah].name} <ChevronLeft size={16} /></Link> : <span />}
      </div>

      <AyahSheet data={data} surah={surah} ayah={sheetFor} onClose={() => setSheetFor(null)} onTafsir={setTafsirFor} onNote={setNoteFor} onMarkRead={markRead} />
    </div>
  )
}

export function NoteEditor({ surah, ayah, onClose }: { surah: number; ayah: number; onClose: () => void }) {
  const existing = useLive(() => notes.forAyah(surah, ayah), ['notes'], [] as Note[], [surah, ayah])
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  return (
    <div className="card" style={{ marginTop: 8 }}>
      {existing.map((n) => (
        <div key={n.id} className="spread small" style={{ borderBottom: '1px solid var(--border)', padding: '0.4rem 0' }}>
          <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{n.text}</span>
          <span className="row">
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(n); setText(n.text) }}>تعديل</button>
            <button className="btn btn-ghost btn-sm" onClick={() => n.id && notes.remove(n.id)}>حذف</button>
          </span>
        </div>
      ))}
      <label className="field" style={{ marginTop: 8 }}>
        <span>{editing ? 'تعديل الملاحظة' : 'ملاحظة جديدة (تُحفظ على جهازك فقط)'}</span>
        <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={async () => {
          await notes.save({ id: editing?.id, surah, ayah, text: text.trim(), createdAt: editing?.createdAt })
          setText(''); setEditing(null); toast('حُفظت الملاحظة')
        }}>حفظ</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>إغلاق</button>
      </div>
    </div>
  )
}

