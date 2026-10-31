// «التحكم بالتلفاز» من رفيق المسلم بلس: الربط برمز يظهر على الشاشة، ثم أوامر موقّعة.
// البروتوكول يطابق android-tv/.../RemoteCore.java (واختبار التوافق في الطرفين بقيم مرجعية واحدة):
//   K = SHA-256(code|pn|tn) ، proof = HMAC(K, "pair|"+name) ، السر = AES-GCM(K)
//   كل طلب: HMAC(token, METHOD\nPATH\nTIME\nSHA256hex(body)) في الترويسات X-Rafiq-*
// الرمز لا يُرسل في الشبكة، والمفتاح السري يبقى على الجهاز فقط.
import { kv } from '../db/repos'

/** النسخة الجديدة: هوية تطبيق الشاشة واسم ملف تحديثه (مختلفان عن النسخة الأصلية) */
export const TV_APP_ID = 'rafiq-tv-new'
export const TV_UPDATE_ASSET = 'RafiqAlMuslimTVNew.apk'

export interface PairedTv { tvId: string; name: string; host: string; port: number; deviceId: string; token: string; pairedAt: number }
export interface TvSettingsView {
  scene?: string; playlist?: string[]; rotateMin?: number; shuffle?: boolean; quality?: 'auto' | 'eco' | 'high'; animate?: boolean
  adhan?: boolean; hour12?: boolean; reciteOn?: boolean; reciteVolume?: number; clockShift?: number; city?: string
  idleMinutes?: number; idleTakeover?: boolean; autostart?: boolean
  reciteMode?: 'ayah' | 'surah' | 'adhkar'; reciterId?: string; adhkarVoice?: 'human' | 'mixed'; phrases?: boolean; galleryCat?: 'all' | 'islamic' | 'nature' | 'sport' | 'clubs' | 'space' | 'other'
}

/** وسيلة الإرسال (TvLink في التطبيق، ومحاكاة في الاختبارات) */
export type Transport = (o: { host: string; port: number; method: string; path: string; body?: string; headers?: Record<string, string>; timeoutMs?: number }) => Promise<{ status: number; body: string }>

const KEY = 'tvremote:tvs'
const te = new TextEncoder()

export const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
export const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const hex = (u: Uint8Array) => [...u].map((x) => x.toString(16).padStart(2, '0')).join('')

async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? te.encode(data) : (data as BufferSource)))
}
async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, te.encode(msg)))
}

export const pairKey = (code: string, pn: string, tn: string) => sha256(`${code}|${pn}|${tn}`)
export async function pairProof(key: Uint8Array, name: string) { return b64(await hmac(key, `pair|${name}`)) }

export async function signRequest(token: string, method: string, path: string, time: number, body: string): Promise<string> {
  const bodyHash = hex(await sha256(te.encode(body)))
  return b64(await hmac(unb64(token), `${method.toUpperCase()}\n${path}\n${time}\n${bodyHash}`))
}

export async function decryptSecret(key: Uint8Array, iv: string, ct: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['decrypt'])
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) as BufferSource }, k, unb64(ct) as BufferSource))
}

export class TvRemoteError extends Error {
  code: string
  constructor(code: string, msg: string) { super(msg); this.code = code }
}

function parse(body: string): Record<string, unknown> {
  try { return JSON.parse(body || '{}') as Record<string, unknown> } catch { return {} }
}

