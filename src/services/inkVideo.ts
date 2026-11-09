// «التفسير المصوّر»: فيديو عمودي (ريلز/ستوري) بأسلوب «حبر وذهب».
// أعلى: الآية من المصحف كما هي بصوت القارئ. وسط: مشهد مرسوم متحرك يناسب المعنى. أسفل: المعنى من التفسير الميسر كما هو،
// ويُقرأ بصوت الهاتف إن توفر (Android). لا يُكتب أي تفسير من عند التطبيق.
import { fitText } from './studio'
import { filmTimeline, cueAt, type FilmScene } from './storyFilm'
import { pickVideoMime } from './studioVideo'
import { drawInkScene, drawPaper, INK, type ScenePick } from './inkArt'
import { toArabicDigits } from '../lib/arabic'

export const INK_W = 1080
export const INK_H = 1920
export const MAX_INK_AYAHS = 10
const QURAN = '"Amiri Quran", "Amiri", serif'
const NASKH = '"Amiri", "Noto Naskh Arabic", serif'
const UI = '"IBM Plex Sans Arabic", sans-serif'
const GOLD_DARK = '#8a6a26'

/** النص كما هو مع توحيد المسافات (الأسطر الفارغة والنقاط تبقى كلماتها) */
export const cleanMeaning = (t: string) => t.replace(/\s+/g, ' ').trim()
const CHARS_PER_PAGE = 190
/** مدة قراءة المعنى بالعين: سبع ثوانٍ لكل صفحة تقريبًا */
export const readSeconds = (text: string) => Math.max(5, Math.ceil(cleanMeaning(text).length / CHARS_PER_PAGE) * 7)

/** تقسيم المعنى إلى صفحات من خمسة أسطر بخط ثابت مقروء */
export function meaningPages(c: Pick<CanvasRenderingContext2D, 'measureText' | 'font'>, text: string, maxW: number, linesPerPage = 5): string[][] {
  const words = cleanMeaning(text).split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (line && c.measureText(t).width > maxW) { lines.push(line); line = w } else line = t }
  if (line) lines.push(line)
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage))
  return pages.length ? pages : [[]]
}

export interface InkFrameData {
  ayahText: string
  ref: string
  meaning: string
  pick: ScenePick
  /** زمن المشهد منذ بدايته (للحركة) */
  sceneTime: number
  ayahAlpha: number
  meaningAlpha: number
  /** موضع القراءة داخل المعنى 0..1 (لتقليب الصفحات) */
  meaningPos: number
  progress: number
}

function roughRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** يرسم إطارًا كاملًا من الفيديو */
export function drawInkFrame(c: CanvasRenderingContext2D, d: InkFrameData, W = INK_W, H = INK_H) {
  const k = W / INK_W
  drawPaper(c, W, H)
  c.save()
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle'
  // الشارة العلوية
  c.font = `700 ${34 * k}px ${UI}`
  const label = 'التفسير المصوّر'
  const lw = c.measureText(label).width + 60 * k
  c.fillStyle = INK; roughRect(c, (W - lw) / 2, 54 * k, lw, 62 * k, 31 * k); c.fill()
  c.fillStyle = '#e8cf8a'; c.fillText(label, W / 2, 86 * k)

  // الآية
  const top = 150 * k, boxH = 470 * k, padX = 70 * k
  const fit = fitText(c, d.ayahText, W - padX * 2, boxH, 72 * k, 34 * k, 'quran')
  if (fit) {
    c.globalAlpha = Math.max(0.28, d.ayahAlpha)
    c.fillStyle = INK
    c.font = `${fit.size}px ${QURAN}`
    const startY = top + (boxH - fit.lines.length * fit.lineH) / 2 + fit.lineH / 2
    fit.lines.forEach((l, i) => c.fillText(l, W / 2, startY + i * fit.lineH))
    c.globalAlpha = 1
  }
  c.fillStyle = GOLD_DARK
  c.font = `600 ${32 * k}px ${UI}`
  c.fillText(d.ref, W / 2, 650 * k)
  c.restore()

  // المشهد
  drawInkScene(c, 0, 690 * k, W, 640 * k, { scene: d.pick.scene, figure: d.pick.figure, t: d.sceneTime })

  // المعنى
  c.save()
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle'
  const my = 1350 * k, mh = 450 * k, mx = 60 * k, mw = W - mx * 2
  c.globalAlpha = 0.35 + 0.65 * d.meaningAlpha
  c.fillStyle = 'rgba(255,253,247,0.88)'; roughRect(c, mx, my, mw, mh, 34 * k); c.fill()
  c.strokeStyle = INK; c.lineWidth = 4 * k; c.stroke()
  c.strokeStyle = '#c9a24a'; c.lineWidth = 2 * k; roughRect(c, mx + 12 * k, my + 12 * k, mw - 24 * k, mh - 24 * k, 26 * k); c.stroke()
  c.fillStyle = GOLD_DARK; c.font = `700 ${30 * k}px ${UI}`
  c.fillText('المعنى — التفسير الميسر', W / 2, my + 52 * k)
  c.globalAlpha = Math.max(0.15, d.meaningAlpha)
  // قصير: أكبر خط يتسع؛ طويل: صفحات بخط ثابت تتقلب أثناء القراءة
  const innerW = mw - 80 * k, innerH = mh - 120 * k
  const mf = cleanMeaning(d.meaning).length <= CHARS_PER_PAGE ? fitText(c, cleanMeaning(d.meaning), innerW, innerH, 46 * k, 30 * k, 'naskh') : null
  c.fillStyle = INK
  if (mf) {
    c.font = `${mf.size}px ${NASKH}`
    const sy = my + 92 * k + (innerH - mf.lines.length * mf.lineH) / 2 + mf.lineH / 2
    mf.lines.forEach((l, i) => c.fillText(l, W / 2, sy + i * mf.lineH))
  } else {
    c.font = `${36 * k}px ${NASKH}`
    const pages = meaningPages(c, d.meaning, innerW)
    const pi = Math.min(pages.length - 1, Math.floor(d.meaningPos * pages.length))
    const lh = innerH / 5
    pages[pi].forEach((l, i) => c.fillText(l, W / 2, my + 92 * k + lh / 2 + i * lh))
    if (pages.length > 1) { c.fillStyle = GOLD_DARK; c.font = `600 ${22 * k}px ${UI}`; c.fillText(`${toArabicDigits(pi + 1)} / ${toArabicDigits(pages.length)}`, mx + 70 * k, my + 52 * k) }
  }
  c.globalAlpha = 1
  // التذييل وشريط التقدم
  c.fillStyle = INK; c.font = `600 ${28 * k}px ${UI}`
  c.fillText('رفيق المسلم • صدقة جارية', W / 2, 1858 * k)
  c.fillStyle = 'rgba(31,43,42,0.15)'; c.fillRect(mx, 1822 * k, mw, 6 * k)
  c.fillStyle = '#c9a24a'; c.fillRect(mx + mw * (1 - d.progress), 1822 * k, mw * d.progress, 6 * k)
  c.restore()
}

export const ayahLine = (verses: (a: number) => string, ayahs: number[]) => ayahs.map((a) => `${verses(a)} ۝${toArabicDigits(a)}`).join(' ')
export const refLine = (surahName: string, ayahs: number[]) => `سورة ${surahName} • ${ayahs.length === 1 ? `الآية ${toArabicDigits(ayahs[0])}` : `الآيات ${toArabicDigits(ayahs[0])}–${toArabicDigits(ayahs[ayahs.length - 1])}`}`

/** جدول الفيديو: التلاوة، ثم المعنى بمدة صوته أو بمدة قراءته بالعين */
export function inkTimeline(scenes: FilmScene[], ayahSeconds: (a: number) => number, narration?: (AudioBuffer | null)[]) {
  return filmTimeline(scenes, ayahSeconds, (i) => narration?.[i]?.duration ?? readSeconds(scenes[i].text) - 0.8)
}

/** حالة الإطار عند الزمن t من الجدول */
export function frameAt(scenes: FilmScene[], picks: ScenePick[], verses: (a: number) => string, surahName: string, tl: ReturnType<typeof filmTimeline>, t: number): InkFrameData {
  const total = tl[tl.length - 1].end
  const { cue, fade } = cueAt(tl, t)
  const sc = scenes[cue.scene]
  const all = Array.from({ length: sc.to - sc.from + 1 }, (_, i) => sc.from + i)
  const shown = cue.kind === 'ayah' ? [cue.ayah] : all
  const sceneStart = tl.find((x) => x.scene === cue.scene)!.start
  return {
    ayahText: ayahLine(verses, shown), ref: refLine(surahName, shown), meaning: sc.text, pick: picks[cue.scene],
    sceneTime: t - sceneStart, ayahAlpha: cue.kind === 'ayah' ? fade : 0.45, meaningAlpha: cue.kind === 'meaning' ? fade : 0,
    meaningPos: cue.kind === 'meaning' ? Math.max(0, Math.min(0.999, (t - cue.start) / (cue.end - cue.start))) : 0, progress: Math.min(1, t / total),
  }
}

