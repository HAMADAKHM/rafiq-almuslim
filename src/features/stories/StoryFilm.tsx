// «وضع الفيلم» (رفيق بلس): القصة بملء الشاشة على مشاهد متحركة، مع التلاوة وقراءة المعنى، وحفظها فيديو.
import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Play, Pause, ChevronRight, ChevronLeft, Clapperboard, Share2 } from 'lucide-react'
import { drawFilmFrame, recordStoryVideo, sceneTheme, type FilmScene } from '../../services/storyFilm'
import { loadStudioFonts } from '../../services/studio'
import { loadRecitation, MAX_VIDEO_AYAHS, extFor } from '../../services/studioVideo'
import { reciterById } from '../../content/reciters'
import { shareImage } from '../../platform'
import { narrationAvailable, synthesizeNarration } from '../../platform/narration'
import { toArabicDigits } from '../../lib/arabic'
import type { PaintTone } from '../../components/Scene'

export type FilmPhase = { kind: 'ayah'; ayah: number } | { kind: 'meaning' } | { kind: 'idle' }

interface Props {
  title: string
  surah: number
  surahName: string
  verses: string[]
  scenes: FilmScene[]
  tone: PaintTone
  index: number
  phase: FilmPhase
  playing: boolean
  reciterId: string
  onPlay(): void
  onStop(): void
  onGo(i: number): void
  onClose(): void
}

type Save = { s: 'idle' } | { s: 'loading'; done: number; total: number } | { s: 'voice'; done: number; total: number } | { s: 'recording'; p: number } | { s: 'done'; blob: Blob; url: string } | { s: 'error'; msg: string }