const MESSAGES: Record<string, string> = {
  pairing_closed: 'الربط غير مفتوح على التلفاز: افتح «الإعدادات ← التحكم من الجوال ← ربط جوال جديد» ثم أعد المحاولة.',
  wrong_code: 'الرمز غير صحيح. تأكد من الأرقام الظاهرة على التلفاز (بعد 5 محاولات خاطئة يلزم رمز جديد).',
  unknown_session: 'انتهت جلسة الربط. أعد المحاولة.',
  unauthorized: 'هذا الجوال لم يعد مرتبطًا بالتلفاز (ربما أُزيل من التلفاز). اربطه من جديد.',
  bad_image: 'الملف ليس صورة صالحة (JPG أو PNG).',
  too_large: 'الصورة كبيرة جدًا حتى بعد تصغيرها. جرّب صورة أخرى.',
  too_many: 'وصلت إلى الحد الأقصى (12 صورة) على التلفاز. احذف صورة ثم أضف غيرها.',
  write_failed: 'تعذر حفظ الصورة على التلفاز (ربما امتلأت مساحته).',
  not_found: 'تطبيق الشاشة على التلفاز قديم: حدّثه إلى آخر نسخة لتعمل هذه الميزة.',
  needs_permission: 'على التلفاز ظهرت شاشة «السماح بالتثبيت من هذا التطبيق»: فعّلها بجهاز التحكم، ثم اضغط «تحديث» مرة أخرى.',
  busy: 'التحديث جارٍ بالفعل على التلفاز.',
  bad_url: 'رابط التحديث غير مقبول.',
  unreachable: 'تعذر الوصول إلى التلفاز. تأكد أن الجوال والتلفاز على شبكة الواي فاي نفسها وأن تطبيق الشاشة مثبت.',
}
export const remoteMessage = (code: string) => MESSAGES[code] ?? (code.startsWith('invalid') ? 'قيمة غير مقبولة.' : 'حدث خطأ غير متوقع.')

/** الربط: يعيد التلفاز المحفوظ بعد نجاحه */
export async function pairTv(send: Transport, host: string, port: number, code: string, phoneName: string): Promise<PairedTv> {
  const clean = code.replace(/\D/g, '')
  if (clean.length !== 6) throw new TvRemoteError('wrong_code', remoteMessage('wrong_code'))
  const pn = b64(crypto.getRandomValues(new Uint8Array(16)))
  const call = async (path: string, body: object) => {
    let r: { status: number; body: string }
    try { r = await send({ host, port, method: 'POST', path, body: JSON.stringify(body) }) } catch { throw new TvRemoteError('unreachable', remoteMessage('unreachable')) }
    const j = parse(r.body)
    if (r.status !== 200) { const c = String(j.error ?? 'error'); throw new TvRemoteError(c, remoteMessage(c)) }
    return j
  }
  const start = await call('/pair/start', { pn, name: phoneName })
  const tn = String(start.tn ?? '')
  const key = await pairKey(clean, pn, tn)
  const fin = await call('/pair/finish', { pn, tn, name: phoneName, proof: await pairProof(key, phoneName) })
  const secret = JSON.parse(await decryptSecret(key, String(fin.iv), String(fin.ct))) as { token: string; deviceId: string; tvId: string; tvName: string }
  const tv: PairedTv = { tvId: secret.tvId, name: secret.tvName, host, port, deviceId: secret.deviceId, token: secret.token, pairedAt: Date.now() }
  await saveTv(tv)
  return tv
}

/** آخر وقت مرسل (ميلي ثانية) — يجب أن يتزايد دائمًا حتى لا يرفضه التلفاز كإعادة إرسال */
let lastTime = 0
export async function signedCall(send: Transport, tv: PairedTv, method: 'GET' | 'POST', path: string, body?: object, timeoutMs?: number): Promise<Record<string, unknown>> {
  const text = body ? JSON.stringify(body) : ''
  const time = Math.max(Date.now(), lastTime + 1)
  lastTime = time
  const sig = await signRequest(tv.token, method, path, time, text)
  let r: { status: number; body: string }
  try {
    r = await send({ host: tv.host, port: tv.port, method, path, body: text, headers: { 'X-Rafiq-Device': tv.deviceId, 'X-Rafiq-Time': String(time), 'X-Rafiq-Sig': sig }, ...(timeoutMs ? { timeoutMs } : {}) })
  } catch { throw new TvRemoteError('unreachable', remoteMessage('unreachable')) }
  const j = parse(r.body)
  if (r.status !== 200) { const c = String(j.error ?? 'error'); throw new TvRemoteError(c, remoteMessage(c)) }
  return j
}

