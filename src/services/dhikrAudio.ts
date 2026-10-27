// تسجيلات بشرية للأذكار يملك المستخدم (أو الجهة) حق استخدامها: تُضاف لكل ذكر مع اسم القارئ والمصدر والترخيص،
// وتُحفظ على الجهاز فقط، وتُشغَّل بدل صوت الجهاز الآلي. لا تسجيلات مدمجة غير مرخّصة.
import { kv } from '../db/repos'

export interface DhikrRecording { itemId: string; blob: Blob; reciter: string; source: string; license: string; addedAt: number }
const key = (id: string) => `dhikrAudio:${id}`
const LIST = 'dhikrAudio:list'
export const MAX_DHIKR_AUDIO_BYTES = 20 * 1024 * 1024

export function validateRecording(f: { name: string; type: string; size: number }, meta: { reciter: string; source: string; license: string; rights: boolean }): string | null {
  if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|aac|wav|ogg|opus)$/i.test(f.name)) return 'اختر ملفًا صوتيًا (mp3 أو m4a أو wav أو ogg)'
  if (f.size === 0) return 'الملف فارغ'
  if (f.size > MAX_DHIKR_AUDIO_BYTES) return 'الملف أكبر من 20 ميغابايت'
  if (!meta.reciter.trim()) return 'اكتب اسم القارئ'
  if (!meta.source.trim()) return 'اكتب مصدر التسجيل'
  if (!meta.license.trim()) return 'اكتب الترخيص أو الإذن'
  if (!meta.rights) return 'أكّد أنك تملك حق استخدام هذا التسجيل'
  return null
}

export async function saveRecording(r: DhikrRecording) {
  await kv.set(key(r.itemId), r)
  const ids = await kv.get<string[]>(LIST, [])
  if (!ids.includes(r.itemId)) await kv.set(LIST, [...ids, r.itemId])
}
export const getRecording = (id: string) => kv.get<DhikrRecording | null>(key(id), null)
export async function removeRecording(id: string) {
  await kv.set(key(id), null)
  await kv.set(LIST, (await kv.get<string[]>(LIST, [])).filter((x) => x !== id))
}
export const recordedIds = () => kv.get<string[]>(LIST, [])