export function StoryFilm(p: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const saveCanvas = useRef<HTMLCanvasElement>(null)
  const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  const format = portrait ? 'story' : 'landscape'
  const [W, H] = portrait ? [1080, 1920] : [1920, 1080]
  const themes = useMemo(() => p.scenes.map((s) => sceneTheme(p.verses.slice(s.from - 1, s.to).join(' ') + ' ' + s.text, p.tone)), [p.scenes, p.verses, p.tone])
  const state = useRef({ ...p, phaseAt: performance.now() })
  const [save, setSave] = useState<Save>({ s: 'idle' })
  const [voiceInVideo, setVoiceInVideo] = useState(true)
  const [canVoice, setCanVoice] = useState(false)
  const [voiceUsed, setVoiceUsed] = useState(false)
  useEffect(() => { narrationAvailable().then(setCanVoice) }, [])
  const abort = useRef<AbortController | null>(null)

  // آخر حالة للرسم (دون إعادة تشغيل حلقة الرسم)
  useEffect(() => {
    const prev = state.current
    const changed = prev.index !== p.index || JSON.stringify(prev.phase) !== JSON.stringify(p.phase)
    state.current = { ...p, phaseAt: changed ? performance.now() : prev.phaseAt }
  })

  useEffect(() => {
    const sc = p.scenes[p.index]
    if (sc) loadStudioFonts(p.verses.slice(sc.from - 1, sc.to).join(' '), sc.text, 'المعنى').catch(() => {})
  }, [p.index]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = canvas.current!
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    const t0 = performance.now()
    let raf = 0
    const loop = () => {
      const st = state.current
      const sc = st.scenes[st.index]
      if (sc) {
        const now = performance.now()
        const fade = Math.min(1, (now - st.phaseAt) / 600)
        const showMeaning = st.phase.kind === 'meaning' || (st.phase.kind === 'idle' && !st.playing)
        const ayahs = st.phase.kind === 'ayah' ? [st.phase.ayah] : Array.from({ length: sc.to - sc.from + 1 }, (_, k) => sc.from + k)
        drawFilmFrame(ctx, W, H, {
          theme: themes[st.index], format, time: (now - t0) / 1000, progress: (st.index + 1) / st.scenes.length,
          ayahText: ayahs.map((a) => `${st.verses[a - 1]} ۝${toArabicDigits(a)}`).join(' '),
          ref: `${st.title} • سورة ${st.surahName}`,
          meaning: sc.text,
          ayahAlpha: st.phase.kind === 'ayah' ? fade : showMeaning ? 0.35 : 1,
          meaningAlpha: showMeaning ? fade : 0,
          subtitle: reciterById(st.reciterId).name,
        })
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [themes, W, H, format])

  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => { if (save.s === 'done') return () => URL.revokeObjectURL(save.url) }, [save])

  // المشاهد من الحالي حتى 20 آية
  const range = useMemo(() => {
    const out: FilmScene[] = []
    let n = 0
    for (let k = p.index; k < p.scenes.length; k++) { const c = p.scenes[k].to - p.scenes[k].from + 1; if (out.length && n + c > MAX_VIDEO_AYAHS) break; out.push(p.scenes[k]); n += c }
    return out
  }, [p.index, p.scenes])

  const makeVideo = async () => {
    p.onStop()
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const actx = new AudioContext()
    try {
      const ayahs = range.flatMap((s) => Array.from({ length: s.to - s.from + 1 }, (_, k) => s.from + k))
      await loadStudioFonts(ayahs.map((a) => p.verses[a - 1]).join(' '), range.map((s) => s.text).join(' '), 'المعنى')
      setSave({ s: 'loading', done: 0, total: ayahs.length })
      const bufs = await loadRecitation(actx, p.reciterId, ayahs.map((a) => ({ surah: p.surah, ayah: a, text: p.verses[a - 1] })), (done, total) => setSave({ s: 'loading', done, total }))
      if (ctrl.signal.aborted) return
      // صوت قراءة المعنى لكل مشهد (إن أمكن)؛ إن تعذر لمشهد يبقى المعنى مكتوبًا فيه فقط
      let narration: (AudioBuffer | null)[] | undefined
      if (voiceInVideo && canVoice) {
        narration = []
        for (let k = 0; k < range.length; k++) {
          setSave({ s: 'voice', done: k, total: range.length })
          narration.push(await synthesizeNarration(actx, range[k].text).catch(() => null))
          if (ctrl.signal.aborted) return
        }
      }
      setVoiceUsed(!!narration?.some(Boolean))
      const c = saveCanvas.current!
      c.width = W; c.height = H
      setSave({ s: 'recording', p: 0 })
      let last = 0
      const blob = await recordStoryVideo({
        canvas: c, format, scenes: range, themes: themes.slice(p.index, p.index + range.length), verses: (a) => p.verses[a - 1],
        surahName: p.surahName, reciterName: reciterById(p.reciterId).name, buffers: new Map(ayahs.map((a, i) => [a, bufs[i]])), narration, actx, signal: ctrl.signal,
        onProgress: (x) => { if (x - last > 0.01 || x === 1) { last = x; setSave({ s: 'recording', p: x }) } },
      })
      setSave({ s: 'done', blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setSave((e as Error).name === 'AbortError' ? { s: 'idle' } : { s: 'error', msg: (e as Error).message || 'تعذر إنشاء الفيديو' })
    } finally { actx.close().catch(() => {}) }
  }
  const busy = save.s === 'loading' || save.s === 'recording' || save.s === 'voice'
  const ayahCount = range.reduce((n, s) => n + s.to - s.from + 1, 0)

  return (
    <div className="story-film" role="dialog" aria-modal="true" aria-label={`وضع الفيلم: ${p.title}`}>
      <canvas ref={canvas} className="film-canvas" aria-hidden="true" />
      <canvas ref={saveCanvas} hidden aria-hidden="true" />
      <div className="film-top">
        <button className="film-btn" onClick={() => { p.onStop(); abort.current?.abort(); p.onClose() }} aria-label="إغلاق وضع الفيلم"><X size={22} /></button>
        <span>المشهد {toArabicDigits(p.index + 1)} من {toArabicDigits(p.scenes.length)}</span>
      </div>
      <div className="film-bar">
        <button className="film-btn" onClick={() => { p.onStop(); p.onGo(p.index - 1) }} disabled={p.index === 0 || busy} aria-label="المشهد السابق"><ChevronRight size={26} /></button>
        <button className="film-btn play" onClick={() => (p.playing ? p.onStop() : p.onPlay())} disabled={busy}>{p.playing ? <><Pause size={20} /> إيقاف</> : <><Play size={20} /> شاهد واستمع</>}</button>
        <button className="film-btn" onClick={() => { p.onStop(); p.onGo(p.index + 1) }} disabled={p.index >= p.scenes.length - 1 || busy} aria-label="المشهد التالي"><ChevronLeft size={26} /></button>
        <button className="film-btn" onClick={makeVideo} disabled={busy}><Clapperboard size={18} /> حفظ فيديو</button>
        {canVoice && <label className="film-btn film-check"><input type="checkbox" checked={voiceInVideo} disabled={busy} onChange={(e) => setVoiceInVideo(e.target.checked)} /> صوت المعنى في الفيديو</label>}
      </div>
      {save.s !== 'idle' && (
        <div className="film-save" role="status">
          {save.s === 'loading' && <p>جارٍ تحميل التلاوة… {toArabicDigits(save.done)} / {toArabicDigits(save.total)}</p>}
          {save.s === 'voice' && <p>جارٍ تجهيز صوت قراءة المعنى… {toArabicDigits(save.done)} / {toArabicDigits(save.total)}</p>}
          {save.s === 'recording' && <p>جارٍ تسجيل الفيديو ({toArabicDigits(ayahCount)} آية) — {toArabicDigits(Math.round(save.p * 100))}٪. أبقِ الشاشة مفتوحة.</p>}
          {save.s === 'error' && <p>{save.msg}</p>}
          {save.s === 'done' && (
            <>
              <video src={save.url} controls playsInline className="film-result" aria-label="فيديو القصة" />
              <div className="row wrap gap">
                <button className="btn btn-gold" onClick={async () => { await shareImage(save.blob, `qissa-${p.surah}-${range[0].from}.${extFor(save.blob.type)}`, `${p.title} — سورة ${p.surahName}`) }}><Share2 size={16} /> مشاركة أو حفظ</button>
                <button className="btn" onClick={() => setSave({ s: 'idle' })}>إغلاق</button>
              </div>
              <p className="small">في الفيديو: الآيات بصوت {reciterById(p.reciterId).name}{voiceUsed ? '، ثم المعنى بصوت قراءة الهاتف (قراءة آلية للنص كما هو)، ومكتوبًا أيضًا.' : '، والمعنى مكتوب من التفسير كما هو.'}</p>
            </>
          )}
          {busy && <button className="btn" onClick={() => abort.current?.abort()}>إلغاء</button>}
        </div>
      )}
    </div>
  )
}