export async function getTvSettings(send: Transport, tv: PairedTv): Promise<TvSettingsView> {
  return ((await signedCall(send, tv, 'GET', '/settings')).settings ?? {}) as TvSettingsView
}
export async function setTvSettings(send: Transport, tv: PairedTv, patch: Partial<TvSettingsView>): Promise<TvSettingsView> {
  const { city: _c, ...clean } = patch
  void _c
  return ((await signedCall(send, tv, 'POST', '/settings', clean)).settings ?? {}) as TvSettingsView
}
/** خلفيات الشاشة من صور المستخدم (تُحفظ على التلفاز فقط) */
export interface TvBackground { id: string; at: number; size: number }
export const MAX_TV_BACKGROUNDS = 12
const items = (j: Record<string, unknown>) => (Array.isArray(j.items) ? j.items : []) as TvBackground[]
export async function listTvBackgrounds(send: Transport, tv: PairedTv): Promise<TvBackground[]> {
  return items(await signedCall(send, tv, 'GET', '/backgrounds'))
}
/** data: صورة JPEG أو PNG بترميز Base64 (بعد التصغير بـ prepareBackground) */
export async function addTvBackground(send: Transport, tv: PairedTv, data: string): Promise<TvBackground[]> {
  return items(await signedCall(send, tv, 'POST', '/backgrounds', { data }, 15000))
}
export async function removeTvBackground(send: Transport, tv: PairedTv, id: string): Promise<TvBackground[]> {
  return items(await signedCall(send, tv, 'POST', '/backgrounds/delete', { id }))
}

/** أبعاد الصورة بعد التصغير لشاشة التلفاز: الضلع الأطول 1920 بكسل على الأكثر، دون تكبير */
export function fitSize(w: number, h: number, max = 1920): { w: number; h: number } {
  if (!(w > 0 && h > 0)) return { w: 0, h: 0 }
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

/** حد حجم الصورة المرسلة (يطابق MAX_IMAGE_BYTES في RemoteCore.java مع هامش) */
export const MAX_BACKGROUND_BYTES = 2_400_000

/** يصغّر الصورة ويحوّلها إلى JPEG بـ Base64 (بلا ترويسة data:) */
export async function prepareBackground(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new TvRemoteError('bad_image', remoteMessage('bad_image'))); i.src = url })
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight)
    if (!w) throw new TvRemoteError('bad_image', remoteMessage('bad_image'))
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new TvRemoteError('bad_image', remoteMessage('bad_image'))
    ctx.drawImage(img, 0, 0, w, h)
    for (const q of [0.85, 0.72, 0.6]) {
      const data = c.toDataURL('image/jpeg', q).split(',')[1] ?? ''
      if (data && (data.length * 3) / 4 <= MAX_BACKGROUND_BYTES) return data
    }
    throw new TvRemoteError('too_large', remoteMessage('too_large'))
  } finally { URL.revokeObjectURL(url) }
}

/** أوامر التلفاز: إيقاف الأذان وفتح الشاشة والمشهد التالي، وأزرار جهاز التحكم ومستوى الصوت */
export type TvActionName = 'stop_adhan' | 'open_screen' | 'next_scene' | 'key_up' | 'key_down' | 'key_left' | 'key_right' | 'key_ok' | 'key_back' | 'vol_up' | 'vol_down' | 'vol_mute'
export async function tvAction(send: Transport, tv: PairedTv, action: TvActionName): Promise<boolean> {
  return !!(await signedCall(send, tv, 'POST', '/action', { action })).ok
}
export async function unpairTv(send: Transport, tv: PairedTv) {
  try { await signedCall(send, tv, 'POST', '/unpair') } catch { /* يُحذف محليًا على أي حال */ }
  await removeTv(tv.tvId)
}

/** التلفاز يرد (للحالة: متصل/غير متصل) */
export interface TvVersion { code: number; name?: string; update?: string }
export async function pingTv(send: Transport, host: string, port: number): Promise<{ tvId: string; name: string; pairing: boolean; version?: TvVersion } | null> {
  try {
    const r = await send({ host, port, method: 'GET', path: '/info' })
    const j = parse(r.body)
    const v = j.version as TvVersion | undefined
    return r.status === 200 && j.app === TV_APP_ID ? { tvId: String(j.tvId), name: String(j.name), pairing: !!j.pairing, version: v && typeof v.code === 'number' ? v : undefined } : null
  } catch { return null }
}

