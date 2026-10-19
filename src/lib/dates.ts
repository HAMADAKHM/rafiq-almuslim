// أدوات التاريخ والمناطق الزمنية. كل الحسابات تعتمد Intl المدمجة في المتصفح
// (تتضمن قاعدة بيانات المناطق الزمنية والتوقيت الصيفي والتقويم الهجري أم القرى).

/** مفتاح اليوم YYYY-MM-DD في منطقة زمنية معينة. */
export function dayKey(date: Date = new Date(), timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** مكونات التاريخ (سنة/شهر/يوم) كما تُرى في المنطقة الزمنية المحددة. */
export function dateParts(date: Date, timeZone?: string): { y: number; m: number; d: number } {
  const [y, m, d] = dayKey(date, timeZone).split('-').map(Number)
  return { y, m, d }
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

export function formatTime(date: Date, timeZone?: string, locale = 'ar'): string {
  return new Intl.DateTimeFormat(locale + '-u-nu-latn', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

export function formatGregorian(date: Date, timeZone?: string, locale = 'ar'): string {
  return new Intl.DateTimeFormat(locale + '-u-nu-latn', { timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

/**
 * التاريخ الهجري وفق تقويم أم القرى (Intl: islamic-umalqura).
 * offsetDays يسمح للمستخدم بمطابقة إعلان رؤية الهلال المحلي (±2 يوم).
 */
export function formatHijri(date: Date, timeZone?: string, offsetDays = 0, locale = 'ar'): string {
  const d = addDays(date, offsetDays)
  return new Intl.DateTimeFormat(locale + '-u-ca-islamic-umalqura-nu-latn', { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

/** المدة المتبقية بصيغة س:د:ث */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':')
}

/** عدد الأيام بين مفتاحي يوم (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000)
}

export function shiftDayKey(key: string, days: number): string {
  return new Date(Date.parse(key + 'T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10)
}
