// «وضع الفيلم» للتفسير كالقصة (رفيق بلس): مشاهد متحركة مرسومة بالشيفرة (بحر، نجوم، جبال، جنات…)،
// تظهر الآية مع تلاوة القارئ، ثم معناها من التفسير المعتمد كما هو. يُعرض في التطبيق، ويُحفظ فيديو.
// في الفيديو: صوت القارئ، ثم صوت قراءة المعنى (يُحوَّل إلى ملف بمحرك الكلام في الهاتف على Android)، والمعنى مكتوبًا أيضًا.
import { drawStudioFrame, fitText, type StudioStyle } from './studio'
import { suggestTheme, type ThemeId } from './sceneThemes'
import { pickVideoMime } from './studioVideo'
import { toArabicDigits } from '../lib/arabic'
import type { PaintTone } from '../components/Scene'

export interface FilmScene { from: number; to: number; text: string }

const TONE_THEME: Record<PaintTone, ThemeId> = { dawn: 'dawn', day: 'garden', sunset: 'mountains', night: 'stars' }

/** خلفية المشهد بحسب كلماته (البحر لقصة نوح ويونس، والنجوم لليل…)، وإلا فبحسب لون القصة */
export function sceneTheme(text: string, tone: PaintTone): ThemeId {
  return suggestTheme(text)?.theme ?? TONE_THEME[tone]
}

/** مدة عرض المعنى بعد التلاوة: بقدر طوله (للقراءة بهدوء) */
export const meaningSeconds = (text: string) => Math.min(16, Math.max(4, 2.5 + text.length * 0.06))
const GAP = 0.4

export type FilmCue = { scene: number; kind: 'ayah'; ayah: number; start: number; end: number } | { scene: number; kind: 'meaning'; start: number; end: number }

/** جدول الفيلم: كل آية بمدة تلاوتها، ثم المعنى */
export function filmTimeline(scenes: FilmScene[], ayahSeconds: (surahAyah: number) => number, meaningOf: (scene: number) => number | null = () => null): FilmCue[] {
  const out: FilmCue[] = []
  let t = 0
  scenes.forEach((s, i) => {
    for (let a = s.from; a <= s.to; a++) { const d = ayahSeconds(a); out.push({ scene: i, kind: 'ayah', ayah: a, start: t, end: t + d }); t += d + GAP }
    // مع صوت المعنى: يبقى ظاهرًا مدة قراءته (ولا يقل عن مدة قراءته بالعين)
    const spoken = meaningOf(i)
    const m = spoken != null ? Math.max(spoken + 0.8, 3) : meaningSeconds(s.text)
    out.push({ scene: i, kind: 'meaning', start: t, end: t + m }); t += m + GAP
  })
  return out
}

export function cueAt(tl: FilmCue[], t: number): { cue: FilmCue; fade: number } {
  const i = tl.findIndex((c) => t < c.end + GAP)
  const cue = tl[i === -1 ? tl.length - 1 : i]
  const fade = Math.min(1, Math.max(0, (t - cue.start) / 0.5), Math.max(0, (cue.end + GAP - t) / 0.5))
  return { cue, fade }
}

export interface FilmFrame {
  theme: ThemeId
  format: 'story' | 'landscape' | 'square'
  ayahText: string
  ref: string
  meaning: string
  /** 0..1: ظهور الآية، وظهور المعنى */
  ayahAlpha: number
  meaningAlpha: number
  time: number
  progress: number
  subtitle?: string
}

/** يرسم إطارًا من الفيلم: الخلفية المتحركة والآية، ثم لوحة المعنى في الأسفل */
export function drawFilmFrame(ctx: CanvasRenderingContext2D, W: number, H: number, f: FilmFrame) {
  const style: StudioStyle = { format: f.format, bg: `theme-${f.theme}`, textScale: 1, showRef: true, showBrand: true }
  drawStudioFrame(ctx, W, H, { style, text: f.ayahText, reference: f.ref, textAlpha: f.ayahAlpha, zoom: 1 + 0.05 * f.progress, progress: f.progress, time: f.time, subtitle: f.subtitle })
  if (f.meaningAlpha <= 0.01) return
  const pad = Math.round(W * 0.06)
  const boxW = W - pad * 2
  const wide = f.format === 'landscape'
  const boxH = Math.round(H * (f.format === 'story' ? 0.34 : wide ? 0.36 : 0.4))
  const y = H - boxH - Math.round(H * 0.07)
  ctx.save()
  ctx.globalAlpha = f.meaningAlpha
  ctx.fillStyle = 'rgba(4, 22, 18, 0.78)'
  const r = Math.round(W * 0.03)
  ctx.beginPath()
  ctx.moveTo(pad + r, y); ctx.arcTo(pad + boxW, y, pad + boxW, y + boxH, r); ctx.arcTo(pad + boxW, y + boxH, pad, y + boxH, r); ctx.arcTo(pad, y + boxH, pad, y, r); ctx.arcTo(pad, y, pad + boxW, y, r)
  ctx.fill()
  ctx.strokeStyle = 'rgba(226, 194, 126, 0.55)'; ctx.lineWidth = Math.max(2, W * 0.002); ctx.stroke()
  ctx.fillStyle = '#E2C27E'
  ctx.font = `600 ${Math.round(W * (wide ? 0.016 : 0.03))}px "IBM Plex Sans Arabic", sans-serif`
  ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'top'
  ctx.fillText('المعنى', W / 2, y + Math.round(boxH * 0.06))
  const inner = Math.round(boxH * (wide ? 0.24 : 0.2))
  const fit = fitText(ctx, f.meaning, boxW - pad, boxH - inner - pad / 2, Math.round(W * (wide ? 0.026 : 0.045)), Math.round(W * (wide ? 0.013 : 0.022)), 'naskh')
  if (fit) {
    ctx.fillStyle = '#F6EFDC'
    ctx.font = `${fit.size}px "Amiri", "Noto Naskh Arabic", serif`
    fit.lines.forEach((line, k) => ctx.fillText(line, W / 2, y + inner + k * fit.lineH))
  }
  ctx.restore()
}