export interface InkRunJob {
  canvas: HTMLCanvasElement
  scenes: FilmScene[]
  picks: ScenePick[]
  verses: (a: number) => string
  surahName: string
  buffers: Map<number, AudioBuffer>
  narration?: (AudioBuffer | null)[]
  actx: AudioContext
  /** true: يُسجَّل فيديو ويُعاد ملفه؛ false: تشغيل للمعاينة فقط */
  record: boolean
  onProgress?: (p: number) => void
  signal?: AbortSignal
}

/** تشغيل الفيديو بزمنه الفعلي مع الصوت، وتسجيله إن طُلب */
export function runInkVideo(job: InkRunJob): Promise<Blob | null> {
  const { canvas, actx } = job
  const mime = job.record ? pickVideoMime() : null
  if (job.record && (!mime || typeof canvas.captureStream !== 'function')) return Promise.reject(new Error('هذا الجهاز أو المتصفح لا يدعم إنشاء الفيديو.'))
  const ctx = canvas.getContext('2d')!
  const tl = inkTimeline(job.scenes, (a) => job.buffers.get(a)?.duration ?? 4, job.narration)
  const total = tl[tl.length - 1].end + 0.8
  const dest = actx.createMediaStreamDestination()
  const stream = job.record ? canvas.captureStream(30) : null
  stream && dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
  const recorder = stream && mime ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 }) : null
  const chunks: Blob[] = []
  if (recorder) recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  return new Promise((resolve, reject) => {
    let raf = 0, t0 = 0, done = false
    const sources: AudioBufferSourceNode[] = []
    const end = () => {
      if (done) return
      done = true
      cancelAnimationFrame(raf)
      sources.forEach((s) => { try { s.stop() } catch { /* انتهى */ } })
      if (recorder && recorder.state !== 'inactive') recorder.stop()
      else resolve(null)
    }
    if (recorder) {
      recorder.onstop = () => {
        stream!.getTracks().forEach((t) => t.stop())
        if (job.signal?.aborted) reject(new DOMException('أُلغي', 'AbortError'))
        else resolve(new Blob(chunks, { type: mime!.split(';')[0] }))
      }
      recorder.onerror = () => reject(new Error('تعذر تسجيل الفيديو'))
    }
    job.signal?.addEventListener('abort', end)
    const draw = () => {
      const t = Math.max(0, actx.currentTime - t0)
      drawInkFrame(ctx, frameAt(job.scenes, job.picks, job.verses, job.surahName, tl, t), canvas.width, canvas.height)
      job.onProgress?.(Math.min(1, t / total))
      if (t >= total) { end(); return }
      raf = requestAnimationFrame(draw)
    }
    actx.resume().then(() => {
      t0 = actx.currentTime + 0.25
      for (const cue of tl) {
        const buf = cue.kind === 'ayah' ? job.buffers.get(cue.ayah) : job.narration?.[cue.scene] ?? null
        if (!buf) continue
        const src = actx.createBufferSource()
        src.buffer = buf
        if (job.record) src.connect(dest)
        src.connect(actx.destination)
        src.start(t0 + cue.start)
        sources.push(src)
      }
      recorder?.start(500)
      draw()
    }).catch(reject)
  })
}

/** فك صوت WAV (Base64) من محرك الكلام */
export async function decodeBase64Audio(actx: BaseAudioContext, b64: string): Promise<AudioBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return actx.decodeAudioData(out.buffer)
}

/** مقاطع التفسير داخل المدى المختار (تُقص المقاطع التي تتجاوزه) */
export function clipSegments(groups: { from: number; to: number; text: string }[], from: number, to: number): FilmScene[] {
  return groups.filter((g) => g.to >= from && g.from <= to).map((g) => ({ from: Math.max(g.from, from), to: Math.min(g.to, to), text: g.text }))
}
