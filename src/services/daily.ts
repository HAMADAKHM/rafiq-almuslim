// المحتوى اليومي: آية اليوم، ذكر اليوم، والتحية — كلها حتمية بحسب التاريخ (نفس اليوم = نفس المحتوى).
import { AYAH_OF_DAY_REFS } from '../content/ayahOfDay'
import { ADHKAR } from '../content/adhkar'
import { DUAS } from '../content/duas'
import type { DhikrItem } from '../content/types'
import { daysBetween } from '../lib/dates'

function dayIndex(day: string): number {
  return Math.max(0, daysBetween('2026-01-01', day))
}

export function ayahOfDay(day: string): { surah: number; ayah: number } {
  const [surah, ayah] = AYAH_OF_DAY_REFS[dayIndex(day) % AYAH_OF_DAY_REFS.length]
  return { surah, ayah }
}

/** ذكر أو دعاء اليوم: من العناصر النصية الموثقة فقط (أحاديث)، ومن غير أذكار الخلاء والمطر ونحوها. */
const POOL: { item: DhikrItem; category: string }[] = [
  ...ADHKAR.filter((c) => ['morning', 'after-prayer', 'misc'].includes(c.id)).flatMap((c) => c.items.map((item) => ({ item, category: `adhkar/${c.id}` }))),
  ...DUAS.filter((c) => ['sunnah', 'istighfar', 'distress', 'general'].includes(c.id)).flatMap((c) => c.items.map((item) => ({ item, category: `duas/${c.id}` }))),
].filter((x) => x.item.kind === 'hadith' && x.item.text && x.item.text.length < 400)

export function dhikrOfDay(day: string): { item: DhikrItem; category: string } {
  return POOL[(dayIndex(day) * 7) % POOL.length]
}

export function timeOfDay(hour: number): 'morning' | 'evening' | 'night' {
  if (hour >= 4 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 21) return 'evening'
  return 'night'
}

const GREETINGS: Record<ReturnType<typeof timeOfDay>, string[]> = {
  morning: ['صباح الخير', 'أسعد الله صباحك', 'صباح مبارك'],
  evening: ['مساء الخير', 'أسعد الله مساءك', 'مساء مبارك'],
  night: ['طابت ليلتك', 'ليلة هادئة', 'مساء الخير'],
}

export function greeting(hour: number, day: string): string {
  const list = GREETINGS[timeOfDay(hour)]
  return list[dayIndex(day) % list.length]
}

/** أذكار الوقت الحالي: الصباح حتى الظهر، والمساء بعد العصر، والنوم ليلًا */
export function adhkarForNow(hour: number): { id: string; title: string } {
  const t = timeOfDay(hour)
  if (t === 'morning') return { id: 'morning', title: 'أذكار الصباح' }
  if (t === 'evening') return { id: 'evening', title: 'أذكار المساء' }
  return { id: 'sleep', title: 'أذكار النوم' }
}
