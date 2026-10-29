// من يقرأ الذكر في إشعار أذكار الصباح والمساء (Android):
// - hisn: تسجيل حصن المسلم (ملف داخل التطبيق: res/raw)
// - device: نطق نص الذكر نفسه بمحرك الكلام العربي في الهاتف، يُكتب إلى ملف ويصبح صوت قناة الإشعار
// - mine: تسجيل أضافه المستخدم للذكر نفسه (صفحة الأذكار ← تسجيل)
// النص من مكتبة الأذكار الموثقة كما هو، ولا يُرسل أي شيء خارج الجهاز.
import { registerPlugin } from '@capacitor/core'
import { ADHKAR } from '../content/adhkar'
import { HISN_CLIPS } from '../content/hisnAudio'
import { kv } from '../db/repos'
import { platformName } from '../platform'
import type { NotificationSettings, TimedVoice } from '../state/settings'
import { getRecording } from './dhikrAudio'
import { hisnChannel, TIMED_ADHKAR_SOUND } from './companion'

export type VoiceSlot = 'morning' | 'evening'

/** الذكر الذي يُسمع في إشعار كل وقت */
export const SLOT_DHIKR: Record<VoiceSlot, { itemId: string; category: string }> = {
  morning: { itemId: 'm-asbahna', category: 'morning' },
  evening: { itemId: 'e-amsayna', category: 'evening' },
}

/** أول جملة من الذكر (حتى «قدير») — تكفي صوتًا للإشعار، والذكر كاملًا داخل التطبيق */
export function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  const i = t.search(/قَدِيرٌ|قدير/)
  if (i < 0) return t.length > 160 ? t.slice(0, 160) : t
  const end = t.indexOf(' ', i)
  return (end < 0 ? t : t.slice(0, end)).replace(/[،,]$/, '')
}

export function slotText(slot: VoiceSlot): string {
  const { itemId, category } = SLOT_DHIKR[slot]
  const item = ADHKAR.find((c) => c.id === category)?.items.find((x) => x.id === itemId)
  return firstSentence(item?.text ?? '')
}

/** أول كلمات الذكر للعرض في نص الإشعار */
export function slotPreview(slot: VoiceSlot): string {
  return slot === 'morning' ? 'أصبحنا وأصبح الملك لله، والحمد لله…' : 'أمسينا وأمسى الملك لله، والحمد لله…'
}

/** الاختيار الفعلي بعد الافتراضيات */
export function voiceChoice(n: Pick<NotificationSettings, 'morningVoice' | 'eveningVoice'>, slot: VoiceSlot): TimedVoice {
  return (slot === 'morning' ? n.morningVoice : n.eveningVoice) ?? (slot === 'morning' ? 'hisn' : 'device')
}

/** وصف ما يُسمع لكل اختيار (للواجهة) */
export function voiceLabel(slot: VoiceSlot, v: TimedVoice): string {
  if (v === 'hisn') return slot === 'morning' ? '«أصبحنا وأصبح الملك لله…» بتسجيل حصن المسلم' : '«بسم الله الذي لا يضر مع اسمه شيء…» بتسجيل حصن المسلم (ذكر الصباح والمساء)'
  if (v === 'device') return `${slot === 'morning' ? '«أصبحنا وأصبح الملك لله…»' : '«أمسينا وأمسى الملك لله…»'} بصوت الهاتف العربي (نطق آلي)`
  return 'تسجيلك أنت لهذا الذكر'
}

/** قناة تسجيل حصن المسلم لكل وقت */
export const hisnSlotChannel = (slot: VoiceSlot) => hisnChannel(TIMED_ADHKAR_SOUND[slot])

/** بصمة قصيرة (FNV-1a) لمعرّف القناة: محتوى جديد = قناة جديدة */
export function sig(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(36)
}

