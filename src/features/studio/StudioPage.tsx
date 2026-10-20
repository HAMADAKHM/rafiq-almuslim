import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Share2, Film, ImageIcon, Upload, X } from 'lucide-react'
import { PageHead, Spinner, Tabs, ProgressBar } from '../../components/Common'
import { MosqueScene } from '../../components/Art'
import { toast, useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { RECITERS, reciterById } from '../../content/reciters'
import { shareImage } from '../../platform'
import { isEmbeddedPreview } from '../../services/audio'
import {
  BACKGROUNDS, FORMATS, canvasToBlob, drawStudioFrame, isScene, loadStudioFonts, referenceText, sceneTone, svgToImage, versesText,
  type StudioBg, type StudioFormat, type StudioStyle, type Verse,
} from '../../services/studio'
import { MAX_VIDEO_AYAHS, extFor, loadRecitation, pickVideoMime, recordVideo, silentDurations } from '../../services/studioVideo'
import { VoiceAyahSearch } from '../../components/VoiceAyahSearch'
import { matchSpokenAyah } from '../../services/voiceSearch'
import { searchSkeleton, toArabicDigits } from '../../lib/arabic'
import { THEMES, suggestTheme } from '../../services/sceneThemes'
import { Sparkles } from 'lucide-react'

const MAX_IMAGE_AYAHS = 15
type Mode = 'image' | 'video'
type VideoState =
  | { phase: 'idle' }
  | { phase: 'loading'; done: number; total: number }
  | { phase: 'recording'; progress: number }
  | { phase: 'done'; blob: Blob; url: string }
  | { phase: 'error'; message: string }

export function StudioPage() {
  const { data } = useQuran()
  const { settings } = useSettings()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'video' ? 'video' : 'image')
  const [surah, setSurah] = useState(() => Math.min(114, Math.max(1, Number(params.get('s')) || 1)))
  const [from, setFrom] = useState(() => Math.max(1, Number(params.get('a')) || 1))
  const [to, setTo] = useState(() => Math.max(1, Number(params.get('to') || params.get('a')) || 1))
  const [style, setStyle] = useState<StudioStyle>({ format: 'square', bg: 'scene-sunset', textScale: 1, showRef: true, showBrand: true })
  const [reciterId, setReciterId] = useState(settings.reciterId)
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [bgVideo, setBgVideo] = useState<HTMLVideoElement | null>(null)
  const [withAudio, setWithAudio] = useState(true)
  const [ayahQuery, setAyahQuery] = useState('')
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
  // تصحيح النطاق: البداية ≤ النهاية، وضمن عدد آيات السورة والحد الأقصى
  const a = Math.min(from, count)
  const b = Math.min(Math.max(to, a), count, a + max - 1)
  const verses: Verse[] = useMemo(() => (data ? Array.from({ length: b - a + 1 }, (_, i) => ({ surah, ayah: a + i, text: data.verses[surah - 1][a + i - 1] })) : []), [data, surah, a, b])
  const ayahHits = useMemo(() => (data && searchSkeleton(ayahQuery).length >= 3 ? matchSpokenAyah(data, ayahQuery, 6) : []), [data, ayahQuery])
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
    const text = versesText(verses), reference = referenceText(meta!.name, verses)
    const draw = async () => {
      await loadStudioFonts(text, reference)
      const img = await bgImage().catch(() => null)
      if (!alive) return
      c.width = W; c.height = H
      const ok = drawStudioFrame(c.getContext('2d')!, W, H, { style, text, reference, bgImage: img })
      setOverflow(!ok)
    }
    draw()
    // إعادة الرسم إن اكتمل تحميل خط بعد الرسم الأول
    const again = () => { draw() }
    document.fonts?.addEventListener('loadingdone', again)
    return () => { alive = false; document.fonts?.removeEventListener('loadingdone', again) }
  }, [data, mode, style, verses, photo, bgVideo, W, H]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { abortRef.current?.abort() }, [])
  useEffect(() => { if (video.phase === 'done') return () => URL.revokeObjectURL(video.url) }, [video])

  if (!data || !meta) return <Spinner />

  const shareImg = async () => {
    const blob = await canvasToBlob(canvasRef.current!)
    const r = await shareImage(blob, `ayah-${surah}-${a}.png`, referenceText(meta.name, verses))
    toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظت الصورة' : 'تعذرت المشاركة في هذه البيئة')
  }

  const makeVideo = async () => {
    if (!pickVideoMime()) { setVideo({ phase: 'error', message: 'هذا الجهاز أو المتصفح لا يدعم إنشاء الفيديو.' }); return }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const actx = new AudioContext()
    try {
      await loadStudioFonts(versesText(verses), referenceText(meta.name, verses), reciterById(reciterId).name)
      setVideo({ phase: 'loading', done: 0, total: verses.length })
      const buffers = withAudio ? await loadRecitation(actx, reciterId, verses, (done, total) => setVideo({ phase: 'loading', done, total })) : null
      const useVideo = style.bg === 'video' ? bgVideo : null
      if (ctrl.signal.aborted) return
      const c = canvasRef.current!
      c.width = W; c.height = H
      const img = await bgImage().catch(() => null)
      setVideo({ phase: 'recording', progress: 0 })
      let last = 0
      const blob = await recordVideo({
        canvas: c, style, verses, surahName: meta.name, reciterName: reciterById(reciterId).name, bgImage: img, bgVideo: useVideo, buffers, actx, signal: ctrl.signal,
        durations: buffers ? undefined : silentDurations(verses, useVideo?.duration),
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
      <PageHead title="استوديو التصاميم" subtitle="صمّم صورًا وفيديوهات للآيات وشاركها — النص من المصحف المعتمد كما هو" />
      <Tabs label="نوع التصميم" value={mode} onChange={(m) => { if (!busy) { setMode(m); setVideo({ phase: 'idle' }) } }} items={[{ id: 'image', label: 'صورة' }, { id: 'video', label: 'فيديو بصوت القارئ' }]} />
      {/* مشهد الخلفية يُرسم مخفيًا ثم يُحوَّل إلى صورة */}
      <div ref={sceneRef} aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        {isScene(style.bg) && <MosqueScene tone={sceneTone(style.bg)} variant={style.format === 'story' ? 'tall' : 'wide'} />}
      </div>

      <div className="studio">
        <section className="card stack studio-controls">
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

          <div>
            <div className="small muted" style={{ marginBottom: 4 }}>المقاس</div>
            <div className="row" role="radiogroup" aria-label="مقاس التصميم">
              {(Object.keys(FORMATS) as StudioFormat[]).map((f) => (
                <button key={f} role="radio" aria-checked={style.format === f} disabled={busy} className={'btn btn-sm' + (style.format === f ? ' btn-primary' : '')} onClick={() => set({ format: f })}>{FORMATS[f].label}</button>
              ))}
            </div>
          </div>

          {(() => {
            const sug = suggestTheme(versesText(verses))
            if (!sug) return <p className="small muted" style={{ margin: 0 }}>لا توجد في الآيات المختارة كلمة حسية (بحر، مطر، ليل، جبال، جنات…) لاقتراح مشهد؛ اختر الخلفية التي تناسبك.</p>
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
              {BACKGROUNDS.map((bg) => (
                <button key={bg.id} role="radio" aria-checked={style.bg === bg.id} aria-label={bg.label} disabled={busy} className={'bg-sw' + (style.bg === bg.id ? ' on' : '')}
                  onClick={() => { if (bg.id === 'photo' && !photo) photoInput.current?.click(); else if (bg.id === 'video' && !bgVideo) videoInput.current?.click(); else set({ bg: bg.id as StudioBg }) }}>
                  <span style={{ background: bg.swatch }} />{bg.label}
                </button>
              ))}
            </div>
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

          <label className="field"><span>حجم الخط</span>
            <input type="range" min={0.6} max={1.4} step={0.05} value={style.textScale} disabled={busy} onChange={(e) => set({ textScale: Number(e.target.value) })} aria-label="حجم الخط" />
          </label>
          <label className="check"><input type="checkbox" className="switch-input" checked={style.showRef} onChange={(e) => set({ showRef: e.target.checked })} /> اسم السورة ورقم الآية</label>
          <label className="check"><input type="checkbox" className="switch-input" checked={style.showBrand} onChange={(e) => set({ showBrand: e.target.checked })} /> اسم التطبيق أسفل التصميم</label>

          {mode === 'video' && (
            <label className="check"><input type="checkbox" className="switch-input" checked={withAudio} disabled={busy} onChange={(e) => setWithAudio(e.target.checked)} aria-label="إضافة صوت التلاوة" /> إضافة صوت التلاوة بصوت القارئ</label>
          )}
          {mode === 'video' && withAudio && (
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
              <canvas ref={canvasRef} className={'studio-canvas fmt-' + style.format} role="img" aria-label={`معاينة التصميم: ${referenceText(meta.name, verses)}`} />
              {overflow && <p className="alert alert-gold small" role="alert">النص أطول من أن يتسع بخط مقروء. قلّل عدد الآيات أو اختر المقاس الطولي.</p>}
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn btn-primary" disabled={overflow} onClick={shareImg}><Share2 size={16} /> مشاركة الصورة</button>
              </div>
            </>
          )}
          {mode === 'video' && (
            <>
              {isEmbeddedPreview() && <p className="alert alert-gold small">صفحة المعاينة تمنع تحميل التلاوات من الخوادم الخارجية؛ أنشئ الفيديو من تطبيق الجوال أو من المتصفح مباشرة.</p>}
              <canvas ref={canvasRef} className={'studio-canvas fmt-' + style.format} hidden={video.phase === 'done' || video.phase === 'idle' || video.phase === 'error'} aria-hidden="true" />
              {video.phase === 'idle' && (
                <div className="studio-empty">
                  <Film size={36} aria-hidden="true" />
                  {withAudio
                    ? <p>تُعرض كل آية مع تلاوتها بصوت <strong>{reciterById(reciterId).name}</strong>{style.bg === 'video' ? ' فوق الفيديو الذي اخترته (صوته الأصلي مكتوم)' : ''}.</p>
                    : <p>تُعرض الآيات {style.bg === 'video' ? 'فوق الفيديو الذي اخترته، بلا صوت (صوته الأصلي مكتوم)' : 'بلا صوت'}.</p>}
                  <p className="small muted">يُنشأ الفيديو بزمنه الفعلي ({verses.length} آية)، فأبقِ الشاشة مفتوحة حتى ينتهي.{withAudio ? ' التلاوة تحتاج اتصالًا بالإنترنت ما لم تكن السورة منزّلة.' : ''}</p>
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
                      const r = await shareImage(video.blob, `ayah-${surah}-${a}.${extFor(video.blob.type)}`, referenceText(meta.name, verses))
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
