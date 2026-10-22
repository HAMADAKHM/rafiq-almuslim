import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core'
// صوت الأذان: اختيار الصوت لكل صلاة، وربطه بإشعارات الهاتف، والصوت المستورد من الجهاز.
// - Android: لكل صوت مدمج قناة إشعارات بصوت الأذان (الصوت في Android 8+ يتبع القناة لا الإشعار).
// - iOS: النظام لا يشغّل في الإشعار أكثر من 30 ثانية، فيُستخدم مقطع قصير من الأذان.
// - داخل التطبيق (والتطبيق مفتوح): يُشغَّل الأذان كاملًا، ومنه الصوت المستورد من الجهاز.
import { ADHAN_VOICES, VOICE_DEVICE, VOICE_SAME, VOICE_TONE, voiceById, type AdhanVoice } from '../content/adhanVoices'
import type { PrayerKey, Settings } from '../state/settings'
import type { Reminder } from './reminders'
import { kv } from '../db/repos'
import { platformName } from '../platform'

const AdhanSound = registerPlugin<{
  install(o: { key: string; base64: string; ext: string; name: string }): Promise<{ channelId: string }>
  remove(): Promise<void>
}>('AdhanSound')

/** معرّف الصوت الفعلي لصلاة معينة (الفجر قد يكون له صوت مختلف) */
export function voiceIdFor(settings: Settings, prayer: PrayerKey): string {
  const n = settings.notifications
  const id = prayer === 'fajr' && n.fajrVoice !== VOICE_SAME ? n.fajrVoice : n.adhanVoice
  if (id === VOICE_TONE || id === VOICE_DEVICE) return id
  return voiceById(id) ? id : VOICE_TONE // صوت محذوف من التطبيق يعود إلى النغمة الافتراضية
}

/** قناة Android لكل صوت. رقم الإصدار في المعرّف لأن صوت القناة لا يتغير بعد إنشائها. */
export const channelIdFor = (v: AdhanVoice) => `adhan_${v.id}_v1`

export interface ChannelSpec { id: string; name: string; description: string; sound: string; importance: 5 }

/** القنوات التي تحتاجها الإعدادات الحالية (Android) */
export function channelsFor(settings: Settings): ChannelSpec[] {
  const ids = new Set((['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerKey[]).map((p) => voiceIdFor(settings, p)))
  return [...ids].map((id) => voiceById(id)).filter((v): v is AdhanVoice => !!v).map((v) => ({
    id: channelIdFor(v), name: `الأذان — ${v.name}`, description: 'إشعار دخول وقت الصلاة بصوت الأذان', sound: v.file, importance: 5,
  }))
}

/**
 * يضيف القناة والصوت لتذكيرات دخول الوقت بحسب المنصة.
 * الصوت المستورد من الجهاز لا يمكن ربطه بإشعار النظام، فتستخدم هذه التذكيرات النغمة الافتراضية.
 */
export function withAdhanSounds(list: Reminder[], settings: Settings, platform: 'android' | 'ios' | 'web', device?: DeviceNative | null): Reminder[] {
  return list.map((r) => {
    if (r.kind !== 'prayer' || !r.prayer) return r
    const id = voiceIdFor(settings, r.prayer)
    if (id === VOICE_DEVICE) {
      if (platform === 'android' && device?.androidChannel) return { ...r, channelId: device.androidChannel }
      if (platform === 'ios' && device?.iosSound) return { ...r, sound: device.iosSound }
      return r
    }
    const v = voiceById(id)
    if (!v) return r
    if (platform === 'android') return { ...r, channelId: channelIdFor(v) }
    if (platform === 'ios') return { ...r, sound: v.iosFile }
    return r
  })
}

// ---------- الصوت المستورد من الجهاز ----------
export const DEVICE_VOICE_KEY = 'adhan:device'
export const DEVICE_VOICE_MAX_BYTES = 15 * 1024 * 1024
export interface DeviceVoice { name: string; type: string; size: number; blob: Blob }

export function validateDeviceFile(f: { name: string; type: string; size: number }): string | null {
  if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|aac|wav|ogg|opus)$/i.test(f.name)) return 'اختر ملفًا صوتيًا (mp3 أو m4a أو wav أو ogg)'
  if (f.size > DEVICE_VOICE_MAX_BYTES) return 'الملف أكبر من 15 ميغابايت'
  if (f.size === 0) return 'الملف فارغ'
  return null
}

/** ما يحتاجه نظام الإشعارات لتشغيل صوت الجهاز والتطبيق مغلق */
export interface DeviceNative { androidChannel?: string; iosSound?: string }
export const DEVICE_NATIVE_KEY = 'adhan:device:native'
export const loadDeviceNative = () => kv.get<DeviceNative | null>(DEVICE_NATIVE_KEY, null)

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

/** ترميز WAV (PCM 16 بت أحادي) — صيغة يقبلها iOS لأصوات الإشعارات */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true)
  }
  return buf
}

