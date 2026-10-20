// فيديو الآيات: صوت القارئ آية بآية مع نص كل آية، يُسجَّل في المتصفح نفسه (Canvas + Web Audio + MediaRecorder).
// يُسجَّل الفيديو بزمن التلاوة الفعلي، ولا يُرفع شيء إلى أي خادم.
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { ayahAudioSources, reciterById } from '../content/reciters'
import { drawStudioFrame, type StudioStyle, type Verse } from './studio'
import { toArabicDigits } from '../lib/arabic'

/** فاصل قصير بين الآيات (ثوانٍ) */
export const GAP = 0.35
export const FADE = 0.35
export const MAX_VIDEO_AYAHS = 20

/** أفضل صيغة يدعمها الجهاز: MP4 أولًا لأنها الأوسع قبولًا في تطبيقات التواصل */
export function pickVideoMime(isSupported: (t: string) => boolean = (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)): string | null {
  const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return list.find((t) => isSupported(t)) ?? null
}

export const extFor = (mime: string) => (mime.startsWith('video/mp4') ? 'mp4' : 'webm')

/** جدول التوقيت: متى تبدأ كل آية ومتى تنتهي */
export function timeline(durations: number[]): { start: number; end: number }[] {
  let t = 0
  return durations.map((d) => { const s = t; t += d + GAP; return { start: s, end: s + d } })
}

/** الآية المعروضة في لحظة ما، وشفافيتها (ظهور واختفاء تدريجي) */
export function frameAt(tl: { start: number; end: number }[], t: number): { index: number; alpha: number } {
  let i = tl.findIndex((x) => t < x.end + GAP)
  if (i < 0) i = tl.length - 1
  const { start, end } = tl[i]
  const inA = Math.min(1, Math.max(0, (t - start) / FADE))
  const outA = i === tl.length - 1 ? 1 : Math.min(1, Math.max(0, (end + GAP - t) / FADE))
  return { index: i, alpha: Math.min(inA, outA) }
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  // ما نزّله المستخدم للاستماع دون اتصال يُستخدم أولًا
  try {
    const hit = await caches?.match(url)
    if (hit && hit.type !== 'opaque') return await hit.arrayBuffer()
  } catch { /* لا يوجد تخزين */ }
  if (Capacitor.isNativePlatform()) {
    // على الهاتف يُجلب الملف عبر طبقة الشبكة الأصلية (لا قيود CORS)
    const r = await CapacitorHttp.get({ url, responseType: 'arraybuffer' })
    if (r.status >= 400) throw new Error(String(r.status))
    const bin = atob(r.data as string)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out.buffer
  }
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(String(res.status))
  return res.arrayBuffer()
}

/** تحميل تلاوة كل آية وفك ترميزها، مع تجربة المصادر البديلة */
export async function loadRecitation(actx: BaseAudioContext, reciterId: string, verses: Verse[], onProgress?: (done: number, total: number) => void): Promise<AudioBuffer[]> {
  const rec = reciterById(reciterId)
  const out: AudioBuffer[] = []
  for (const v of verses) {
    let buf: AudioBuffer | null = null
    for (const url of ayahAudioSources(rec, v.surah, v.ayah)) {
      try { buf = await actx.decodeAudioData(await fetchBytes(url)); break } catch { /* المصدر التالي */ }
    }
    if (!buf) throw new Error(`تعذر تحميل تلاوة الآية ${toArabicDigits(v.ayah)}. تحقق من الاتصال بالإنترنت، أو نزّل السورة من صفحة الاستماع ثم أعد المحاولة.`)
    out.push(buf)
    onProgress?.(out.length, verses.length)
  }
  return out
}

export interface VideoJob {
  canvas: HTMLCanvasElement
  style: StudioStyle
  verses: Verse[]
  surahName: string
  reciterName: string
  bgImage?: (CanvasImageSource & { width: number; height: number }) | null
  buffers: AudioBuffer[]
  actx: AudioContext
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/** تسجيل الفيديو بزمن التلاوة الفعلي */
export function recordVideo(job: VideoJob): Promise<Blob> {
  const mime = pickVideoMime()
  if (!mime || typeof job.canvas.captureStream !== 'function') return Promise.reject(new Error('هذا الجهاز أو المتصفح لا يدعم إنشاء الفيديو.'))
  const { canvas, actx, buffers } = job
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const tl = timeline(buffers.map((b) => b.duration))
  const total = tl[tl.length - 1].end + 0.6
  const dest = actx.createMediaStreamDestination()
  const stream = canvas.captureStream(30)
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }

  return new Promise((resolve, reject) => {
    let raf = 0
    let t0 = 0
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
      const { index, alpha } = frameAt(tl, t)
      const v = job.verses[index]
      drawStudioFrame(ctx, W, H, {
        style: job.style, bgImage: job.bgImage, zoom: 1 + 0.06 * (t / total), textAlpha: alpha, progress: Math.min(1, t / total),
        text: `${v.text} ۝${toArabicDigits(v.ayah)}`,
        reference: `سورة ${job.surahName} • الآية ${toArabicDigits(v.ayah)}`,
        subtitle: job.reciterName,
      })
      job.onProgress?.(Math.min(1, t / total))
      if (t >= total) { finish(); return }
      raf = requestAnimationFrame(draw)
    }

    actx.resume().then(() => {
      t0 = actx.currentTime + 0.25
      tl.forEach((x, i) => {
        const src = actx.createBufferSource()
        src.buffer = buffers[i]
        src.connect(dest)
        src.connect(actx.destination) // يسمع المستخدم التلاوة أثناء الإنشاء
        src.start(t0 + x.start)
        sources.push(src)
      })
      recorder.start(500)
      draw()
    }).catch(reject)
  })
}

export function reciterLabel(id: string) { return `بصوت ${reciterById(id).name}` }
