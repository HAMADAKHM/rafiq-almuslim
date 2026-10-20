import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlignJustify, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { Spinner } from '../../components/Common'
import { useDocumentTitle, useQuran, usePlayer } from '../../hooks'
import { ayahMeta, BASMALA_SURAH_EXCEPTIONS, pageAyahs } from '../../services/quran'
import { kv } from '../../db/repos'
import { toArabicDigits } from '../../lib/arabic'
import { useSettings } from '../../state/SettingsContext'
import { AyahSheet } from './AyahSheet'
import { ReaderOptions } from './ReaderOptions'
import { NoteEditor } from './ReaderPage'
import { TafsirPanel } from '../learn/TafsirPanel'

/**
 * وضع المصحف: صفحة كاملة من مصحف المدينة (604 صفحات) بترتيبها، مع الانتقال بين الصفحات.
 * ملاحظة: يحافظ على حدود الصفحات وترتيب الآيات، لكن توزيع الأسطر داخل الصفحة يتبع عرض الشاشة
 * وليس مطابقًا لسطور المصحف المطبوع (لا تتوفر لدينا بيانات أسطر مرخّصة).
 */
export function MushafPage() {
  const { data, error } = useQuran()
  const params = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { settings, update } = useSettings()
  const p = usePlayer()
  const page = Math.min(604, Math.max(1, Number(params.page) || 1))
  const hs = Number(sp.get('s')) || 0
  const ha = Number(sp.get('a')) || 0
  const [sheet, setSheet] = useState<{ surah: number; ayah: number } | null>(null)
  const [noteFor, setNoteFor] = useState<{ surah: number; ayah: number } | null>(null)
  const [tafsirFor, setTafsirFor] = useState<{ surah: number; ayah: number } | null>(null)
  const [focus, setFocus] = useState(false)
  const touch = useRef<number | null>(null)
  useDocumentTitle(`المصحف — الصفحة ${page}`)

  const go = (n: number) => { if (n >= 1 && n <= 604) nav(`/mushaf/${n}`) }

  useEffect(() => {
    // الأسهم: في المصحف العربي الصفحة التالية إلى اليسار
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

  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return <Spinner />
  const groups = pageAyahs(data.meta, page)
  const m = ayahMeta(data.meta, groups[0].surah, groups[0].from)
  const names = [...new Set(groups.map((g) => data.meta.surahs[g.surah - 1].name))].join(' • ')
  const playing = (s: number, a: number) => p.status !== 'idle' && !p.playingBasmala && p.surah === s && p.ayah === a

  return (
    <div className={`reader mushaf reader-bg-${settings.readerBg}` + (focus ? ' focus-mode' : '')}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 70) go(dx > 0 ? page + 1 : page - 1) }}>
      <div className="reader-bar">
        <div className="row">
          <button className="btn btn-sm" onClick={() => go(page - 1)} disabled={page === 1} aria-label="الصفحة السابقة"><ChevronRight size={16} /></button>
          <form onSubmit={(e) => { e.preventDefault(); go(Number((e.currentTarget.elements.namedItem('pg') as HTMLInputElement).value)) }}>
            <input name="pg" className="input" type="number" min={1} max={604} defaultValue={page} key={page} aria-label="رقم الصفحة" style={{ width: 80, minHeight: 32, padding: '0.2rem 0.5rem' }} />
          </form>
          <button className="btn btn-sm" onClick={() => go(page + 1)} disabled={page === 604} aria-label="الصفحة التالية"><ChevronLeft size={16} /></button>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => { update({ readerMode: 'flow' }); nav(`/quran/${groups[0].surah}?ayah=${groups[0].from}&flow=1`) }}><AlignJustify size={16} /> <span className="hide-sm">قراءة متتابعة</span></button>
          <ReaderOptions />
          <button className="btn btn-sm icon-btn" onClick={() => setFocus((f) => !f)} aria-pressed={focus} aria-label="وضع التركيز">{focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
        </div>
      </div>

      <article className="reader-paper mushaf-page" aria-label={`الصفحة ${page}`}>
        <header className="mushaf-head small">
          <span>{names}</span>
          <span>الجزء {m.juz} • الحزب {m.hizb}</span>
        </header>
        {groups.map((g) => {
          const s = data.meta.surahs[g.surah - 1]
          return (
            <section key={g.surah}>
              {g.from === 1 && (
                <>
                  <div className="surah-header compact"><h2>سورة {s.name}</h2></div>
                  {!BASMALA_SURAH_EXCEPTIONS.has(g.surah) && <p className="quran-text basmala-line">{data.verses[0][0]}</p>}
                </>
              )}
              <p className="quran-text mushaf-text">
                {Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i).map((a) => (
                  <span key={a} data-ayah={a} className={'mushaf-ayah' + (playing(g.surah, a) ? ' playing' : hs === g.surah && ha === a ? ' current' : '')}
                    role="button" tabIndex={0} aria-label={`سورة ${s.name} الآية ${a}`}
                    onClick={() => setSheet({ surah: g.surah, ayah: a })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheet({ surah: g.surah, ayah: a }) } }}>
                    {data.verses[g.surah - 1][a - 1]} <span className="ayah-num">{toArabicDigits(a)}</span>{' '}
                  </span>
                ))}
              </p>
            </section>
          )
        })}
        <footer className="mushaf-foot">{toArabicDigits(page)}</footer>
      </article>
      {noteFor && <NoteEditor surah={noteFor.surah} ayah={noteFor.ayah} onClose={() => setNoteFor(null)} />}
      {tafsirFor && <div className="card" style={{ marginTop: 8 }}><strong>تفسير {data.meta.surahs[tafsirFor.surah - 1].name} {tafsirFor.ayah}</strong><TafsirPanel surah={tafsirFor.surah} ayah={tafsirFor.ayah} /><button className="btn btn-ghost btn-sm" onClick={() => setTafsirFor(null)}>إغلاق</button></div>}
      <p className="small muted" style={{ textAlign: 'center' }}>اسحب يمينًا أو يسارًا، أو استخدم الأسهم، للتنقل بين الصفحات.</p>
      {sheet && (
        <AyahSheet data={data} surah={sheet.surah} ayah={sheet.ayah} onClose={() => setSheet(null)}
          onTafsir={(a) => setTafsirFor({ surah: sheet.surah, ayah: a })} onNote={(a) => setNoteFor({ surah: sheet.surah, ayah: a })} />
      )}
    </div>
  )
}
