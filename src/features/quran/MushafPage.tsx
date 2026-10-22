import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BookOpen, Bookmark, Search } from 'lucide-react'
import { Spinner } from '../../components/Common'
import { useDocumentTitle, useQuran, usePlayer, useKeepAwake } from '../../hooks'
import { ayahMeta, BASMALA_SURAH_EXCEPTIONS, pageAyahs } from '../../services/quran'
import { bookmarks, kv } from '../../db/repos'
import { toast, useLive } from '../../hooks'
import { toArabicDigits } from '../../lib/arabic'
import { useSettings } from '../../state/SettingsContext'
import type { ReaderMode } from '../../state/settings'
import { ReaderChrome } from './reader/ReaderChrome'
import { AyahNum, SurahTitle } from './reader/Ornaments'
import { ReaderSheets, useReaderSheets } from './reader/ReaderSheets'

/**
 * وضع صفحات المصحف: صفحة كاملة من مصحف المدينة (604 صفحات) بترتيبها، مع الانتقال بين الصفحات.
 * ملاحظة: حدود الصفحات وترتيب الآيات مطابقة، أما توزيع الأسطر داخل الصفحة فيتبع عرض الشاشة
 * (لا تتوفر لدينا بيانات أسطر المصحف المطبوع وخطوطه مرخّصةً).
 */
