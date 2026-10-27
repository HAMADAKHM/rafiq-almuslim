// التسجيل الصوتي للتفسير الميسَّر من مجمع الملك فهد لطباعة المصحف الشريف (قراءة د. علي عطيف)، آيةً آية.
// الترخيص (صفحة «الكتب الصوتية» في موقع المجمع، «حقوق الاستخدام»): إتاحة النسخ الرقمية للاستخدام العام مجانًا
// في التطبيقات الحاسوبية ومواقع الإنترنت، داخل المملكة وخارجها.
// الملف الرسمي حزمة ZIP واحدة (743 م.ب، 6352 ملفًا). لا نعيد استضافته: نقرأ فهرسه مرة واحدة، ثم نطلب
// ملف الآية المطلوبة وحده من الحزمة نفسها بطلب جزئي (HTTP Range)، ونحفظه على الجهاز للاستماع دون إنترنت.
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { kv } from '../db/repos'

export const TAFSIR_AUDIO_ZIP = 'https://download.qurancomplex.gov.sa/new-sounds/TafseerMuyassar/TafseerMuyassar-ayat.zip'
export const TAFSIR_AUDIO_SIZE = 743_525_665
export const TAFSIR_AUDIO_CREDIT = 'التسجيل الصوتي للتفسير الميسَّر — مجمع الملك فهد لطباعة المصحف الشريف، قراءة د. علي عطيف'
/** التسجيل للتفسير الميسَّر فقط (لا يطابق نص المختصر) */
export const TAFSIR_AUDIO_EDITION = 'ar-tafsir-muyassar'
const INDEX_KEY = 'tafsirAudio:index:v1'
const fileKey = (s: number, a: number) => `tafsirAudio:${s}:${a}`

export interface ZipEntry { off: number; csize: number; size: number; method: number }
export type ZipIndex = Record<string, ZipEntry>

/** متاح فقط في التطبيق على الهاتف (خادم المجمع لا يسمح بالطلب من صفحات الويب) */
export const tafsirAudioSupported = () => Capacitor.isNativePlatform() && typeof DecompressionStream !== 'undefined'

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function range(start: number, end: number): Promise<Uint8Array> {
  const r = await CapacitorHttp.get({ url: TAFSIR_AUDIO_ZIP, headers: { Range: `bytes=${start}-${end}` }, responseType: 'arraybuffer', connectTimeout: 15000, readTimeout: 60000 })
  if (r.status !== 206 && r.status !== 200) throw new Error(`HTTP ${r.status}`)
  const data = r.data as unknown
  return typeof data === 'string' ? b64ToBytes(data) : new Uint8Array(data as ArrayBuffer)
}

const u16 = (b: Uint8Array, p: number) => b[p] | (b[p + 1] << 8)
const u32 = (b: Uint8Array, p: number) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0

/** «10-001001-104.mp3» → السورة 1 الآية 1 (ملفات «A00» مقدمات السور و«L» المقدمة: لا تُفهرس) */
export function parseEntryName(name: string): { surah: number; ayah: number } | null {
  const m = /(?:^|\/)\d+-(\d{3})(\d{3})-\d+\.mp3$/i.exec(name)
  if (!m) return null
  const surah = Number(m[1]), ayah = Number(m[2])
  return surah >= 1 && surah <= 114 && ayah >= 1 ? { surah, ayah } : null
}

/** يحلل الفهرس المركزي لملف ZIP */
export function parseCentralDirectory(cd: Uint8Array): ZipIndex {
  const out: ZipIndex = {}
  const dec = new TextDecoder()
  let p = 0
  while (p + 46 <= cd.length && u32(cd, p) === 0x02014b50) {
    const method = u16(cd, p + 10), csize = u32(cd, p + 20), size = u32(cd, p + 24)
    const fl = u16(cd, p + 28), el = u16(cd, p + 30), cl = u16(cd, p + 32), off = u32(cd, p + 42)
    const ref = parseEntryName(dec.decode(cd.subarray(p + 46, p + 46 + fl)))
    if (ref) out[`${ref.surah}:${ref.ayah}`] = { off, csize, size, method }
    p += 46 + fl + el + cl
  }
  return out
}

/** يجد نهاية الملف (EOCD) ويعيد موضع الفهرس المركزي وحجمه */
export function findEocd(tail: Uint8Array): { cdOff: number; cdSize: number } | null {
  for (let i = tail.length - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) return { cdSize: u32(tail, i + 12), cdOff: u32(tail, i + 16) }
  }
  return null
}

let indexPromise: Promise<ZipIndex> | null = null
export function loadIndex(): Promise<ZipIndex> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const cached = await kv.get<ZipIndex | null>(INDEX_KEY, null)
      if (cached && Object.keys(cached).length > 6000) return cached
      const tail = await range(TAFSIR_AUDIO_SIZE - 65_536, TAFSIR_AUDIO_SIZE - 1)
      const e = findEocd(tail)
      if (!e) throw new Error('تعذر قراءة فهرس التسجيلات')
      const idx = parseCentralDirectory(await range(e.cdOff, e.cdOff + e.cdSize - 1))
      if (Object.keys(idx).length < 6000) throw new Error('فهرس التسجيلات غير مكتمل')
      await kv.set(INDEX_KEY, idx)
      return idx
    })().catch((err) => { indexPromise = null; throw err })
  }
  return indexPromise
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** يستخرج بيانات ملف من «رأسه المحلي» + المحتوى */
export async function extractLocal(buf: Uint8Array, e: ZipEntry): Promise<Uint8Array> {
  if (u32(buf, 0) !== 0x04034b50) throw new Error('ملف غير صالح')
  const start = 30 + u16(buf, 26) + u16(buf, 28)
  const raw = buf.subarray(start, start + e.csize)
  if (e.method === 0) return raw
  if (e.method === 8) return inflateRaw(raw)
  throw new Error('ضغط غير مدعوم')
}

/** تسجيل تفسير الآية (Blob) — من الجهاز إن حُفظ سابقًا، وإلا من حزمة المجمع ثم يُحفظ */
export async function tafsirAyahAudio(surah: number, ayah: number): Promise<Blob | null> {
  const saved = await kv.get<Blob | null>(fileKey(surah, ayah), null)
  if (saved) return saved
  if (!tafsirAudioSupported()) return null
  const idx = await loadIndex()
  const e = idx[`${surah}:${ayah}`]
  if (!e) return null
  // الرأس المحلي 30 بايت + الاسم (قرابة 60) + حقل إضافي محتمل: هامش 512 بايت
  const buf = await range(e.off, e.off + 30 + 512 + e.csize)
  const bytes = await extractLocal(buf, e)
  const blob = new Blob([bytes as BlobPart], { type: 'audio/mpeg' })
  await kv.set(fileKey(surah, ayah), blob).catch(() => {})
  return blob
}

/** تشغيل تسجيل الآية حتى نهايته (أو الإيقاف) */
export function playBlob(blob: Blob, holder: { current: HTMLAudioElement | null }, alive: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (!alive()) return resolve()
    const url = URL.createObjectURL(blob)
    const el = new Audio(url)
    holder.current = el
    const done = () => { URL.revokeObjectURL(url); resolve() }
    el.onended = done
    el.onerror = done
    el.onpause = () => { if (!alive()) done() }
    el.play().catch(done)
  })
}
