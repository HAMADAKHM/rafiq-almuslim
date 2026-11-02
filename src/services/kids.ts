// مساحة الأطفال والرقابة الأبوية — على الجهاز فقط:
// ملفات الأطفال، والمحتوى المسموح، ووقت الاستخدام اليومي، ورمز PIN للوالدين (يُحفظ مُجزّأ hash لا نصًا)،
// ووضع الطفل الذي يقصر التطبيق على مساحة الأطفال (لا روابط خارجية ولا إعلانات).
import { kv } from '../db/repos'

export type AgeGroup = '4-6' | '7-9' | '10-12'
export type KidSection = 'prayer' | 'wudu' | 'prophets' | 'akhlaq' | 'letters' | 'adhkar' | 'aqidah' | 'quiz'

export const KID_SECTIONS: { id: KidSection; label: string }[] = [
  { id: 'prayer', label: 'تعليم الصلاة' },
  { id: 'wudu', label: 'تعليم الوضوء' },
  { id: 'prophets', label: 'قصص الأنبياء' },
  { id: 'akhlaq', label: 'الأخلاق الإسلامية' },
  { id: 'letters', label: 'الحروف العربية' },
  { id: 'adhkar', label: 'الأذكار اليومية' },
  { id: 'aqidah', label: 'أركان الإسلام والإيمان' },
  { id: 'quiz', label: 'المسابقات' },
]
export const AGE_LABEL: Record<AgeGroup, string> = { '4-6': 'من 4 إلى 6 سنوات', '7-9': 'من 7 إلى 9 سنوات', '10-12': 'من 10 إلى 12 سنة' }

export interface KidProfile { id: string; name: string; age: AgeGroup; allowed: KidSection[]; dailyMinutes: number }

export const loadKids = () => kv.get<KidProfile[]>('kids:profiles', [])
export async function saveKid(k: KidProfile) {
  const list = await loadKids()
  const i = list.findIndex((x) => x.id === k.id)
  if (i >= 0) list[i] = k; else list.push(k)
  await kv.set('kids:profiles', list.slice(0, 8))
}
export async function removeKid(id: string) {
  await kv.set('kids:profiles', (await loadKids()).filter((k) => k.id !== id))
  if ((await activeKidId()) === id) await kv.set('kids:active', null)
}
export const newKid = (name: string, age: AgeGroup): KidProfile => ({
  id: `k${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, name: name.trim().slice(0, 30) || 'طفلي', age,
  allowed: KID_SECTIONS.map((s) => s.id), dailyMinutes: age === '4-6' ? 20 : 30,
})

// ---------- رمز PIN ----------
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export const hasPin = async () => !!(await kv.get<{ hash: string } | null>('kids:pin', null))
export async function setPin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('الرمز من 4 إلى 8 أرقام')
  const salt = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')
  await kv.set('kids:pin', { salt, hash: await sha256(salt + pin) })
}
/** يُقفل التحقق مؤقتًا بعد خمس محاولات خاطئة متتالية */
export async function checkPin(pin: string, now = Date.now()): Promise<'ok' | 'wrong' | 'locked'> {
  const lock = await kv.get<{ fails: number; until: number }>('kids:pinLock', { fails: 0, until: 0 })
  if (lock.until > now) return 'locked'
  const p = await kv.get<{ salt: string; hash: string } | null>('kids:pin', null)
  if (!p) return 'ok'
  if ((await sha256(p.salt + pin)) === p.hash) { await kv.set('kids:pinLock', { fails: 0, until: 0 }); return 'ok' }
  const fails = lock.fails + 1
  await kv.set('kids:pinLock', { fails: fails >= 5 ? 0 : fails, until: fails >= 5 ? now + 5 * 60_000 : 0 })
  return fails >= 5 ? 'locked' : 'wrong'
}

// ---------- وضع الطفل ووقت الاستخدام ----------
export const activeKidId = () => kv.get<string | null>('kids:active', null)
export async function enterKidMode(id: string) { await kv.set('kids:active', id) }
export async function exitKidMode() { await kv.set('kids:active', null) }

const usageKey = (id: string, day: string) => `kids:usage:${id}:${day}`
export const usedSeconds = (id: string, day: string) => kv.get<number>(usageKey(id, day), 0)
export async function addUsage(id: string, day: string, seconds: number) {
  const v = (await usedSeconds(id, day)) + seconds
  await kv.set(usageKey(id, day), v)
  return v
}
/** دقائق إضافية يمنحها الوالدان لهذا اليوم */
export const extraMinutes = (id: string, day: string) => kv.get<number>(`kids:extra:${id}:${day}`, 0)
export async function grantExtra(id: string, day: string, minutes: number) { await kv.set(`kids:extra:${id}:${day}`, (await extraMinutes(id, day)) + minutes) }

export function timeLeft(k: KidProfile, usedSec: number, extraMin: number): number | null {
  if (!k.dailyMinutes) return null
  return Math.max(0, (k.dailyMinutes + extraMin) * 60 - usedSec)
}

/** المسارات المسموحة في وضع الطفل: مساحة الأطفال فقط */
export function kidPathAllowed(path: string): boolean {
  return path === '/kids' || path.startsWith('/kids/') || path === '/kids-adhkar'
}