/** مقطع لا يتجاوز 29 ثانية مع خفوت في آخره (حد iOS لأصوات الإشعارات 30 ثانية) */
async function iosClip(file: Blob): Promise<ArrayBuffer> {
  const rate = 22050
  const ctx = new OfflineAudioContext(1, rate * 29, rate)
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer())
  const src = ctx.createBufferSource()
  src.buffer = decoded
  const g = ctx.createGain()
  const end = Math.min(29, decoded.duration)
  g.gain.setValueAtTime(1, Math.max(0, end - 2))
  g.gain.linearRampToValueAtTime(0, end)
  src.connect(g).connect(ctx.destination)
  src.start()
  const out = await ctx.startRendering()
  return encodeWav(out.getChannelData(0).subarray(0, Math.ceil(end * rate)), rate)
}

/** تثبيت صوت الجهاز في نظام الإشعارات (Android: قناة بالصوت كاملًا؛ iOS: مقطع 29 ثانية) */
async function installNative(file: File): Promise<DeviceNative | null> {
  const p = platformName()
  const key = Date.now().toString(36)
  if (p === 'android') {
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp3'
    const r = await AdhanSound.install({ key, base64: await blobToBase64(file), ext, name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) })
    return { androidChannel: r.channelId }
  }
  if (p === 'ios') {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const prev = await loadDeviceNative()
    if (prev?.iosSound) await Filesystem.deleteFile({ path: `Sounds/${prev.iosSound}`, directory: Directory.Library }).catch(() => {})
    const name = `adhan_device_${key}.wav`
    const wav = new Blob([await iosClip(file)], { type: 'audio/wav' })
    await Filesystem.writeFile({ path: `Sounds/${name}`, directory: Directory.Library, data: await blobToBase64(wav), recursive: true })
    return { iosSound: name }
  }
  return null
}

/** يحفظ الصوت للتشغيل داخل التطبيق، ويثبّته في نظام الإشعارات على الهاتف. يعيد false إن تعذّر التثبيت الأصلي. */
export async function saveDeviceVoice(file: File): Promise<boolean> {
  await kv.set(DEVICE_VOICE_KEY, { name: file.name, type: file.type || 'audio/mpeg', size: file.size, blob: file } satisfies DeviceVoice)
  try {
    const native = await installNative(file)
    await kv.set(DEVICE_NATIVE_KEY, native)
    return true
  } catch {
    await kv.set(DEVICE_NATIVE_KEY, null)
    return false
  }
}

export const loadDeviceVoice = () => kv.get<DeviceVoice | null>(DEVICE_VOICE_KEY, null)
export async function removeDeviceVoice() {
  await kv.set(DEVICE_VOICE_KEY, null)
  const prev = await loadDeviceNative()
  await kv.set(DEVICE_NATIVE_KEY, null)
  const p = platformName()
  if (p === 'android') await AdhanSound.remove().catch(() => {})
  if (p === 'ios' && prev?.iosSound) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    await Filesystem.deleteFile({ path: `Sounds/${prev.iosSound}`, directory: Directory.Library }).catch(() => {})
  }
}

/** رابط تشغيل الصوت داخل التطبيق، أو null للنغمة الافتراضية */
export async function playableUrl(id: string): Promise<string | null> {
  if (id === VOICE_DEVICE) {
    const d = await loadDeviceVoice()
    return d ? URL.createObjectURL(d.blob) : null
  }
  const v = voiceById(id)
  return v ? import.meta.env.BASE_URL + v.file : null
}

export const hasBundledVoices = () => ADHAN_VOICES.length > 0

/** ينزّل أذانًا من الإنترنت إلى الجهاز ثم يستخدمه مثل الملف المختار من الجهاز (للتشغيل وإشعارات الصلاة) */
export async function downloadOnlineAdhan(v: { name: string; url: string }): Promise<boolean> {
  let blob: Blob
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.get({ url: v.url, responseType: 'blob', connectTimeout: 20000, readTimeout: 60000 })
    if (r.status >= 400) throw new Error(`تعذر التنزيل (${r.status})`)
    const bin = atob(String(r.data))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    blob = new Blob([bytes], { type: 'audio/mpeg' })
  } else {
    const res = await fetch(v.url)
    if (!res.ok) throw new Error(`تعذر التنزيل (${res.status})`)
    blob = await res.blob()
  }
  if (blob.size < 10_000) throw new Error('الملف المنزّل غير صالح')
  return saveDeviceVoice(new File([blob], `${v.name}.mp3`, { type: 'audio/mpeg' }))
}
