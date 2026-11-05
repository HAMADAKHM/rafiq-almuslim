// التقويم الهجري والمناسبات. الحساب وفق تقويم أم القرى (Intl) مع تعديل يدوي ±2 يوم،
// لأن بدايات الشهور قد تختلف بين البلدان بحسب رؤية الهلال.
import { formatParts, partNum } from '../lib/intlParts'
import { addDays } from '../lib/dates'

export const HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة']

export interface HijriDate { day: number; month: number; year: number }

export function toHijri(date: Date, timeZone?: string, offsetDays = 0): HijriDate {
  const d = addDays(date, offsetDays)
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' })
  // متصفحات قديمة بلا تقويم أم القرى: حساب جدولي تقريبي (قد يختلف يومًا) بدل تاريخ ميلادي خاطئ
  if (!/islamic/.test(fmt.resolvedOptions().calendar ?? '')) return tabularHijri(d, timeZone)
  const parts = formatParts('en-u-ca-islamic-umalqura-nu-latn', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }, d)
  return { day: partNum(parts, 'day'), month: partNum(parts, 'month'), year: partNum(parts, 'year') }
}

/** التقويم الهجري الجدولي (الحسابي) — بديل حين لا يدعم المتصفح تقويم أم القرى */
function tabularHijri(date: Date, timeZone?: string): HijriDate {
  const p = formatParts('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }, date)
  const y = partNum(p, 'year'), m = partNum(p, 'month'), dd = partNum(p, 'day')
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3
  const jd = dd + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
  const l0 = jd - 1948440 + 10632, n = Math.floor((l0 - 1) / 10631), l1 = l0 - 10631 * n + 354
  const j = Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) + Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238)
  const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const month = Math.floor((24 * l2) / 709), day = l2 - Math.floor((709 * month) / 24), year = 30 * n + j - 30
  return { day, month, year }
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

/** طول السنة القمرية والشهر بالأيام (تقريب يكفي لنقطة البدء في البحث) */
const HIJRI_YEAR = 354.36667
const HIJRI_MONTH = 29.530589
/** 1 محرم 1 هـ ≈ 16 يوليو 622م */
const HIJRI_EPOCH = Date.UTC(622, 6, 16, 12)

/**
 * تحويل تاريخ هجري (أم القرى، مع التعديل اليدوي نفسه) إلى ميلادي. يعيد null إن لم يوجد اليوم
 * (مثل 30 من شهر عدته 29). يبحث حول التقدير بتطابق toHijri حتى تتفق النتيجة مع بقية التطبيق.
 */
export function fromHijri(year: number, month: number, day: number, offsetDays = 0): Date | null {
  if (!(year >= 1 && year <= 1600 && month >= 1 && month <= 12 && day >= 1 && day <= 30)) return null
  const est = HIJRI_EPOCH + ((year - 1) * HIJRI_YEAR + (month - 1) * HIJRI_MONTH + (day - 1)) * 86_400_000
  for (let k = 0; k <= 45; k++) {
    for (const sgn of k === 0 ? [0] : [-1, 1]) {
      const d = new Date(est + sgn * k * 86_400_000)
      const h = toHijri(d, 'UTC', offsetDays)
      if (h.year === year && h.month === month && h.day === day) return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12))
    }
  }
  return null
}

/** عدد أيام الشهر الهجري (29 أو 30) وفق الحساب */
export function hijriMonthLength(year: number, month: number, offsetDays = 0): number {
  return fromHijri(year, month, 30, offsetDays) ? 30 : 29
}

export interface YearlyDates { hijriYear: number; ramadan: Date | null; fitr: Date | null; arafah: Date | null; adha: Date | null }

/** بداية رمضان والعيدان ويوم عرفة لسنوات هجرية قادمة (محسوبة: قد تختلف يومًا بحسب الرؤية والجهة المعتمدة) */
export function upcomingYearlyDates(from: Date, years = 10, offsetDays = 0): YearlyDates[] {
  const start = toHijri(from, 'UTC', offsetDays).year
  const out: YearlyDates[] = []
  for (let y = start; y < start + years + 1 && out.length < years; y++) {
    const row = { hijriYear: y, ramadan: fromHijri(y, 9, 1, offsetDays), fitr: fromHijri(y, 10, 1, offsetDays), arafah: fromHijri(y, 12, 9, offsetDays), adha: fromHijri(y, 12, 10, offsetDays) }
    // السنة الحالية تُعرض ما لم يمض عيد الأضحى فيها
    if (row.adha && row.adha.getTime() < from.getTime() - 86_400_000) continue
    out.push(row)
  }
  return out
}