// ---------- تحديث تطبيق الشاشة من الجوال ----------
export const RELEASES_API = 'https://api.github.com/repos/HAMADAKHM/rafiq-almuslim/releases?per_page=10'
export interface TvRelease { build: number; url: string; tag: string }
/** أحدث إصدار منشور فيه تطبيق الشاشة (رقم البناء = رقم إصدار التطبيق على التلفاز) */
export function pickTvRelease(list: unknown): TvRelease | null {
  if (!Array.isArray(list)) return null
  let best: TvRelease | null = null
  for (const r of list as { tag_name?: string; draft?: boolean; assets?: { name?: string; browser_download_url?: string }[] }[]) {
    if (r.draft) continue
    const m = /build\.(\d+)/.exec(r.tag_name ?? '')
    const a = r.assets?.find((x) => x.name === TV_UPDATE_ASSET)
    if (!m || !a?.browser_download_url) continue
    const build = Number(m[1])
    if (!best || build > best.build) best = { build, url: a.browser_download_url, tag: r.tag_name! }
  }
  return best
}
export async function latestTvRelease(fetcher: typeof fetch = fetch): Promise<TvRelease | null> {
  try {
    const r = await fetcher(RELEASES_API, { headers: { accept: 'application/vnd.github+json' } })
    return r.ok ? pickTvRelease(await r.json()) : null
  } catch { return null }
}
/** يطلب من التلفاز تنزيل التحديث وعرض طلب التثبيت عليه */
export async function updateTv(send: Transport, tv: PairedTv, url: string): Promise<TvVersion | null> {
  return ((await signedCall(send, tv, 'POST', '/update', { url })).version as TvVersion) ?? null
}
export const UPDATE_STATE_LABEL = (st?: string): string => {
  if (!st || st === 'idle') return ''
  if (st.startsWith('downloading')) return `جارٍ التنزيل على التلفاز… ${st.split(':')[1] ?? 0}٪`
  if (st === 'installing') return 'وافق على التثبيت على شاشة التلفاز بجهاز التحكم'
  if (st === 'done') return 'تم تحديث تطبيق الشاشة'
  const code = st.split(':')[1]
  return ({ signature: 'تعذر التحديث: نسخة التلفاز موقّعة بمفتاح مختلف. احذف تطبيق رفيق المسلم من التلفاز ثم ثبّت أحدث نسخة يدويًا مرة واحدة، وبعدها تعمل التحديثات من الجوال', not_newer: 'تطبيق الشاشة محدّث بالفعل', cancelled: 'أُلغي التثبيت على التلفاز', too_large: 'الملف أكبر من المسموح' } as Record<string, string>)[code ?? ''] ?? 'تعذر التحديث — تحقق من اتصال التلفاز بالإنترنت وأعد المحاولة'
}

// ---------- التخزين على الجهاز ----------
export const loadTvs = () => kv.get<PairedTv[]>(KEY, [])
async function saveTv(tv: PairedTv) {
  const list = (await loadTvs()).filter((x) => x.tvId !== tv.tvId)
  await kv.set(KEY, [tv, ...list].slice(0, 10))
}
export async function updateTvAddress(tvId: string, host: string, port: number) {
  await kv.set(KEY, (await loadTvs()).map((x) => (x.tvId === tvId ? { ...x, host, port } : x)))
}
export async function removeTv(tvId: string) {
  await kv.set(KEY, (await loadTvs()).filter((x) => x.tvId !== tvId))
}

/** يقبل «192.168.1.20» أو «192.168.1.20:8765» (عناوين الشبكة المحلية فقط) */
export function parseAddress(input: string): { host: string; port: number } | null {
  const m = /^\s*(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{2,5}))?\s*$/.exec(input)
  if (!m) return null
  const parts = m[1].split('.').map(Number)
  if (parts.some((x) => x > 255)) return null
  const [a, b] = parts
  const local = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
  if (!local) return null
  return { host: m[1], port: m[2] ? Number(m[2]) : 8765 }
}
