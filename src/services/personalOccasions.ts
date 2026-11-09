// المناسبات الشخصية السنوية (عيد ميلاد، ذكرى زواج، مناسبة مخصصة): مواعيدها القادمة، ونص المنشور الافتراضي.
// نص المنشور تهنئة ودعاء عام بصياغة التطبيق (ليس آية ولا حديثًا)، ويعدّله المستخدم كما يريد.
import type { OccasionType, PersonalOccasion } from '../state/settings'

export const OCCASION_TYPES: { id: OccasionType; name: string; headline: string }[] = [
  { id: 'birthday', name: 'عيد ميلاد', headline: 'كل عام وأنت بخير' },
  { id: 'wedding', name: 'ذكرى زواج', headline: 'ذكرى زواج سعيدة' },
  { id: 'custom', name: 'مناسبة أخرى', headline: 'تهنئة من القلب' },
]
export const MAX_PERSONAL = 20

export function occasionTitle(o: PersonalOccasion): string {
  if (o.type === 'custom') return o.title?.trim() || 'مناسبة'
  return OCCASION_TYPES.find((t) => t.id === o.type)!.name
}

export function headlineFor(o: PersonalOccasion): string {
  if (o.type === 'custom') return o.title?.trim() || OCCASION_TYPES[2].headline
  return OCCASION_TYPES.find((t) => t.id === o.type)!.headline
}

/** نص المنشور الافتراضي تحت العنوان والاسم (يُستعمل إن لم يكتب المستخدم نصه) */
export function defaultPost(o: Pick<PersonalOccasion, 'type'>): string {
  if (o.type === 'birthday') return 'أسأل الله أن يبارك في عمرك، ويجعل أيامك القادمة طاعة وسعادة وصحة.'
  if (o.type === 'wedding') return 'أدام الله بينكما المودة والرحمة، وزادكما سعادة وبركة.'
  return 'أسأل الله أن يجعلها مناسبة خير وبركة، وأن يسعدك دائمًا.'
}

/** عنوان المنشور: ما كتبه المستخدم، أو التهنئة بحسب النوع */
export const postHeadline = (o: PersonalOccasion) => (o.headline?.trim() ? o.headline.trim() : headlineFor(o))

export const postText = (o: PersonalOccasion) => (o.post?.trim() ? o.post.trim() : defaultPost(o))

/** يوم المناسبة في سنة معينة (29 فبراير → 28 في السنة غير الكبيسة) */
export function dayInYear(o: Pick<PersonalOccasion, 'month' | 'day'>, year: number): { y: number; m: number; d: number } {
  const last = new Date(Date.UTC(year, o.month, 0)).getUTCDate()
  return { y: year, m: o.month, d: Math.min(o.day, last) }
}

/** هل يوافق اليوم (بتقويم المستخدم المحلي) يوم المناسبة؟ */
export function isOccasionDay(o: Pick<PersonalOccasion, 'month' | 'day'>, day: { y: number; m: number; d: number }): boolean {
  const t = dayInYear(o, day.y)
  return t.m === day.m && t.d === day.d
}

const utcDay = (p: { y: number; m: number; d: number }) => Date.UTC(p.y, p.m - 1, p.d)

/** عدد الأيام حتى المناسبة القادمة (0 = اليوم) وتاريخها */
export function nextOccurrence(o: Pick<PersonalOccasion, 'month' | 'day'>, today: { y: number; m: number; d: number }): { days: number; date: { y: number; m: number; d: number } } {
  let date = dayInYear(o, today.y)
  if (utcDay(date) < utcDay(today)) date = dayInYear(o, today.y + 1)
  return { days: Math.round((utcDay(date) - utcDay(today)) / 86_400_000), date }
}

/** عدد السنوات (العمر أو سنوات الزواج) في المناسبة القادمة إن عُرفت سنة البداية */
export function yearsAt(o: Pick<PersonalOccasion, 'year'>, occurrenceYear: number): number | null {
  if (!o.year || o.year < 1900 || o.year > occurrenceYear) return null
  const n = occurrenceYear - o.year
  return n > 0 ? n : null
}

export function newOccasion(list: PersonalOccasion[], type: OccasionType = 'birthday'): PersonalOccasion {
  const id = list.reduce((m, a) => Math.max(m, a.id), 0) + 1
  const now = new Date()
  return { id, type, name: '', month: now.getMonth() + 1, day: now.getDate(), daysBefore: 1, time: '09:00', on: true }
}