const DhikrSound = registerPlugin<{
  install(o: { slot: string; sig: string; base64: string; ext: string; name: string; text: string }): Promise<{ channelId: string }>
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

/** صوت الذكر بنطق الهاتف (WAV بترميز Base64) */
export async function synthesizeSlot(slot: VoiceSlot): Promise<string | null> {
  if (platformName() !== 'android' || !(await arabicVoiceReady())) return null
  return (await Narration.synthesize({ text: slotText(slot), rate: 0.8 })).data
}

/**
 * يجهّز قناة الإشعار لكل وقت اختير له صوت الهاتف أو تسجيل المستخدم، ويعيد معرّفها.
 * يعيد null عند التعذر (لا صوت عربي، أو لا تسجيل) فيستعمل الجدول تسجيل حصن المسلم.
 */
export async function prepareVoiceChannel(n: NotificationSettings, slot: VoiceSlot): Promise<string | null> {
  if (platformName() !== 'android') return null
  const v = voiceChoice(n, slot)
  if (v === 'hisn') return null
  try {
    const { itemId } = SLOT_DHIKR[slot]
    let key: string
    let load: () => Promise<{ base64: string; ext: string } | null>
    if (v === 'device') {
      key = `device|${slotText(slot)}`
      load = async () => { const d = await synthesizeSlot(slot); return d ? { base64: d, ext: 'wav' } : null }
    } else {
      const rec = await getRecording(itemId)
      if (!rec) return null
      key = `mine|${itemId}|${rec.addedAt}|${rec.blob.size}`
      load = async () => ({ base64: await blobToBase64(rec.blob), ext: extOf(rec.blob.type) })
    }
    const s = sig(key)
    const cacheKey = `tvoice:${slot}`
    const cached = await kv.get<{ sig: string; channelId: string } | null>(cacheKey, null)
    if (cached?.sig === s && (await DhikrSound.exists({ channelId: cached.channelId })).exists) return cached.channelId
    const data = await load()
    if (!data) return null
    const name = `${slot === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} — ${v === 'device' ? 'صوت الهاتف' : 'تسجيلي'}`
    const { channelId } = await DhikrSound.install({ slot, sig: s, base64: data.base64, ext: data.ext, name, text: slotPreview(slot) })
    await kv.set(cacheKey, { sig: s, channelId })
    return channelId
  } catch {
    return null
  }
}

/** قنوات الصباح والمساء لهذه الجدولة */
export async function prepareVoiceChannels(n: NotificationSettings): Promise<Partial<Record<VoiceSlot, string>>> {
  const out: Partial<Record<VoiceSlot, string>> = {}
  if (!n.enabled || n.adhkarVoice === false) return out
  for (const slot of ['morning', 'evening'] as VoiceSlot[]) {
    if (!(slot === 'morning' ? n.morningAdhkar : n.eveningAdhkar)) continue
    const id = await prepareVoiceChannel(n, slot)
    if (id) out[slot] = id
  }
  return out
}

/** مصدر معاينة الصوت داخل التطبيق: مقطع حصن المسلم (من الإنترنت)، أو نطق الهاتف، أو تسجيل المستخدم */
export async function previewSource(n: NotificationSettings, slot: VoiceSlot): Promise<{ url: string; from?: number; to?: number; revoke?: boolean } | { speak: string } | null> {
  const v = voiceChoice(n, slot)
  if (v === 'hisn') {
    const snd = TIMED_ADHKAR_SOUND[slot]
    const clip = typeof snd === 'string' ? HISN_CLIPS[snd] : null
    const num = clip ? clip.src : (snd as number)
    return { url: `https://www.hisnmuslim.com/audio/ar/${num}.mp3`, ...(clip ? { from: clip.from, to: clip.to } : {}) }
  }
  if (v === 'mine') {
    const rec = await getRecording(SLOT_DHIKR[slot].itemId).catch(() => null)
    return rec ? { url: URL.createObjectURL(rec.blob), revoke: true } : null
  }
  const d = await synthesizeSlot(slot).catch(() => null)
  if (d) return { url: `data:audio/wav;base64,${d}` }
  return { speak: slotText(slot) }
}
