import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePlus } from '../../billing/PlusContext'
import { Share2, Film, ImageIcon, Upload, X, Bookmark, Trash2 } from 'lucide-react'
import { PageHead, Spinner, Tabs, ProgressBar } from '../../components/Common'
import { MosqueScene } from '../../components/Art'
import { toast, useLive, useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { RECITERS, reciterById } from '../../content/reciters'
import { shareImage } from '../../platform'
import { isEmbeddedPreview } from '../../services/audio'
import {
  AYAH_FONTS, TEXT_FONTS, studioFont, BACKGROUNDS, PLUS_BACKGROUNDS, FORMATS, canvasToBlob, drawStudioFrame, isScene, loadStudioFonts, referenceText, sceneTone, svgToImage, versesText,
  type StudioBg, type StudioFormat, type StudioStyle, type Verse,
} from '../../services/studio'
import { MAX_VIDEO_AYAHS, decodeUserAudio, extFor, loadRecitation, pickVideoMime, recordVideo, silentDurations } from '../../services/studioVideo'
import { VoiceAyahSearch } from '../../components/VoiceAyahSearch'
import { matchSpokenAyah } from '../../services/voiceSearch'
import { searchSkeleton, toArabicDigits } from '../../lib/arabic'
import { THEMES, suggestTheme } from '../../services/sceneThemes'
import { Sparkles } from 'lucide-react'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import { HADITH } from '../../content/hadith'
import type { ContentCategory } from '../../content/types'
import { DECEASED_CATEGORY, DECEASED_NAMES_KEY } from '../../content/deceased'
import { kv } from '../../db/repos'
import { ayahOfDay } from '../../services/daily'
import { dayKey } from '../../lib/dates'
import { SAVED_KEY, addSaved, loadSaved, saveDesigns, type SavedDesign, type StudioSource } from '../../services/studioSaved'

// لا تُعرض في الاستوديو إلا العناصر ذات النص (عناصر القرآن في الأذكار تُصمَّم من «آية» بنص المصحف)
const LIBS: Record<Exclude<StudioSource, 'ayah'>, ContentCategory[]> = { adhkar: ADHKAR, duas: DUAS, hadith: HADITH, deceased: [DECEASED_CATEGORY] }
const SOURCES: { id: StudioSource; label: string }[] = [{ id: 'ayah', label: 'آية' }, { id: 'adhkar', label: 'ذكر' }, { id: 'duas', label: 'دعاء' }, { id: 'deceased', label: 'دعاء لمتوفى' }, { id: 'hadith', label: 'حديث' }]
const textCats = (lib: ContentCategory[]) => lib.map((c) => ({ ...c, items: c.items.filter((i) => i.text) })).filter((c) => c.items.length)

const MAX_IMAGE_AYAHS = 15
type Mode = 'image' | 'video'
type VideoState =
  | { phase: 'idle' }
  | { phase: 'loading'; done: number; total: number }
  | { phase: 'recording'; progress: number }
  | { phase: 'done'; blob: Blob; url: string }
  | { phase: 'error'; message: string }

export function StudioPage() {
  const plus = usePlus()
  const { data } = useQuran()
  const { settings } = useSettings()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'video' ? 'video' : 'image')
  // من إشعار «شارك آية اليوم»: تبدأ بآية اليوم
  const daily = params.get('daily') ? ayahOfDay(dayKey()) : null
  const [surah, setSurah] = useState(() => Math.min(114, Math.max(1, Number(params.get('s')) || daily?.surah || 1)))
  const [from, setFrom] = useState(() => Math.max(1, Number(params.get('a')) || daily?.ayah || 1))
  const [to, setTo] = useState(() => Math.max(1, Number(params.get('to') || params.get('a')) || daily?.ayah || 1))
  const [style, setStyle] = useState<StudioStyle>({ format: 'square', bg: 'scene-sunset', textScale: 1, showRef: true, showBrand: true })
  const [reciterId, setReciterId] = useState(settings.reciterId)
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [bgVideo, setBgVideo] = useState<HTMLVideoElement | null>(null)
  const [withAudio, setWithAudio] = useState(true)
  const [ayahQuery, setAyahQuery] = useState('')
  const [source, setSource] = useState<StudioSource>(() => (SOURCES.some((x) => x.id === params.get('src')) ? params.get('src') as StudioSource : 'ayah'))
  const [catId, setCatId] = useState(() => params.get('cat') ?? '')
  const [itemId, setItemId] = useState(() => params.get('item') ?? '')
  const [voice, setVoice] = useState<File | null>(null)
  const voiceInput = useRef<HTMLInputElement>(null)
  const names = useLive(() => kv.get<string[]>(DECEASED_NAMES_KEY, []), ['kv:' + DECEASED_NAMES_KEY], [] as string[])
  const saved = useLive(() => loadSaved(), ['kv:' + SAVED_KEY], [] as SavedDesign[])
  const videoInput = useRef<HTMLInputElement>(null)
  const [overflow, setOverflow] = useState(false)
  const [video, setVideo] = useState<VideoState>({ phase: 'idle' })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  const meta = data?.meta.surahs[surah - 1]
  const count = meta?.count ?? 7
  const max = mode === 'video' ? MAX_VIDEO_AYAHS : MAX_IMAGE_AYAHS
  const textOnly = source !== 'ayah'
  // تصحيح النطاق: البداية ≤ النهاية، وضمن عدد آيات السورة والحد الأقصى
  const a = Math.min(from, count)
  const b = Math.min(Math.max(to, a), count, a + max - 1)
  const verses: Verse[] = useMemo(() => (data ? Array.from({ length: b - a + 1 }, (_, i) => ({ surah, ayah: a + i, text: data.verses[surah - 1][a + i - 1] })) : []), [data, surah, a, b])
  const ayahHits = useMemo(() => (data && searchSkeleton(ayahQuery).length >= 3 ? matchSpokenAyah(data, ayahQuery, 6) : []), [data, ayahQuery])
  const cats = useMemo(() => (source === 'ayah' ? [] : textCats(LIBS[source])), [source])
  const cat = cats.find((c) => c.id === catId) ?? cats[0]
  const item = cat?.items.find((i) => i.id === itemId) ?? cat?.items[0]
  const isAyah = source === 'ayah'
  const font = studioFont(style, isAyah)
  const pick = (s: number, a: number) => { setSurah(s); setFrom(a); setTo(a); setAyahQuery('') }
  const { w: W, h: H } = FORMATS[style.format]
  const set = (p: Partial<StudioStyle>) => setStyle((s) => ({ ...s, ...p }))

  const bgImage = async () => {
    if (style.bg === 'photo') return photo
    if (style.bg === 'video') return bgVideo
    if (!isScene(style.bg)) return null
    const svg = sceneRef.current?.querySelector('svg')
    return svg ? svgToImage(svg as SVGSVGElement, W, H) : null
  }

  // معاينة الصورة: تُعاد عند كل تغيير
  useEffect(() => {
    if (!data || mode !== 'image' || !canvasRef.current) return
    let alive = true
    const c = canvasRef.current
    const text = isAyah ? versesText(verses) : item?.text ?? ''
    const reference = isAyah ? referenceText(meta!.name, verses) : item?.source ?? ''
    const draw = async () => {
      await loadStudioFonts(text, reference)
      const img = await bgImage().catch(() => null)
      if (!alive) return
      c.width = W; c.height = H
      const ok = drawStudioFrame(c.getContext('2d')!, W, H, { style, text, reference, bgImage: img, font })
      setOverflow(!ok)
    }
    draw()
    // إعادة الرسم إن اكتمل تحميل خط بعد الرسم الأول
    const again = () => { draw() }
    document.fonts?.addEventListener('loadingdone', again)
    return () => { alive = false; document.fonts?.removeEventListener('loadingdone', again) }
  }, [data, mode, style, verses, photo, bgVideo, W, H, isAyah, item]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { abortRef.current?.abort() }, [])
  useEffect(() => { if (video.phase === 'done') return () => URL.revokeObjectURL(video.url) }, [video])

  if (!data || !meta) return <Spinner />

  const shareImg = async () => {
    const blob = await canvasToBlob(canvasRef.current!)
    const r = await shareImage(blob, isAyah ? `ayah-${surah}-${a}.png` : `${source}-${item?.id}.png`, isAyah ? referenceText(meta.name, verses) : item?.source)
    toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظت الصورة' : 'تعذرت المشاركة في هذه البيئة')
  }
  const designTitle = () => (isAyah ? referenceText(meta.name, verses) : `${cat?.title}: ${(item?.text ?? '').split(/\s+/).slice(0, 6).join(' ')}…`)
  const saveDesign = async () => {
    const d = isAyah ? { title: designTitle(), source: 'ayah' as const, surah, from: a, to: b, style } : { title: designTitle(), source, category: cat?.id, item: item?.id, style }
    await saveDesigns(addSaved(saved, d))
    toast(style.bg === 'photo' || style.bg === 'video' ? 'حُفظ التصميم (بخلفية افتراضية بدل صورتك)' : 'حُفظ في «تصاميمي»')
  }
  const openDesign = (d: SavedDesign) => {
    setMode('image'); setVideo({ phase: 'idle' }); setStyle(d.style); setSource(d.source)
    if (d.source === 'ayah') { setSurah(d.surah ?? 1); setFrom(d.from ?? 1); setTo(d.to ?? d.from ?? 1) } else { setCatId(d.category ?? ''); setItemId(d.item ?? '') }
  }

  const makeVideo = async () => {
    if (!pickVideoMime()) { setVideo({ phase: 'error', message: 'هذا الجهاز أو المتصفح لا يدعم إنشاء الفيديو.' }); return }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const actx = new AudioContext()
    try {
      const items = isAyah || !item ? undefined : [{ text: item.text ?? '', reference: item.source }]
      await loadStudioFonts(items ? items[0].text + ' ' + items[0].reference : versesText(verses) + ' ' + referenceText(meta.name, verses), reciterById(reciterId).name, style.note ?? '')
      setVideo({ phase: 'loading', done: 0, total: items ? 1 : verses.length })
      const buffers = !withAudio ? null
        : items ? (voice ? [await decodeUserAudio(actx, voice)] : null)
        : await loadRecitation(actx, reciterId, verses, (done, total) => setVideo({ phase: 'loading', done, total }))
      const useVideo = style.bg === 'video' ? bgVideo : null
      if (ctrl.signal.aborted) return
      const c = canvasRef.current!
      c.width = W; c.height = H
      const img = await bgImage().catch(() => null)
      setVideo({ phase: 'recording', progress: 0 })
      let last = 0
      const blob = await recordVideo({
        canvas: c, style, verses, surahName: meta.name, reciterName: items ? '' : reciterById(reciterId).name, bgImage: img, bgVideo: useVideo, buffers, actx, signal: ctrl.signal,
        items, font,
        durations: buffers ? undefined : items ? [Math.min(30, Math.max(6, (useVideo?.duration && Number.isFinite(useVideo.duration) ? Math.min(30, useVideo.duration) : 4 + (items[0].text.length * 0.08))))] : silentDurations(verses, useVideo?.duration),
        onProgress: (p) => { if (p - last > 0.01 || p === 1) { last = p; setVideo({ phase: 'recording', progress: p }) } },
      })
      setVideo({ phase: 'done', blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      if ((e as Error).name === 'AbortError') setVideo({ phase: 'idle' })
      else setVideo({ phase: 'error', message: (e as Error).message || 'تعذر إنشاء الفيديو' })
    } finally {
      actx.close().catch(() => {})
    }
  }
  const busy = video.phase === 'loading' || video.phase === 'recording'

  return (
    <>
      <PageHead title="استوديو التصاميم" subtitle="صمّم بطاقات للآيات والأذكار والأدعية والأحاديث وشاركها — النصوص من المصحف والمكتبة الموثقة كما هي" />
      <Tabs label="نوع التصميم" value={mode} onChange={(m) => { if (!busy) { setMode(m); setVideo({ phase: 'idle' }) } }} items={[{ id: 'image', label: 'صورة' }, { id: 'video', label: 'فيديو' }]} />
      {/* مشهد الخلفية يُرسم مخفيًا ثم يُحوَّل إلى صورة */}
      <div ref={sceneRef} aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        {isScene(style.bg) && <MosqueScene tone={sceneTone(style.bg)} variant={style.format === 'story' ? 'tall' : 'wide'} />}
      </div>

      <div className="studio">
        <section className="card stack studio-controls">
          {(
            <div className="row" role="radiogroup" aria-label="محتوى التصميم">
              {SOURCES.map((x) => (
                <button key={x.id} role="radio" aria-checked={source === x.id} className={'btn btn-sm' + (source === x.id ? ' btn-primary' : '')} onClick={() => { setSource(x.id); setCatId(''); setItemId('') }}>{x.label}</button>
              ))}
            </div>
          )}
          {!isAyah && cat && item && (
            <div className="stack" style={{ gap: '0.6rem' }}>
              <label className="field"><span>القسم</span>
                <select className="select" value={cat.id} onChange={(e) => { setCatId(e.target.value); setItemId('') }}>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <label className="field"><span>{source === 'hadith' ? 'الحديث' : source === 'duas' ? 'الدعاء' : 'الذكر'}</span>
                <select className="select" value={item.id} onChange={(e) => setItemId(e.target.value)}>
                  {cat.items.map((i) => <option key={i.id} value={i.id}>{(i.text ?? '').split(/\s+/).slice(0, 8).join(' ')}…</option>)}
                </select>
              </label>
              <p className="small muted" style={{ margin: 0 }}>المصدر: {item.source}{item.grade ? ` • ${item.grade}` : ''}. يُكتب بخط النسخ تمييزًا له عن نص المصحف، والنص من المكتبة الموثقة كما هو دون تعديل.</p>
            </div>
          )}
          {isAyah && <>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="input" value={ayahQuery} disabled={busy} onChange={(e) => setAyahQuery(e.target.value)} placeholder="ابحث عن الآية: اكتب كلمة أو جزءًا منها" aria-label="ابحث عن الآية بكتابة جزء منها" />
              <VoiceAyahSearch compact onPick={(s, a) => pick(s, a)} />
            </div>
            {ayahHits.length > 0 && (
              <div className="studio-hits" role="list" aria-label="نتائج البحث عن الآية">
                {ayahHits.map((m) => (
                  <button key={`${m.surah}:${m.ayah}`} role="listitem" className="voice-hit" onClick={() => pick(m.surah, m.ayah)}>
                    <span className="small"><strong>سورة {data.meta.surahs[m.surah - 1].name}</strong> — الآية {toArabicDigits(m.ayah)}</span>
                    <span className="quran-text voice-hit-text">{data.verses[m.surah - 1][m.ayah - 1]}</span>
                  </button>
                ))}
              </div>
            )}
            {searchSkeleton(ayahQuery).length >= 3 && ayahHits.length === 0 && <p className="small muted" style={{ margin: 0 }}>لا نتائج — جرّب كلمات أخرى من الآية.</p>}
          </div>
          <div className="grid grid-2" style={{ gap: '0.6rem' }}>
            <label className="field" style={{ gridColumn: '1 / -1' }}><span>السورة</span>
              <select className="select" value={surah} disabled={busy} onChange={(e) => { setSurah(Number(e.target.value)); setFrom(1); setTo(1) }}>
                {data.meta.surahs.map((s) => <option key={s.n} value={s.n}>{s.n}. {s.name}</option>)}
              </select>
            </label>
            <label className="field"><span>من الآية</span>
              <select className="select" value={a} disabled={busy} onChange={(e) => { const v = Number(e.target.value); setFrom(v); if (to < v) setTo(v) }}>
                {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </label>
            <label className="field"><span>إلى الآية</span>
              <select className="select" value={b} disabled={busy} onChange={(e) => setTo(Number(e.target.value))}>
                {Array.from({ length: Math.min(count, a + max - 1) - a + 1 }, (_, i) => <option key={i} value={a + i}>{a + i}</option>)}
              </select>
            </label>
          </div>
          <p className="small muted" style={{ margin: 0 }}>حتى {max} آية في {mode === 'video' ? 'الفيديو' : 'الصورة'}.</p>
          </>}

          <div>
            <div className="small muted" style={{ marginBottom: 4 }}>المقاس</div>
            <div className="row" role="radiogroup" aria-label="مقاس التصميم">
              {(Object.keys(FORMATS) as StudioFormat[]).map((f) => (
                <button key={f} role="radio" aria-checked={style.format === f} disabled={busy} className={'btn btn-sm' + (style.format === f ? ' btn-primary' : '')} onClick={() => set({ format: f })}>{FORMATS[f].label}</button>
              ))}
            </div>
          </div>

          {(() => {
            const sug = suggestTheme(isAyah ? versesText(verses) : item?.text ?? '')
            if (!sug) return <p className="small muted" style={{ margin: 0 }}>لا توجد في النص المختار كلمة حسية (بحر، مطر، ليل، جبال، جنات…) لاقتراح مشهد؛ اختر الخلفية التي تناسبك.</p>
            const label = THEMES.find((x) => x.id === sug.theme)!.label
            const on = style.bg === `theme-${sug.theme}`
            return (
              <button className={'btn' + (on ? ' btn-gold' : '')} disabled={busy || on} onClick={() => set({ bg: `theme-${sug.theme}` as StudioBg })} aria-label={`المشهد المقترح: ${label}`}>
                <Sparkles size={16} /> {on ? `المشهد المقترح مطبّق: ${label}` : `مشهد مقترح من كلمات الآية: ${label}`}
              </button>
            )
          })()}
          <div>
            <div className="small muted" style={{ marginBottom: 4 }}>الخلفية</div>
            <div className="bg-swatches" role="radiogroup" aria-label="الخلفية">
              {[...BACKGROUNDS, ...(plus.entitled ? PLUS_BACKGROUNDS : [])].map((bg) => (
                <button key={bg.id} role="radio" aria-checked={style.bg === bg.id} aria-label={bg.label} disabled={busy} className={'bg-sw' + (style.bg === bg.id ? ' on' : '')}
                  onClick={() => { if (bg.id === 'photo' && !photo) photoInput.current?.click(); else if (bg.id === 'video' && !bgVideo) videoInput.current?.click(); else set({ bg: bg.id as StudioBg }) }}>
                  <span style={{ background: bg.swatch }} />{bg.label}
                </button>
              ))}
            </div>
            {!plus.entitled && <p className="small muted" style={{ margin: '0.3rem 0 0' }}>ست خلفيات إضافية في <Link to="/plus">رفيق بلس</Link>.</p>}
            <input ref={photoInput} type="file" accept="image/*" hidden aria-label="اختيار صورة خلفية" onChange={(e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (!f) return
              const img = new Image()
              img.onload = () => { setPhoto(img); set({ bg: 'photo' }) }
              img.onerror = () => toast('تعذر فتح الصورة')
              img.src = URL.createObjectURL(f)
            }} />
            <input ref={videoInput} type="file" accept="video/*" hidden aria-label="اختيار فيديو من الجهاز" onChange={(e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (!f) return
              if (f.size > 300 * 1024 * 1024) { toast('الفيديو أكبر من 300 ميغابايت'); return }
              const v = document.createElement('video')
              v.muted = true; v.playsInline = true; v.loop = true; v.preload = 'auto'
              v.onloadeddata = () => {
                // إطار من بداية الفيديو للمعاينة
                v.onseeked = () => { v.onseeked = null; setBgVideo(v); set({ bg: 'video' }) }
                v.currentTime = Math.min(0.5, (v.duration || 1) / 2)
              }
              v.onerror = () => toast('تعذر فتح الفيديو — جرّب ملف MP4')
              if (bgVideo) URL.revokeObjectURL(bgVideo.src)
              v.src = URL.createObjectURL(f)
            }} />
            {bgVideo && <div className="row" style={{ marginTop: 6 }}>
              <span className="small muted">فيديو من جهازك ({Math.round(bgVideo.duration)} ث) — يُكتم صوته الأصلي دائمًا</span>
              <button className="btn btn-sm" onClick={() => videoInput.current?.click()}><Upload size={14} /> تغيير الفيديو</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { URL.revokeObjectURL(bgVideo.src); setBgVideo(null); if (style.bg === 'video') set({ bg: 'scene-sunset' }) }}><X size={14} /> إزالة</button>
            </div>}
            {photo && <div className="row" style={{ marginTop: 6 }}>
              <button className="btn btn-sm" onClick={() => photoInput.current?.click()}><Upload size={14} /> تغيير صورتي</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { setPhoto(null); if (style.bg === 'photo') set({ bg: 'scene-sunset' }) }}><X size={14} /> إزالة</button>
            </div>}
          </div>

          <div>
            <div className="small muted" style={{ marginBottom: 4 }}>نوع الخط</div>
            <div className="chips" role="radiogroup" aria-label="نوع الخط">
              {(isAyah ? AYAH_FONTS : TEXT_FONTS).map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={font === f.id} disabled={busy} className={'chip font-chip font-' + f.id + (font === f.id ? ' active' : '')} onClick={() => set({ font: f.id })}>{f.label}</button>
              ))}
            </div>
            {isAyah && <p className="small muted" style={{ margin: '4px 0 0' }}>الآيات تُكتب بخط المصحف فقط حفاظًا على رسمها.</p>}
          </div>
          <label className="field"><span>سطر شخصي فوق النص (اختياري)</span>
            <input className="input" value={style.note ?? ''} maxLength={80} disabled={busy} onChange={(e) => set({ note: e.target.value })} placeholder={source === 'deceased' ? 'مثال: اللهم ارحم والدي' : 'مثال: صدقة جارية عن…'} aria-label="سطر شخصي فوق النص" />
          </label>
          {source === 'deceased' && names.length > 0 && (
            <div className="chips" aria-label="أسماء أحبتي">
              {names.map((n) => <button key={n} type="button" className="chip" onClick={() => set({ note: `اللهم ارحم ${n} واغفر له` })}>{n}</button>)}
            </div>
          )}
          <label className="field"><span>حجم الخط</span>
            <input type="range" min={0.6} max={1.4} step={0.05} value={style.textScale} disabled={busy} onChange={(e) => set({ textScale: Number(e.target.value) })} aria-label="حجم الخط" />
          </label>
          <label className="check"><input type="checkbox" className="switch-input" checked={style.showRef} onChange={(e) => set({ showRef: e.target.checked })} /> {isAyah ? 'اسم السورة ورقم الآية' : 'المصدر والتخريج'}</label>
          <label className="check"><input type="checkbox" className="switch-input" checked={style.showBrand} onChange={(e) => set({ showBrand: e.target.checked })} /> اسم التطبيق أسفل التصميم</label>

          {mode === 'video' && (
            <label className="check"><input type="checkbox" className="switch-input" checked={withAudio} disabled={busy} onChange={(e) => setWithAudio(e.target.checked)} aria-label={textOnly ? 'إضافة صوت' : 'إضافة صوت التلاوة'} /> {textOnly ? 'بصوت (تسجيلك أو ملف من جوالك)' : 'إضافة صوت التلاوة بصوت القارئ'}</label>
          )}
          {mode === 'video' && withAudio && textOnly && (
            <div className="stack" style={{ gap: 6 }}>
              <input ref={voiceInput} type="file" accept="audio/*" hidden aria-label="اختيار صوت من الجوال" onChange={(e) => { const f = e.target.files?.[0]; if (f) setVoice(f); e.target.value = '' }} />
              <div className="row">
                <button className="btn btn-sm" disabled={busy} onClick={() => voiceInput.current?.click()}><Upload size={14} /> {voice ? 'تغيير الصوت' : 'اختر تسجيلًا أو ملفًا صوتيًا'}</button>
                {voice && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setVoice(null)}><X size={14} /> إزالة</button>}
              </div>
              <p className="small muted" style={{ margin: 0 }}>{voice ? `الصوت: ${voice.name}` : 'سجّل صوتك بالذكر أو الدعاء من مسجل الجوال ثم اختره هنا (حتى دقيقتين). دون صوت يُنشأ المقطع صامتًا.'}</p>
            </div>
          )}
          {mode === 'video' && withAudio && !textOnly && (
            <label className="field"><span>القارئ</span>
              <select className="select" value={reciterId} disabled={busy} onChange={(e) => setReciterId(e.target.value)}>
                {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.style}</option>)}
              </select>
            </label>
          )}
        </section>

        <section className="studio-preview">
          {mode === 'image' && (
            <>
              <canvas ref={canvasRef} className={'studio-canvas fmt-' + style.format} role="img" aria-label={`معاينة التصميم: ${isAyah ? referenceText(meta.name, verses) : item?.source}`} />
              {overflow && <p className="alert alert-gold small" role="alert">النص أطول من أن يتسع بخط مقروء. قلّل عدد الآيات أو اختر المقاس الطولي.</p>}
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn btn-primary" disabled={overflow} onClick={shareImg}><Share2 size={16} /> مشاركة الصورة</button>
                <button className="btn" onClick={saveDesign}><Bookmark size={16} /> حفظ التصميم</button>
              </div>
              {saved.length > 0 && (
                <div className="card stack" style={{ gap: 6 }}>
                  <strong className="small">تصاميمي ({saved.length})</strong>
                  <ul className="list-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="تصاميمي">
                    {saved.map((d) => (
                      <li key={d.id} className="row" style={{ flexWrap: 'nowrap' }}>
                        <button className="btn btn-sm btn-ghost" style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'start' }} onClick={() => openDesign(d)}>{d.title}</button>
                        <button className="btn btn-sm btn-ghost" aria-label={`حذف التصميم: ${d.title}`} onClick={() => saveDesigns(saved.filter((x) => x.id !== d.id))}><Trash2 size={14} /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {mode === 'video' && (
            <>
              {isEmbeddedPreview() && <p className="alert alert-gold small">صفحة المعاينة تمنع تحميل التلاوات من الخوادم الخارجية؛ أنشئ الفيديو من تطبيق الجوال أو من المتصفح مباشرة.</p>}
              <canvas ref={canvasRef} className={'studio-canvas fmt-' + style.format} hidden={video.phase === 'done' || video.phase === 'idle' || video.phase === 'error'} aria-hidden="true" />
              {video.phase === 'idle' && (
                <div className="studio-empty">
                  <Film size={36} aria-hidden="true" />
                  {textOnly
                    ? <p>يُعرض النص مع مصدره{style.bg === 'video' ? ' فوق الفيديو الذي اخترته (صوته الأصلي مكتوم)' : ''}{withAudio && voice ? '، بصوتك الذي اخترته' : '، بلا صوت'}.</p>
                    : withAudio
                    ? <p>تُعرض كل آية مع تلاوتها بصوت <strong>{reciterById(reciterId).name}</strong>{style.bg === 'video' ? ' فوق الفيديو الذي اخترته (صوته الأصلي مكتوم)' : ''}.</p>
                    : <p>تُعرض الآيات {style.bg === 'video' ? 'فوق الفيديو الذي اخترته، بلا صوت (صوته الأصلي مكتوم)' : 'بلا صوت'}.</p>}
                  <p className="small muted">يُنشأ الفيديو بزمنه الفعلي{textOnly ? '' : ` (${verses.length} آية)`}، فأبقِ الشاشة مفتوحة حتى ينتهي.{withAudio && !textOnly ? ' التلاوة تحتاج اتصالًا بالإنترنت ما لم تكن السورة منزّلة.' : ''}</p>
                  <button className="btn btn-primary" onClick={makeVideo}><Film size={16} /> إنشاء الفيديو</button>
                </div>
              )}
              {video.phase === 'loading' && <div className="stack" aria-live="polite"><p>جارٍ تحميل التلاوة… {video.done} / {video.total}</p><ProgressBar value={video.done / video.total} label="تحميل التلاوة" /></div>}
              {video.phase === 'recording' && (
                <div className="stack" aria-live="polite">
                  <p>جارٍ إنشاء الفيديو… {Math.round(video.progress * 100)}٪</p>
                  <ProgressBar value={video.progress} label="إنشاء الفيديو" />
                  <button className="btn btn-sm" onClick={() => abortRef.current?.abort()}>إلغاء</button>
                </div>
              )}
              {video.phase === 'error' && <div className="stack"><p className="alert alert-error small" role="alert">{video.message}</p><button className="btn" onClick={makeVideo}>إعادة المحاولة</button></div>}
              {video.phase === 'done' && (
                <div className="stack" style={{ alignItems: 'center' }}>
                  <video src={video.url} controls playsInline className={'studio-canvas fmt-' + style.format} aria-label="الفيديو الناتج" />
                  <div className="row">
                    <button className="btn btn-primary" onClick={async () => {
                      const r = await shareImage(video.blob, textOnly ? `${source}-${item?.id}.${extFor(video.blob.type)}` : `ayah-${surah}-${a}.${extFor(video.blob.type)}`, textOnly ? item?.source : referenceText(meta.name, verses))
                      toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظ الفيديو' : 'تعذرت المشاركة في هذه البيئة')
                    }}><Share2 size={16} /> مشاركة الفيديو</button>
                    <button className="btn" onClick={() => setVideo({ phase: 'idle' })}><ImageIcon size={16} /> فيديو جديد</button>
                  </div>
                  {video.blob.type.includes('webm') && <p className="small muted">صيغة الفيديو WebM (ما يدعمه هذا المتصفح). بعض التطبيقات تفضّل MP4، ونسخة الجوال تنشئ MP4 حين يدعمه الجهاز.</p>}
                </div>
              )}
            </>
          )}
          <p className="small muted" style={{ textAlign: 'center' }}>التلاوات من EveryAyah وIslamic Network، وتبقى حقوقها لأصحابها؛ يُستحسن ذكر اسم القارئ عند النشر.</p>
        </section>
      </div>
    </>
  )
}
