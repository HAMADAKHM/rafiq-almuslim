// صوت الأذان: اختيار الصوت لكل صلاة، وربطه بإشعارات الهاتف، والصوت المستورد من الجهاز.
// - Android: لكل صوت مدمج قناة إشعارات بصوت الأذان (الصوت في Android 8+ يتبع القناة لا الإشعار).
// - iOS: النظام لا يشغّل في الإشعار أكثر من 30 ثانية، فيُستخدم مقطع قصير من الأذان.
// - داخل التطبيق (والتطبيق مفتوح): يُشغَّل الأذان كاملًا، ومنه الصوت المستورد من الجهاز.
import { ADHAN_VOICES, VOICE_DEVICE, VOICE_SAME, VOICE_TONE, voiceById, type AdhanVoice } from '../content/adhanVoices'
import type { PrayerKey, Settings } from '../state/settings'
import type { Reminder } from './reminders'
import { kv } from '../db/repos'

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
export function withAdhanSounds(list: Reminder[], settings: Settings, platform: 'android' | 'ios' | 'web'): Reminder[] {
  return list.map((r) => {
    if (r.kind !== 'prayer' || !r.prayer) return r
    const v = voiceById(voiceIdFor(settings, r.prayer))
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

export async function saveDeviceVoice(file: File): Promise<void> {
  await kv.set(DEVICE_VOICE_KEY, { name: file.name, type: file.type || 'audio/mpeg', size: file.size, blob: file } satisfies DeviceVoice)
}

export const loadDeviceVoice = () => kv.get<DeviceVoice | null>(DEVICE_VOICE_KEY, null)
export const removeDeviceVoice = () => kv.set(DEVICE_VOICE_KEY, null)

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