export interface StoryVideoJob {
  canvas: HTMLCanvasElement
  format: FilmFrame['format']
  scenes: FilmScene[]
  themes: ThemeId[]
  verses: (ayah: number) => string
  surahName: string
  reciterName: string
  /** تلاوة كل آية بالترتيب (ayah → buffer) */
  buffers: Map<number, AudioBuffer>
  /** صوت قراءة المعنى لكل مشهد (إن توفر محرك كلام عربي) */
  narration?: (AudioBuffer | null)[]
  actx: AudioContext
  onProgress?: (p: number) => void
  signal?: AbortSignal
}

/** تسجيل فيديو القصة بزمنه الفعلي: الخلفية المتحركة، والآيات بصوت القارئ، والمعنى مكتوبًا */
export function recordStoryVideo(job: StoryVideoJob): Promise<Blob> {
  const mime = pickVideoMime()
  if (!mime || typeof job.canvas.captureStream !== 'function') return Promise.reject(new Error('هذا الجهاز أو المتصفح لا يدعم إنشاء الفيديو.'))
  const { canvas, actx } = job
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const tl = filmTimeline(job.scenes, (a) => job.buffers.get(a)?.duration ?? 4, (i) => job.narration?.[i]?.duration ?? null)
  const total = tl[tl.length - 1].end + 0.8
  const dest = actx.createMediaStreamDestination()
  const stream = canvas.captureStream(30)
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  return new Promise((resolve, reject) => {
    let raf = 0, t0 = 0
    const sources: AudioBufferSourceNode[] = []
    const finish = () => { cancelAnimationFrame(raf); if (recorder.state !== 'inactive') recorder.stop() }
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      if (job.signal?.aborted) reject(new DOMException('أُلغي', 'AbortError'))
      else resolve(new Blob(chunks, { type: mime.split(';')[0] }))
    }
    recorder.onerror = () => reject(new Error('تعذر تسجيل الفيديو'))
    job.signal?.addEventListener('abort', () => { sources.forEach((s) => { try { s.stop() } catch { /* انتهى */ } }); finish() })
    const draw = () => {
      const t = Math.max(0, actx.currentTime - t0)
      const { cue, fade } = cueAt(tl, t)
      const sc = job.scenes[cue.scene]
      const ayahs = Array.from({ length: sc.to - sc.from + 1 }, (_, k) => sc.from + k)
      const shown = cue.kind === 'ayah' ? [cue.ayah] : ayahs
      drawFilmFrame(ctx, W, H, {
        theme: job.themes[cue.scene], format: job.format, time: t, progress: Math.min(1, t / total),
        ayahText: shown.map((a) => `${job.verses(a)} ۝${toArabicDigits(a)}`).join(' '),
        ref: `سورة ${job.surahName} • ${shown.length === 1 ? `الآية ${toArabicDigits(shown[0])}` : `الآيات ${toArabicDigits(shown[0])}–${toArabicDigits(shown[shown.length - 1])}`}`,
        meaning: sc.text, ayahAlpha: cue.kind === 'ayah' ? fade : 0.3, meaningAlpha: cue.kind === 'meaning' ? fade : 0, subtitle: job.reciterName,
      })
      job.onProgress?.(Math.min(1, t / total))
      if (t >= total) { finish(); return }
      raf = requestAnimationFrame(draw)
    }
    actx.resume().then(() => {
      t0 = actx.currentTime + 0.25
      for (const c of tl) {
        const buf = c.kind === 'ayah' ? job.buffers.get(c.ayah) : job.narration?.[c.scene] ?? null
        if (!buf) continue
        const src = actx.createBufferSource()
        src.buffer = buf
        src.connect(dest); src.connect(actx.destination)
        src.start(t0 + c.start)
        sources.push(src)
      }
      recorder.start(500)
      draw()
    }).catch(reject)
  })
}
