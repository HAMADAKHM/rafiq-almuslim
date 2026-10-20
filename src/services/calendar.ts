// التقويم الهجري والمناسبات. الحساب وفق تقويم أم القرى (Intl) مع تعديل يدوي ±2 يوم،
// لأن بدايات الشهور قد تختلف بين البلدان بحسب رؤية الهلال.
import { addDays } from '../lib/dates'

export const HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة']

export interface HijriDate { day: number; month: number; year: number }

export function toHijri(date: Date, timeZone?: string, offsetDays = 0): HijriDate {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(addDays(date, offsetDays))
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value.replace(/\D/g, ''))
  return { day: get('day'), month: get('month'), year: get('year') }
}

export interface Occasion {
  title: string
  kind: 'eid' | 'fast' | 'note' | 'forbidden-fast'
  note?: string
  source?: string
}

/** المناسبات الثابتة في التقويم الهجري. الأحكام المذكورة مع مصادرها، ومحتاجة لمراجعة متخصص. */
export function occasionsFor(h: HijriDate, weekday: number): Occasion[] {
  const out: Occasion[] = []
  const { day, month } = h
  if (month === 1 && day === 1) out.push({ title: 'رأس السنة الهجرية', kind: 'note' })
  if (month === 1 && day === 10) out.push({ title: 'يوم عاشوراء', kind: 'fast', note: 'يُستحب صيامه', source: 'رواه مسلم (1162)' })
  if (month === 9 && day === 1) out.push({ title: 'بداية شهر رمضان', kind: 'note', note: 'يُعتمد إعلان رؤية الهلال في بلدك' })
  if (month === 10 && day === 1) out.push({ title: 'عيد الفطر', kind: 'eid', note: 'يحرم صومه', source: 'متفق عليه (النهي عن صوم يومي العيد)' })
  if (month === 12 && day === 9) out.push({ title: 'يوم عرفة', kind: 'fast', note: 'يُستحب صيامه لغير الحاج', source: 'رواه مسلم (1162)' })
  if (month === 12 && day === 10) out.push({ title: 'عيد الأضحى', kind: 'eid', note: 'يحرم صومه', source: 'متفق عليه (النهي عن صوم يومي العيد)' })
  if (month === 12 && day >= 11 && day <= 13) out.push({ title: 'من أيام التشريق', kind: 'forbidden-fast', note: '«أيام التشريق أيام أكل وشرب»', source: 'رواه مسلم (1141)' })
  const tashreeq = month === 12 && day === 13
  if ([13, 14, 15].includes(day) && !tashreeq) out.push({ title: 'من الأيام البيض', kind: 'fast', note: 'يُستحب صيام ثلاثة أيام من كل شهر، وتُستحب الأيام البيض', source: 'رواه الترمذي والنسائي' })
  if ((weekday === 1 || weekday === 4) && !out.some((o) => o.kind === 'eid' || o.kind === 'forbidden-fast')) {
    out.push({ title: weekday === 1 ? 'يوم الاثنين' : 'يوم الخميس', kind: 'fast', note: 'يُستحب صيامه', source: 'رواه الترمذي، وصيام الاثنين في صحيح مسلم (1162)' })
  }
  return out
}

export interface CalendarDay { date: Date; key: string; gDay: number; hijri: HijriDate; weekday: number; occasions: Occasion[] }

/** أيام شهر ميلادي كامل مع ما يقابلها هجريًا */
export function monthDays(year: number, month: number, offsetDays = 0): CalendarDay[] {
  const days: CalendarDay[] = []
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let d = 1; d <= count; d++) {
    const date = new Date(Date.UTC(year, month - 1, d, 12))
    const hijri = toHijri(date, 'UTC', offsetDays)
    const weekday = date.getUTCDay()
    days.push({ date, key: date.toISOString().slice(0, 10), gDay: d, hijri, weekday, occasions: occasionsFor(hijri, weekday) })
  }
  return days
}

/** أقرب المناسبات الكبرى القادمة (دون الاثنين والخميس والأيام البيض) */
export function upcomingOccasions(from: Date, offsetDays = 0, limit = 4): { date: Date; hijri: HijriDate; occasion: Occasion }[] {
  const out: { date: Date; hijri: HijriDate; occasion: Occasion }[] = []
  for (let i = 0; i < 400 && out.length < limit; i++) {
    const date = addDays(from, i)
    const hijri = toHijri(date, 'UTC', offsetDays)
    for (const o of occasionsFor(hijri, date.getUTCDay())) {
      if (o.title.startsWith('يوم الاثنين') || o.title.startsWith('يوم الخميس') || o.title === 'من الأيام البيض' || o.title === 'من أيام التشريق') continue
      out.push({ date, hijri, occasion: o })
    }
  }
  return out.slice(0, limit)
}