export function MushafPage() {
  const { data, error } = useQuran()
  const params = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { settings, update } = useSettings()
  useKeepAwake(settings.keepAwake)
  const p = usePlayer()
  const sheets = useReaderSheets()
  const page = Math.min(604, Math.max(1, Number(params.page) || 1))
  const hs = Number(sp.get('s')) || 0
  const ha = Number(sp.get('a')) || 0
  const touch = useRef<number | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const marks = useLive(() => bookmarks.all(), ['bookmarks'], [])
  useDocumentTitle(`المصحف — الصفحة ${page}`)

  const go = (n: number) => { if (n >= 1 && n <= 604) nav(`/mushaf/${n}`) }

  useEffect(() => {
    // في المصحف العربي الصفحة التالية إلى اليسار
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select,[role="dialog"]')) return
      if (e.key === 'ArrowLeft') go(page + 1)
      if (e.key === 'ArrowRight') go(page - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!data) return
    const first = pageAyahs(data.meta, page)[0]
    if (first) kv.set('quran:last', { surah: first.surah, ayah: first.from, at: Date.now(), page }).catch(() => {})
    window.scrollTo?.(0, 0)
  }, [data, page])

  // متابعة التلاوة عبر الصفحات
  useEffect(() => {
    if (!data || p.status === 'idle' || p.playingBasmala) return
    const pg = ayahMeta(data.meta, p.surah, p.ayah).page
    if (pg !== page) nav(`/mushaf/${pg}`)
  }, [p.ayah, p.surah]) // eslint-disable-line react-hooks/exhaustive-deps

  // الصفحة الكاملة: يُختار أكبر خط تتسع به الصفحة كلها داخل الإطار دون تمرير
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || !data) return
    const fit = () => {
      let lo = 12, hi = 46
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2
        el.style.setProperty('--mp-size', `${mid}px`)
        if (el.scrollHeight <= el.clientHeight + 1) lo = mid
        else hi = mid
      }
      el.style.setProperty('--mp-size', `${lo}px`)
    }
    fit()
    const ro = new ResizeObserver(() => fit())
    ro.observe(el)
    document.fonts?.addEventListener('loadingdone', fit)
    return () => { ro.disconnect(); document.fonts?.removeEventListener('loadingdone', fit) }
  }, [data, page, settings.quranFont])

  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return <Spinner />
  const groups = pageAyahs(data.meta, page)
  const first = groups[0]
  const m = ayahMeta(data.meta, first.surah, first.from)
  const firstName = data.meta.surahs[first.surah - 1].name
  const names = [...new Set(groups.map((g) => data.meta.surahs[g.surah - 1].name))].join(' • ')
  const playing = (s: number, a: number) => p.status !== 'idle' && !p.playingBasmala && p.surah === s && p.ayah === a

  const changeMode = (mode: ReaderMode) => {
    update({ readerMode: mode })
    if (mode !== 'mushaf') nav(`/quran/${first.surah}?ayah=${first.from}&flow=1`)
  }

  const marked = marks.some((b) => b.surah === first.surah && b.ayah === first.from)
  const toggleMark = async () => {
    const on = await bookmarks.toggle(first.surah, first.from)
    toast(on ? `أُضيفت علامة على الصفحة ${page}` : 'أُزيلت العلامة')
  }

  const bar = (
    <div className="mp-dock">
      {toolsOpen && (
        <div className="q-page-nav mp-nav">
          <button className="btn btn-sm" onClick={() => go(page - 1)} disabled={page === 1} aria-label="الصفحة السابقة"><ChevronRight size={16} /> السابقة</button>
          <form onSubmit={(e) => { e.preventDefault(); go(Number((e.currentTarget.elements.namedItem('pg') as HTMLInputElement).value)) }}>
            <input name="pg" className="input" type="number" min={1} max={604} defaultValue={page} key={page} aria-label="رقم الصفحة" style={{ width: 84, minHeight: 34, textAlign: 'center' }} />
          </form>
          <button className="btn btn-sm" onClick={() => go(page + 1)} disabled={page === 604} aria-label="الصفحة التالية">التالية <ChevronLeft size={16} /></button>
        </div>
      )}
      <nav className="mp-bar" aria-label="شريط المصحف">
        <Link to="/quran" className="mp-back" aria-label="العودة إلى فهرس السور"><ChevronRight size={24} /></Link>
        <button className="mp-surah" onClick={() => setToolsOpen((o) => !o)} aria-expanded={toolsOpen} aria-label="أدوات القراءة">
          <BookOpen size={24} aria-hidden="true" /><span className="mp-surah-name">{firstName}</span>
        </button>
        <span className="mp-juz">الجزء {toArabicDigits(m.juz)}</span>
        <button className={'mp-round mp-mark' + (marked ? ' on' : '')} onClick={toggleMark} aria-pressed={marked} aria-label="علامة على الصفحة"><Bookmark size={20} fill={marked ? 'currentColor' : 'none'} /></button>
        <Link to="/search" className="mp-round mp-search" aria-label="البحث"><Search size={20} /></Link>
      </nav>
    </div>
  )

  return (
    <ReaderChrome title={`سورة ${names}`} subtitle={`الصفحة ${page} • الجزء ${m.juz} • الحزب ${m.hizb}`} infoHref={`/quran/${first.surah}/info`}
      current={{ surah: first.surah, ayah: first.from, surahName: firstName, count: data.meta.surahs[first.surah - 1].count }}
      onModeChange={changeMode} onTafsir={(s, a) => sheets.setTafsir({ surah: s, ayah: a })}
      immersive={{ bar, toolsOpen }}>
      <div className="mp-stage"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
        onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 70) go(dx > 0 ? page + 1 : page - 1) }}>
        <article className="mp-page" aria-label={`الصفحة ${page}`}>
          <div className="mp-content" ref={contentRef}>
            {groups.map((g) => {
              const s = data.meta.surahs[g.surah - 1]
              return (
                <section key={g.surah}>
                  {g.from === 1 && (
                    <>
                      <SurahTitle name={s.name} small />
                      {!BASMALA_SURAH_EXCEPTIONS.has(g.surah) && <p className="q-text q-basmala">{data.verses[0][0]}</p>}
                    </>
                  )}
                  <p className="q-text q-flow">
                    {Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i).map((a) => (
                      <span key={a} data-ayah={a} className={'q-ayah' + (playing(g.surah, a) ? ' playing' : hs === g.surah && ha === a ? ' current' : '')}
                        role="button" tabIndex={0} aria-label={`سورة ${s.name} الآية ${a}`}
                        onClick={() => sheets.setActions({ surah: g.surah, ayah: a })}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sheets.setActions({ surah: g.surah, ayah: a }) } }}>
                        {data.verses[g.surah - 1][a - 1]} <AyahNum n={a} />{' '}
                      </span>
                    ))}
                  </p>
                </section>
              )
            })}
          </div>
          <footer className="mp-num"><span>{toArabicDigits(page)}</span></footer>
        </article>
      </div>
      <ReaderSheets data={data} s={sheets} />
    </ReaderChrome>
  )
}
