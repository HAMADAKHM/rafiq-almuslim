// «التحكم بالتلفاز» من رفيق المسلم بلس: الربط برمز يظهر على الشاشة، ثم أوامر موقّعة.
// البروتوكول يطابق android-tv/.../RemoteCore.java (واختبار التوافق في الطرفين بقيم مرجعية واحدة):
//   K = SHA-256(code|pn|tn) ، proof = HMAC(K, "pair|"+name) ، السر = AES-GCM(K)
//   كل طلب: HMAC(token, METHOD\nPATH\nTIME\nSHA256hex(body)) في الترويسات X-Rafiq-*
// الرمز لا يُرسل في الشبكة، والمفتاح السري يبقى على الجهاز فقط.
import { kv } from '../db/repos'

export interface PairedTv { tvId: string; name: string; host: string; port: number; deviceId: string; token: string; pairedAt: number }
export interface TvSettingsView {
  scene?: string; playlist?: string[]; rotateMin?: number; shuffle?: boolean; quality?: 'auto' | 'eco' | 'high'; animate?: boolean
  adhan?: boolean; hour12?: boolean; reciteOn?: boolean; reciteVolume?: number; clockShift?: number; city?: string
  idleMinutes?: number; idleTakeover?: boolean; autostart?: boolean
}

/** وسيلة الإرسال (TvLink في التطبيق، ومحاكاة في الاختبارات) */
export type Transport = (o: { host: string; port: number; method: string; path: string; body?: string; headers?: Record<string, string> }) => Promise<{ status: number; body: string }>

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
export async function signedCall(send: Transport, tv: PairedTv, method: 'GET' | 'POST', path: string, body?: object): Promise<Record<string, unknown>> {
  const text = body ? JSON.stringify(body) : ''
  const time = Math.max(Date.now(), lastTime + 1)
  lastTime = time
  const sig = await signRequest(tv.token, method, path, time, text)
  let r: { status: number; body: string }
  try {
    r = await send({ host: tv.host, port: tv.port, method, path, body: text, headers: { 'X-Rafiq-Device': tv.deviceId, 'X-Rafiq-Time': String(time), 'X-Rafiq-Sig': sig } })
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
export async function tvAction(send: Transport, tv: PairedTv, action: 'stop_adhan' | 'open_screen' | 'next_scene'): Promise<boolean> {
  return !!(await signedCall(send, tv, 'POST', '/action', { action })).ok
}
export async function unpairTv(send: Transport, tv: PairedTv) {
  try { await signedCall(send, tv, 'POST', '/unpair') } catch { /* يُحذف محليًا على أي حال */ }
  await removeTv(tv.tvId)
}

/** التلفاز يرد (للحالة: متصل/غير متصل) */
export async function pingTv(send: Transport, host: string, port: number): Promise<{ tvId: string; name: string; pairing: boolean } | null> {
  try {
    const r = await send({ host, port, method: 'GET', path: '/info' })
    const j = parse(r.body)
    return r.status === 200 && j.app === 'rafiq-tv' ? { tvId: String(j.tvId), name: String(j.name), pairing: !!j.pairing } : null
  } catch { return null }
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
