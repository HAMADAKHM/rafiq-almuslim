import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Spinner } from '../../components/Common'
import { useDocumentTitle, useQuran, usePlayer } from '../../hooks'
import { ayahMeta, BASMALA_SURAH_EXCEPTIONS, pageAyahs } from '../../services/quran'
import { kv } from '../../db/repos'
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
  const { update } = useSettings()
  const p = usePlayer()
  const sheets = useReaderSheets()
  const page = Math.min(604, Math.max(1, Number(params.page) || 1))
  const hs = Number(sp.get('s')) || 0
  const ha = Number(sp.get('a')) || 0
  const touch = useRef<number | null>(null)
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

  return (
    <ReaderChrome title={`سورة ${names}`} subtitle={`الصفحة ${page} • الجزء ${m.juz} • الحزب ${m.hizb}`} infoHref={`/quran/${first.surah}/info`}
      current={{ surah: first.surah, ayah: first.from, surahName: firstName, count: data.meta.surahs[first.surah - 1].count }}
      onModeChange={changeMode} onTafsir={(s, a) => sheets.setTafsir({ surah: s, ayah: a })}>
      <div className="q-paper-wrap"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
        onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 70) go(dx > 0 ? page + 1 : page - 1) }}>
        <article className="q-paper q-page" aria-label={`الصفحة ${page}`}>
          <header className="q-page-head small"><span>{names}</span><span>الجزء {toArabicDigits(m.juz)}</span></header>
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
          <footer className="q-page-foot"><span>{toArabicDigits(page)}</span></footer>
        </article>
        <div className="q-page-nav">
          <button className="btn btn-sm" onClick={() => go(page - 1)} disabled={page === 1} aria-label="الصفحة السابقة"><ChevronRight size={16} /> السابقة</button>
          <form onSubmit={(e) => { e.preventDefault(); go(Number((e.currentTarget.elements.namedItem('pg') as HTMLInputElement).value)) }}>
            <input name="pg" className="input" type="number" min={1} max={604} defaultValue={page} key={page} aria-label="رقم الصفحة" style={{ width: 84, minHeight: 34, textAlign: 'center' }} />
          </form>
          <button className="btn btn-sm" onClick={() => go(page + 1)} disabled={page === 604} aria-label="الصفحة التالية">التالية <ChevronLeft size={16} /></button>
        </div>
        <p className="small muted" style={{ textAlign: 'center' }}>اسحب يمينًا أو يسارًا، أو استخدم الأسهم، للتنقل بين الصفحات.</p>
      </div>
      <ReaderSheets data={data} s={sheets} />
    </ReaderChrome>
  )
}
