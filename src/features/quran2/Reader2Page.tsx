// القارئ الجديد (تجريبي — لا يستبدل القارئ الحالي حتى يوافق صاحب التطبيق):
// سبعة أوضاع قراءة لكل منها تنسيقه، وطريقتا عرض (صفحات المصحف / آيات متتابعة) دون فقدان الموضع،
// وشريط علوي وسفلي للتلاوة، وإعدادات بمعاينة مباشرة. النص من مصدر التطبيق كما هو؛ لا يُعاد كتابته.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Pause, Play, Search, SkipBack, SkipForward, SlidersHorizontal, Minus, Plus } from 'lucide-react'
import { Spinner } from '../../components/Common'
import { Sheet } from '../../components/Sheet'
import { toast, useDocumentTitle, useLive, usePlayer, useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { QURAN_FONTS } from '../../state/settings'
import { ayahMeta, BASMALA_SURAH_EXCEPTIONS, loadTranslation, pageAyahs, type QuranData, type Translation } from '../../services/quran'
import { player } from '../../services/audio'
import { RECITERS } from '../../content/reciters'
import { bookmarks, kv } from '../../db/repos'
import type { Bookmark as BookmarkT } from '../../db/db'
import { toArabicDigits } from '../../lib/arabic'
import { TafsirPanel } from '../learn/TafsirPanel'
import { ReaderSheets, useReaderSheets } from '../quran/reader/ReaderSheets'
import { useActualReading } from '../quran/useActualReading'
import { DEFAULT_PREFS, INKS, MODES, PAPERS, hideHarakat, loadPrefs, resolveLook, savePrefs, type Reader2Prefs } from './modes'
import '../../styles/reader2.css'

const RATES = [0.75, 1, 1.25, 1.5]

function Marker({ n, active }: { n: number; active?: boolean }) {
  return <span className={'r2-marker' + (active ? ' on' : '')} aria-label={`الآية ${n}`}>{toArabicDigits(n)}</span>
}

/** البسملة من المصحف نفسه (الآية الأولى من الفاتحة) — لا تُكتب يدويًا */
const basmala = (data: QuranData) => data.verses[0][0]

function SurahBanner({ data, surah }: { data: QuranData; surah: number }) {
  return (
    <div className="r2-banner"><span>سُورَةُ {data.meta.surahs[surah - 1].name}</span></div>
  )
}

export function Reader2Page() {
  const { data } = useQuran()
  const { settings } = useSettings()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [prefs, setPrefs] = useState<Reader2Prefs | null>(null)
  const [cur, setCur] = useState(() => ({ surah: Math.min(114, Math.max(1, Number(sp.get('s')) || 1)), ayah: Math.max(1, Number(sp.get('a')) || 1) }))
  const [settingsOpen, setSettingsOpen] = useState(false)
  /** التظليل لا يظهر إلا بعد أن يلمس القارئ آية */
  const [picked, setPicked] = useState(false)
  const [tafsirOpen, setTafsirOpen] = useState<number | null>(null)
  const [translation, setTranslation] = useState<Translation | null>(null)
  const sheets = useReaderSheets()
  const p = usePlayer()
  const marks = useLive(() => bookmarks.all(), ['bookmarks'], [] as BookmarkT[])
  useEffect(() => { loadPrefs().then(setPrefs).catch(() => setPrefs(DEFAULT_PREFS)) }, [])
  // بدون معطيات في الرابط: من آخر موضع قراءة
  useEffect(() => {
    if (sp.get('s')) return
    kv.get<{ surah: number; ayah: number } | null>('quran:last', null).then((l) => { if (l) setCur({ surah: l.surah, ayah: l.ayah }) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const look = prefs ? resolveLook(prefs) : null
  useEffect(() => { if (look?.translation && !translation) loadTranslation('en-sahih').then(setTranslation).catch(() => toast('تعذر تحميل الترجمة')) }, [look?.translation, translation])
  const update = useCallback((patch: Partial<Reader2Prefs>) => setPrefs((x) => { const n = { ...(x ?? DEFAULT_PREFS), ...patch }; savePrefs(n).catch(() => {}); return n }), [])
  const meta = data ? ayahMeta(data.meta, cur.surah, Math.min(cur.ayah, data.meta.surahs[cur.surah - 1].count)) : null
  const page = meta?.page ?? 1
  useDocumentTitle(data ? `سورة ${data.meta.surahs[cur.surah - 1].name}` : 'القرآن الكريم')
  // حفظ آخر موضع (المفتاح نفسه الذي يستعمله القارئ الحالي و«أكمل قراءتك»)
  useEffect(() => { if (data) kv.set('quran:last', { surah: cur.surah, ayah: cur.ayah, at: Date.now(), page }).catch(() => {}) }, [data, cur.surah, cur.ayah, page])
  useActualReading(data, cur.surah, cur.ayah)
  // التلاوة تتبعها القراءة
  const playingHere = (p.status === 'playing' || p.status === 'loading') && p.surah === cur.surah
  useEffect(() => { if ((p.status === 'playing' || p.status === 'loading') && (p.surah !== cur.surah || p.ayah !== cur.ayah)) setCur({ surah: p.surah, ayah: p.ayah }) }, [p.status, p.surah, p.ayah]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !prefs || !look) return <Spinner />
  const m = look.mode
  const surahInfo = data.meta.surahs[cur.surah - 1]
  const fontFamily = QURAN_FONTS.find((f) => f.id === prefs.font)?.family ?? QURAN_FONTS[0].family
  const txt = (s: number, a: number) => { const t = data.verses[s - 1][a - 1]; return prefs.tashkeel ? t : hideHarakat(t) }
  const marked = marks.some((b) => b.surah === cur.surah && b.ayah === cur.ayah)
  const style = { '--r2-page': m.page, '--r2-paper': look.paper, '--r2-ink': look.ink, '--r2-muted': m.muted, '--r2-marker': m.marker, '--r2-accent': m.accent, '--r2-chrome': m.chrome, '--r2-chrome-ink': m.chromeInk, '--r2-size': `${look.size}px`, '--r2-lh': look.lineHeight, '--r2-gap': `${look.ayahGap}px`, '--r2-font': fontFamily } as CSSProperties
  const view = m.layout === 'single' ? 'single' : prefs.view

  const goPage = (n: number) => {
    const target = Math.max(1, Math.min(604, n))
    const first = pageAyahs(data.meta, target)[0]
    if (first) setCur({ surah: first.surah, ayah: first.from })
  }
  const step = (d: 1 | -1) => {
    if (playingHere) { if (d === 1) player.next(); else player.prev(); return }
    const count = surahInfo.count
    if (d === 1) setCur(cur.ayah < count ? { surah: cur.surah, ayah: cur.ayah + 1 } : cur.surah < 114 ? { surah: cur.surah + 1, ayah: 1 } : cur)
    else setCur(cur.ayah > 1 ? { surah: cur.surah, ayah: cur.ayah - 1 } : cur.surah > 1 ? { surah: cur.surah - 1, ayah: data.meta.surahs[cur.surah - 2].count } : cur)
  }
  const togglePlay = () => {
    if (playingHere) { player.toggle(); return }
    if (p.status === 'paused' && p.surah === cur.surah) { player.toggle(); return }
    player.play({ reciterId: prefs.reciterId ?? settings.reciterId, surah: cur.surah, surahName: surahInfo.name, from: cur.ayah, to: surahInfo.count })
  }
  const isPlaying = p.status === 'playing' && p.surah === cur.surah
  const playingAyah = (p.status === 'playing' || p.status === 'loading' || p.status === 'paused') && p.surah === cur.surah ? p.ayah : null
  const progress = p.surah === cur.surah && p.to > p.from ? (p.ayah - p.from) / (p.to - p.from + 1) : cur.ayah / surahInfo.count

  const ayahProps = (s: number, a: number) => ({
    className: 'r2-ayah' + (picked && s === cur.surah && a === cur.ayah ? ' sel' : '') + (s === cur.surah && a === playingAyah ? ' playing' : ''),
    onClick: () => { setPicked(true); setCur({ surah: s, ayah: a }); sheets.setActions({ surah: s, ayah: a }) },
    'data-ayah': `${s}:${a}`,
  })

  return (
    <div className={`r2 r2-${m.id}` + (m.simple ? ' r2-simple' : '')} style={style}>
      <header className="r2-top">
        <button className="r2-icon" aria-label="رجوع" onClick={() => nav(-1)}><ChevronRight size={22} /></button>
        <div className="r2-title">
          <strong>سورة {surahInfo.name}</strong>
          {!m.simple && <small>الجزء {toArabicDigits(meta!.juz)} · الحزب {toArabicDigits(meta!.hizb)} · صفحة {toArabicDigits(page)}</small>}
        </div>
        {m.simple ? (
          <>
            <button className="r2-big-btn" aria-label="تصغير الخط" onClick={() => update({ size: look.size - 4 })}>أ−</button>
            <button className="r2-big-btn solid" aria-label="تكبير الخط" onClick={() => update({ size: Math.min(m.maxSize, look.size + 4) })}>أ+</button>
          </>
        ) : (
          <>
            <Link className="r2-icon" to="/search" aria-label="البحث"><Search size={20} /></Link>
            <button className="r2-icon" aria-label={marked ? 'إزالة العلامة المرجعية' : 'إضافة علامة مرجعية'} aria-pressed={marked} onClick={async () => toast((await bookmarks.toggle(cur.surah, cur.ayah)) ? 'أُضيفت العلامة' : 'أُزيلت العلامة')}>{marked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}</button>
          </>
        )}
        <button className="r2-icon" aria-label="إعدادات القراءة" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={20} /></button>
      </header>

      {prefs.mode === 'tajweed' && prefs.tajweed && (
        <p className="r2-notice" role="note">ألوان التجويد تحتاج بيانات تجويد موثقة لكل المصحف، وستُضاف بعد اعتمادها. يُعرض النص الآن دون تلوين.</p>
      )}

      <main className="r2-body">
        {view === 'single' ? (
          <SingleAyah data={data} cur={cur} txt={txt} onPick={(a) => setCur({ surah: cur.surah, ayah: a })} ayahProps={ayahProps} />
        ) : view === 'pages' ? (
          <PageView data={data} page={page} layout={m.layout} frame={m.frame} txt={txt} ayahProps={ayahProps} translation={look.translation ? translation : null} onSwipe={(d) => goPage(page + d)} />
        ) : (
          <VersesView data={data} surah={cur.surah} target={cur.ayah} txt={txt} ayahProps={ayahProps} translation={look.translation ? translation : null} tafsirOpen={tafsirOpen} setTafsirOpen={setTafsirOpen} flow={m.layout === 'flow'} />
        )}
      </main>

      {m.simple ? (
        <footer className="r2-bottom simple">
          <button onClick={() => step(-1)}><ChevronRight size={30} /><span>السابقة</span></button>
          <button className="solid" onClick={togglePlay}>{isPlaying ? <Pause size={30} /> : <Play size={30} />}<span>{isPlaying ? 'إيقاف' : 'استمع'}</span></button>
          <button onClick={() => step(1)}><ChevronLeft size={30} /><span>التالية</span></button>
        </footer>
      ) : (
        <footer className="r2-bottom">
          <div className="r2-progress" role="progressbar" aria-label="تقدم التلاوة" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <div className="r2-controls">
            <button className="r2-icon" aria-label="الصفحة السابقة" onClick={() => goPage(page - 1)}><ChevronRight size={20} /></button>
            <button className="r2-icon" aria-label="الآية السابقة" onClick={() => step(-1)}><SkipForward size={20} /></button>
            <button className="r2-play" aria-label={isPlaying ? 'إيقاف التلاوة مؤقتًا' : 'تشغيل التلاوة'} onClick={togglePlay}>{isPlaying ? <Pause size={22} /> : <Play size={22} />}</button>
            <button className="r2-icon" aria-label="الآية التالية" onClick={() => step(1)}><SkipBack size={20} /></button>
            <button className="r2-icon" aria-label="الصفحة التالية" onClick={() => goPage(page + 1)}><ChevronLeft size={20} /></button>
          </div>
          <div className="r2-sub">
            <label className="r2-chip">
              <span className="sr-only">القارئ</span>
              <select aria-label="القارئ" value={prefs.reciterId ?? settings.reciterId} onChange={(e) => { update({ reciterId: e.target.value }); if (playingHere) player.stop() }}>
                {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <button className="r2-chip" aria-label="سرعة التلاوة" onClick={() => player.setRate(RATES[(RATES.indexOf(p.rate) + 1) % RATES.length] ?? 1)}>السرعة {p.rate}×</button>
          </div>
        </footer>
      )}

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="إعدادات القراءة">
        <SettingsPanel prefs={prefs} update={update} look={look} />
      </Sheet>
      <ReaderSheets data={data} s={sheets} />
    </div>
  )
}

type AyahPropsFn = (s: number, a: number) => { className: string; onClick: () => void; 'data-ayah': string }

/** صفحة المصحف: آيات الصفحة بترتيبها مع رأس كل سورة تبدأ فيها والبسملة، والسحب يقلب الصفحة */
function PageView({ data, page, layout, frame, txt, ayahProps, translation, onSwipe }: { data: QuranData; page: number; layout: 'flow' | 'blocks' | 'single'; frame: boolean; txt: (s: number, a: number) => string; ayahProps: AyahPropsFn; translation: Translation | null; onSwipe: (d: 1 | -1) => void }) {
  const segs = pageAyahs(data.meta, page)
  const start = useRef<number | null>(null)
  const juz = segs[0] ? ayahMeta(data.meta, segs[0].surah, segs[0].from).juz : 1
  return (
    <div className={'r2-page' + (frame ? ' framed' : '')}
      onTouchStart={(e) => { start.current = e.touches[0].clientX }}
      onTouchEnd={(e) => { if (start.current == null) return; const dx = e.changedTouches[0].clientX - start.current; start.current = null; if (Math.abs(dx) > 60) onSwipe(dx > 0 ? 1 : -1) }}>
      {segs.map((sg) => (
        <section key={sg.surah} className="r2-seg">
          {sg.from === 1 && <SurahBanner data={data} surah={sg.surah} />}
          {sg.from === 1 && !BASMALA_SURAH_EXCEPTIONS.has(sg.surah) && <p className="r2-basmala">{basmala(data)}</p>}
          {layout === 'flow' ? (
            <p className="r2-flow">
              {Array.from({ length: sg.to - sg.from + 1 }, (_, i) => sg.from + i).map((a) => (
                <span key={a}><span {...ayahProps(sg.surah, a)}>{txt(sg.surah, a)}</span> <Marker n={a} /> </span>
              ))}
            </p>
          ) : (
            Array.from({ length: sg.to - sg.from + 1 }, (_, i) => sg.from + i).map((a) => (
              <div key={a} className="r2-block">
                <span className="r2-num">{toArabicDigits(a)}</span>
                <p {...ayahProps(sg.surah, a)}>{txt(sg.surah, a)}</p>
                {translation && <p className="r2-tr" dir="ltr" lang="en">{translation.verses[sg.surah - 1]?.[a - 1]}</p>}
              </div>
            ))
          )}
        </section>
      ))}
      <div className="r2-page-foot"><span>الجزء {toArabicDigits(juz)}</span><span>{toArabicDigits(page)}</span></div>
    </div>
  )
}

/** الآيات متتابعة للسورة كاملة، مع التفسير والترجمة تحت الآية عند الطلب */
function VersesView({ data, surah, target, txt, ayahProps, translation, tafsirOpen, setTafsirOpen, flow }: { data: QuranData; surah: number; target: number; txt: (s: number, a: number) => string; ayahProps: AyahPropsFn; translation: Translation | null; tafsirOpen: number | null; setTafsirOpen: (a: number | null) => void; flow: boolean }) {
  const count = data.meta.surahs[surah - 1].count
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.querySelector(`[data-ayah="${surah}:${target}"]`)?.scrollIntoView({ block: 'center' }) }, [surah]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={box} className={'r2-verses' + (flow ? ' flowish' : '')}>
      <SurahBanner data={data} surah={surah} />
      {!BASMALA_SURAH_EXCEPTIONS.has(surah) && <p className="r2-basmala">{basmala(data)}</p>}
      {Array.from({ length: count }, (_, i) => i + 1).map((a) => (
        <article key={a} className="r2-block">
          <p {...ayahProps(surah, a)}>{txt(surah, a)} <Marker n={a} /></p>
          {translation && <p className="r2-tr" dir="ltr" lang="en">{translation.verses[surah - 1]?.[a - 1]}</p>}
          <div className="r2-ayah-tools">
            <button onClick={() => setTafsirOpen(tafsirOpen === a ? null : a)} aria-expanded={tafsirOpen === a}>{tafsirOpen === a ? 'إخفاء التفسير' : 'التفسير'}</button>
          </div>
          {tafsirOpen === a && <div className="r2-tafsir"><TafsirPanel surah={surah} ayah={a} /></div>}
        </article>
      ))}
    </div>
  )
}

/** وضع الأطفال: آية واحدة في بطاقة بخط كبير، وشريط تقدم في السورة */
function SingleAyah({ data, cur, txt, onPick, ayahProps }: { data: QuranData; cur: { surah: number; ayah: number }; txt: (s: number, a: number) => string; onPick: (a: number) => void; ayahProps: AyahPropsFn }) {
  const count = data.meta.surahs[cur.surah - 1].count
  const dots = Math.min(count, 30)
  return (
    <div className="r2-single">
      <div className="r2-dots" aria-label={`الآية ${cur.ayah} من ${count}`}>
        {Array.from({ length: dots }, (_, i) => <button key={i} aria-label={`الآية ${i + 1}`} className={i < Math.min(cur.ayah, dots) ? 'done' : ''} onClick={() => onPick(i + 1)} />)}
      </div>
      <div className="r2-card">
        <span className="r2-card-num">{toArabicDigits(cur.ayah)}</span>
        {cur.ayah === 1 && !BASMALA_SURAH_EXCEPTIONS.has(cur.surah) && <p className="r2-basmala">{basmala(data)}</p>}
        <p {...ayahProps(cur.surah, cur.ayah)}>{txt(cur.surah, cur.ayah)}</p>
      </div>
    </div>
  )
}

/** الإعدادات: كل تغيير يظهر مباشرة في القراءة خلف الورقة */
function SettingsPanel({ prefs, update, look }: { prefs: Reader2Prefs; update: (p: Partial<Reader2Prefs>) => void; look: ReturnType<typeof resolveLook> }) {
  const m = look.mode
  const choose = <T,>(label: string, items: { id: T; label: string; swatch?: string; ink?: string }[], value: T, set: (v: T) => void) => (
    <div className="r2-set-row">
      <span className="r2-set-label">{label}</span>
      <div className="r2-choices" role="radiogroup" aria-label={label}>
        {items.map((it) => (
          <button key={String(it.id)} role="radio" aria-checked={it.id === value} className={'r2-choice' + (it.id === value ? ' on' : '') + (it.swatch ? ' sw' : '')} style={it.swatch ? { background: it.swatch, color: it.ink } : undefined} onClick={() => set(it.id)}>{it.swatch ? <span aria-hidden="true">ب</span> : it.label}{it.swatch && <span className="sr-only">{it.label}</span>}</button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="r2-settings">
      <div className="r2-set-row">
        <span className="r2-set-label">وضع القراءة</span>
        <div className="r2-modes">
          {MODES.map((x) => (
            <button key={x.id} className={'r2-mode' + (x.id === prefs.mode ? ' on' : '')} style={{ background: x.paper, color: x.ink }} aria-pressed={x.id === prefs.mode}
              onClick={() => update({ mode: x.id, size: null, paper: null, ink: null, lineHeight: null, ayahGap: null, translation: null })}>
              <strong>{x.name}</strong><small>{x.hint}</small>
            </button>
          ))}
        </div>
      </div>
      {m.layout !== 'single' && choose('طريقة العرض', [{ id: 'pages' as const, label: 'صفحات المصحف' }, { id: 'verses' as const, label: 'آيات متتابعة' }], prefs.view, (v) => update({ view: v }))}
      <div className="r2-set-row">
        <span className="r2-set-label">حجم الخط ({look.size})</span>
        <div className="r2-size">
          <button aria-label="تصغير الخط" onClick={() => update({ size: look.size - 2 })}><Minus size={18} /></button>
          <input type="range" min={16} max={m.maxSize} value={look.size} onChange={(e) => update({ size: Number(e.target.value) })} aria-label="حجم الخط" />
          <button aria-label="تكبير الخط" onClick={() => update({ size: Math.min(m.maxSize, look.size + 2) })}><Plus size={18} /></button>
        </div>
      </div>
      {choose('الخط القرآني', QURAN_FONTS.map((f) => ({ id: f.id, label: f.label })), prefs.font, (v) => update({ font: v }))}
      {choose('لون الخلفية', [{ id: null as string | null, label: 'لون الوضع', swatch: m.paper, ink: m.ink }, ...PAPERS.map((x) => ({ id: x.id as string | null, label: x.label, swatch: x.paper, ink: x.ink }))], prefs.paper, (v) => update({ paper: v }))}
      {choose('لون النص', [{ id: null as string | null, label: 'تلقائي' }, ...INKS.map((x) => ({ id: x.id as string | null, label: x.label }))], prefs.ink, (v) => update({ ink: v }))}
      {choose('تباعد الأسطر', [{ id: 1.9, label: 'متقارب' }, { id: 2.2, label: 'متوسط' }, { id: 2.6, label: 'واسع' }], look.lineHeight, (v) => update({ lineHeight: v }))}
      {m.layout === 'blocks' && choose('تباعد الآيات', [{ id: 8, label: 'قليل' }, { id: 18, label: 'متوسط' }, { id: 30, label: 'كبير' }], look.ayahGap, (v) => update({ ayahGap: v }))}
      <label className="r2-toggle"><span>التشكيل (الحركات)</span><input type="checkbox" checked={prefs.tashkeel} onChange={(e) => update({ tashkeel: e.target.checked })} /></label>
      <p className="r2-hint">إخفاء الحركات للعرض فقط؛ الحروف وعلامات الوقف والنص المحفوظ لا تتغير.</p>
      <label className="r2-toggle"><span>ألوان التجويد (المصحف الملوّن)</span><input type="checkbox" checked={prefs.tajweed} onChange={(e) => update({ tajweed: e.target.checked })} /></label>
      <label className="r2-toggle"><span>الترجمة (English · Sahih International)</span><input type="checkbox" checked={look.translation} onChange={(e) => update({ translation: e.target.checked })} /></label>
      <button className="btn btn-ghost btn-sm" onClick={() => update({ size: null, paper: null, ink: null, lineHeight: null, ayahGap: null, translation: null })}>إرجاع إعدادات الوضع الأصلية</button>
      <p className="r2-hint">القارئ الجديد تجريبي؛ القارئ الحالي باقٍ كما هو حتى تعتمد النسخة.</p>
    </div>
  )
}

