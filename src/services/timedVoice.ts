// قنوات صوت تذكيرات الأذكار على Android: صوت الهاتف العربي ينطق جملة الذكر، أو تسجيل المستخدم للذكر نفسه،
// يُكتب إلى ملف ويصبح صوت قناة الإشعار (إضافة DhikrSound). تسجيلات حصن المسلم ملفات داخل التطبيق (res/raw).
// النص من مكتبة الأذكار الموثقة كما هو، ولا يُرسل أي شيء خارج الجهاز.
import { registerPlugin } from '@capacitor/core'
import { HISN_CLIPS } from '../content/hisnAudio'
import { kv } from '../db/repos'
import { platformName } from '../platform'
import type { NotificationSettings } from '../state/settings'
import { getRecording } from './dhikrAudio'
import { channelFlags, hisnClipChannel, SLOT_DEFS, slotSpeech, VOICE_SLOTS, voiceFor, type VoiceSlot } from './voiceSlots'

export type { VoiceSlot } from './voiceSlots'

/** بصمة قصيرة (FNV-1a) لمعرّف القناة: محتوى جديد = قناة جديدة */
export function sig(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(36)
}

const DhikrSound = registerPlugin<{
  install(o: { slot: string; sig: string; base64: string; ext: string; name: string; text: string; vibrate: boolean; hidden: boolean }): Promise<{ channelId: string }>
  exists(o: { channelId: string }): Promise<{ exists: boolean }>
  remove(o: { slot: string }): Promise<void>
}>('DhikrSound')
const Narration = registerPlugin<{ status(): Promise<{ state: 'ok' | 'init' | 'missing' }>; synthesize(o: { text: string; rate?: number }): Promise<{ data: string }> }>('Narration')

async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}
const extOf = (type: string) => (/ogg/.test(type) ? 'ogg' : /webm/.test(type) ? 'webm' : /wav/.test(type) ? 'wav' : /mp4|m4a|aac/.test(type) ? 'm4a' : 'mp3')

async function arabicVoiceReady(): Promise<boolean> {
  for (let i = 0; i < 15; i++) {
    const { state } = await Narration.status()
    if (state === 'ok') return true
    if (state === 'missing') return false
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

/** جملة الذكر بصوت الهاتف (WAV بترميز Base64) */
export async function synthesizeSlot(slot: VoiceSlot): Promise<string | null> {
  if (platformName() !== 'android' || !(await arabicVoiceReady())) return null
  return (await Narration.synthesize({ text: slotSpeech(slot), rate: 0.85 })).data
}

/** قناة تسجيل حصن المسلم لكل تذكير */
export const hisnSlotChannel = (n: Pick<NotificationSettings, 'vibrate' | 'lockText'>, slot: VoiceSlot) => hisnClipChannel(SLOT_DEFS[slot].hisn, channelFlags(n))

/**
 * يجهّز قناة صوت الهاتف أو تسجيل المستخدم لتذكير، ويعيد معرّفها.
 * null عند التعذر (لا صوت عربي أو لا تسجيل) فيعود التذكير إلى تسجيل حصن المسلم.
 */
export async function prepareVoiceChannel(n: NotificationSettings, slot: VoiceSlot): Promise<string | null> {
  if (platformName() !== 'android') return null
  const v = voiceFor(n, slot)
  if (v !== 'device' && v !== 'mine') return null
  try {
    const def = SLOT_DEFS[slot]
    const flags = channelFlags(n)
    let key: string
    let load: () => Promise<{ base64: string; ext: string } | null>
    if (v === 'device') {
      key = `device|${slotSpeech(slot)}|${flags}`
      load = async () => { const d = await synthesizeSlot(slot); return d ? { base64: d, ext: 'wav' } : null }
    } else {
      const rec = await getRecording(def.itemId)
      if (!rec) return null
      key = `mine|${def.itemId}|${rec.addedAt}|${rec.blob.size}|${flags}`
      load = async () => ({ base64: await blobToBase64(rec.blob), ext: extOf(rec.blob.type) })
    }
    const s = sig(key)
    const cacheKey = `tvoice:${slot}`
    const cached = await kv.get<{ sig: string; channelId: string } | null>(cacheKey, null)
    if (cached?.sig === s && (await DhikrSound.exists({ channelId: cached.channelId })).exists) return cached.channelId
    const data = await load()
    if (!data) return null
    const { channelId } = await DhikrSound.install({
      slot: slot.toLowerCase(), sig: s, base64: data.base64, ext: data.ext,
      name: `${def.label} — ${v === 'device' ? 'صوت الهاتف' : 'تسجيلي'}`, text: def.ownHeard.replace(/[«»]/g, ''),
      vibrate: n.vibrate !== false, hidden: n.lockText === false,
    })
    await kv.set(cacheKey, { sig: s, channelId })
    return channelId
  } catch {
    return null
  }
}

/** هل التذكير مفعّل (فلا تُجهّز قناة لتذكير متوقف) */
function slotEnabled(n: NotificationSettings, slot: VoiceSlot): boolean {
  if (slot === 'morning') return !!n.morningAdhkar
  if (slot === 'evening') return !!n.eveningAdhkar
  if (slot === 'sleep') return !!n.sleepAdhkar
  if (slot === 'wake') return !!n.wakeAdhkar
  return !!n.afterPrayer?.enabled
}

/** قنوات هذه الجدولة لكل تذكير اختير له صوت الهاتف أو تسجيل المستخدم */
export async function prepareVoiceChannels(n: NotificationSettings): Promise<Partial<Record<VoiceSlot, string>>> {
  const out: Partial<Record<VoiceSlot, string>> = {}
  if (!n.enabled || n.adhkarVoice === false) return out
  for (const slot of VOICE_SLOTS) {
    if (!slotEnabled(n, slot)) continue
    const id = await prepareVoiceChannel(n, slot)
    if (id) out[slot] = id
  }
  return out
}

/** مصدر معاينة الصوت داخل التطبيق: مقطع حصن المسلم (من الإنترنت)، أو نطق الهاتف، أو تسجيل المستخدم */
export async function previewSource(n: NotificationSettings, slot: VoiceSlot): Promise<{ url: string; from?: number; to?: number; revoke?: boolean } | { speak: string } | null> {
  const v = voiceFor(n, slot)
  if (v === 'tone') return null
  if (v === 'hisn') {
    const c = HISN_CLIPS[SLOT_DEFS[slot].hisn]
    return { url: `https://www.hisnmuslim.com/audio/ar/${c.src}.mp3`, from: c.from, to: c.to }
  }
  if (v === 'mine') {
    const rec = await getRecording(SLOT_DEFS[slot].itemId).catch(() => null)
    return rec ? { url: URL.createObjectURL(rec.blob), revoke: true } : null
  }
  const d = await synthesizeSlot(slot).catch(() => null)
  if (d) return { url: `data:audio/wav;base64,${d}` }
  return { speak: slotSpeech(slot) }
}
