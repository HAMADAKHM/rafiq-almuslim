// «رفيق المسلم TV بريميوم»: مزايا تظهر في نسخة بريميوم المستقلة فقط (org.rafiqalmuslim.tv.premium)،
// فوق الشاشة الحالية دون إعادة بناء ما فيها: جداول العرض الذكية، وحماية شاشات OLED، وإضافات التلاوة، والإهداء.
// منطق نقي هنا ليُختبر (premium.test.ts)، والواجهة في TvApp.
import type { DayTimes } from '../services/prayer'
import type { HijriDate } from '../services/calendar'
import type { GalleryCat } from './gallery'
import type { SceneId } from './scenes'

/** نسخة بريميوم: تطبيق Android يضيف ?ed=premium، وصفحة الويب تُبنى بـ VITE_TV_PREMIUM=1 */
export const PREMIUM = (() => {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('ed') === 'premium') return true
    return (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_TV_PREMIUM === '1'
  } catch { return false }
})()

export type ScenePick = SceneId | 'rotate' | 'classic' | 'photos' | 'gallery'
export interface SceneChoice { scene: ScenePick; galleryCat: GalleryCat }

export type OccasionId = 'ramadan' | 'eid_fitr' | 'eid_adha' | 'hajj' | 'dhul_hijjah_ten' | 'ashura' | 'friday'
export const OCCASIONS: { id: OccasionId; label: string }[] = [
  { id: 'ramadan', label: 'شهر رمضان' },
  { id: 'eid_fitr', label: 'عيد الفطر (3 أيام)' },
  { id: 'eid_adha', label: 'عيد الأضحى (4 أيام)' },
  { id: 'hajj', label: 'أيام الحج (8–13 ذو الحجة)' },
  { id: 'dhul_hijjah_ten', label: 'العشر الأوائل من ذي الحجة' },
  { id: 'ashura', label: 'يوم عاشوراء' },
  { id: 'friday', label: 'يوم الجمعة' },
]

export type TvPrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

/** متى يعمل الجدول: ساعات من اليوم، أو حول وقت صلاة، أو الليل (بعد العشاء حتى الفجر)، أو أيام الأسبوع، أو مناسبة */
export type ScheduleWhen =
  | { kind: 'hours'; from: number; to: number }
  | { kind: 'prayer'; prayer: TvPrayerName | 'all'; before: number; after: number }
  | { kind: 'night' }
  | { kind: 'weekday'; days: number[] }
  | { kind: 'occasion'; occ: OccasionId }

export interface ScheduleRule { id: string; when: ScheduleWhen; show: SceneChoice; on: boolean }

export interface PremiumSettings {
  /** جداول العرض الذكية */
  schedule: { on: boolean; rules: ScheduleRule[] }
  /** الانتقال بين المشاهد: النوع والمدة بالثواني */
  transition: { style: 'fade' | 'zoom' | 'none'; seconds: number }
  /** حماية الشاشة (OLED): إزاحة العناصر، وتبديل أماكنها، وتخفيض الإضاءة ليلًا، والوضع الاقتصادي */
  oled: { shift: boolean; swap: boolean; dim: boolean; dimLevel: number; eco: boolean }
  /** التلاوة: القراء المفضلون، وقائمة سور، وسرعة التشغيل */
  quran: { fav: string[]; playlist: number[]; speed: number }
  /** إهداء صدقة جارية باسم يختاره المستخدم، ويمكن إخفاؤه */
  dedication: { on: boolean; name: string; deceased: boolean }
}

export const DEFAULT_PREMIUM: PremiumSettings = {
  schedule: { on: false, rules: [] },
  transition: { style: 'fade', seconds: 3 },
  oled: { shift: true, swap: false, dim: false, dimLevel: 0.35, eco: false },
  quran: { fav: [], playlist: [], speed: 1 },
  dedication: { on: false, name: '', deceased: true },
}

export const SPEEDS = [0.75, 1, 1.25, 1.5]

const clamp = (n: unknown, a: number, b: number, d: number) => (typeof n === 'number' && isFinite(n) ? Math.min(b, Math.max(a, n)) : d)

function validWhen(w: unknown): ScheduleWhen | null {
  const x = w as Record<string, unknown> | null
  if (!x || typeof x !== 'object') return null
  if (x.kind === 'hours') return { kind: 'hours', from: clamp(x.from, 0, 23, 0) | 0, to: clamp(x.to, 0, 23, 0) | 0 }
  if (x.kind === 'prayer') {
    const p = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'all'].includes(x.prayer as string) ? (x.prayer as TvPrayerName | 'all') : 'all'
    return { kind: 'prayer', prayer: p, before: clamp(x.before, 0, 120, 10) | 0, after: clamp(x.after, 0, 120, 20) | 0 }
  }
  if (x.kind === 'night') return { kind: 'night' }
  if (x.kind === 'weekday') return { kind: 'weekday', days: Array.isArray(x.days) ? [...new Set(x.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) as number[])] : [] }
  if (x.kind === 'occasion' && OCCASIONS.some((o) => o.id === x.occ)) return { kind: 'occasion', occ: x.occ as OccasionId }
  return null
}

/** دمج آمن مع القيم الافتراضية (إعدادات قديمة أو ناقصة لا توقف الشاشة) */
export function normalizePremium(raw: unknown): PremiumSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof PremiumSettings, Record<string, unknown>>>
  const d = DEFAULT_PREMIUM
  const rules: ScheduleRule[] = Array.isArray(r.schedule?.rules) ? (r.schedule!.rules as unknown[]).flatMap((x, i) => {
    const o = x as Record<string, unknown>
    const when = validWhen(o?.when)
    const show = o?.show as Record<string, unknown> | undefined
    if (!when || !show || typeof show.scene !== 'string') return []
    return [{ id: typeof o.id === 'string' ? o.id : `r${i}`, when, on: o.on !== false, show: { scene: show.scene as ScenePick, galleryCat: (typeof show.galleryCat === 'string' ? show.galleryCat : 'all') as GalleryCat } }]
  }).slice(0, 20) : []
  const q = r.quran ?? {}
  const t = r.transition ?? {}
  const o = r.oled ?? {}
  const ded = r.dedication ?? {}
  return {
    schedule: { on: r.schedule?.on === true, rules },
    transition: { style: t.style === 'zoom' || t.style === 'none' ? t.style : 'fade', seconds: clamp(t.seconds, 0.5, 10, d.transition.seconds) },
    oled: {
      shift: o.shift !== false, swap: o.swap === true, dim: o.dim === true,
      dimLevel: clamp(o.dimLevel, 0.1, 0.7, d.oled.dimLevel), eco: o.eco === true,
    },
    quran: {
      fav: Array.isArray(q.fav) ? (q.fav as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 40) : [],
      playlist: Array.isArray(q.playlist) ? (q.playlist as unknown[]).filter((x): x is number => Number.isInteger(x) && (x as number) >= 1 && (x as number) <= 114).slice(0, 114) : [],
      speed: SPEEDS.includes(q.speed as number) ? (q.speed as number) : 1,
    },
    dedication: { on: ded.on === true, name: typeof ded.name === 'string' ? ded.name.slice(0, 60) : '', deceased: ded.deceased !== false },
  }
}

// ---------- المناسبات ----------
/** المناسبات الإسلامية لليوم بحسب التاريخ الهجري (تقويم أم القرى مع تعديل المستخدم) ويوم الأسبوع */
export function occasionsOn(h: HijriDate, weekday: number): OccasionId[] {
  const out: OccasionId[] = []
  if (h.month === 9) out.push('ramadan')
  if (h.month === 10 && h.day <= 3) out.push('eid_fitr')
  if (h.month === 12 && h.day >= 10 && h.day <= 13) out.push('eid_adha')
  if (h.month === 12 && h.day >= 8 && h.day <= 13) out.push('hajj')
  if (h.month === 12 && h.day <= 10) out.push('dhul_hijjah_ten')
  if (h.month === 1 && h.day === 10) out.push('ashura')
  if (weekday === 5) out.push('friday')
  return out
}

// ---------- جداول العرض ----------
export interface ScheduleCtx { now: Date; hour: number; weekday: number; times: DayTimes; occasions: OccasionId[] }

const PRIORITY: ScheduleWhen['kind'][] = ['occasion', 'prayer', 'night', 'weekday', 'hours']
const PRAYERS: TvPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

export function ruleMatches(w: ScheduleWhen, c: ScheduleCtx): boolean {
  const t = c.now.getTime()
  switch (w.kind) {
    case 'hours': return w.from === w.to ? true : w.from < w.to ? c.hour >= w.from && c.hour < w.to : c.hour >= w.from || c.hour < w.to
    case 'prayer': return (w.prayer === 'all' ? PRAYERS : [w.prayer]).some((p) => { const at = c.times[p].getTime(); return t >= at - w.before * 60_000 && t < at + w.after * 60_000 })
    case 'night': return t >= c.times.isha.getTime() || t < c.times.fajr.getTime()
    case 'weekday': return w.days.includes(c.weekday)
    case 'occasion': return c.occasions.includes(w.occ)
  }
}

/** الجدول الفعّال الآن: الأخص أولًا (مناسبة ← صلاة ← ليل ← أيام ← ساعات)، وبترتيب القائمة عند التساوي */
export function activeRule(rules: ScheduleRule[], c: ScheduleCtx): ScheduleRule | null {
  for (const k of PRIORITY) {
    const hit = rules.find((r) => r.on && r.when.kind === k && ruleMatches(r.when, c))
    if (hit) return hit
  }
  return null
}

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const PRAYER_AR: Record<TvPrayerName, string> = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' }
export const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

/** وصف الجدول بالعربية */
export function describeWhen(w: ScheduleWhen): string {
  switch (w.kind) {
    case 'hours': return `من ${hh(w.from)} إلى ${hh(w.to)}`
    case 'prayer': return `${w.prayer === 'all' ? 'حول كل صلاة' : `حول ${PRAYER_AR[w.prayer]}`}: ${w.before} د قبلها و${w.after} د بعدها`
    case 'night': return 'الليل: من العشاء حتى الفجر'
    case 'weekday': return w.days.length ? w.days.slice().sort().map((d) => DAY_NAMES[d]).join('، ') : 'لم تُختر أيام'
    case 'occasion': return OCCASIONS.find((o) => o.id === w.occ)?.label ?? ''
  }
}
export { DAY_NAMES }

/** جداول جاهزة يضيفها المستخدم بضغطة ثم يعدّلها */
export const RULE_PRESETS: { label: string; when: ScheduleWhen; show: SceneChoice }[] = [
  { label: 'الليل: من العشاء حتى الفجر', when: { kind: 'night' }, show: { scene: 'night-mosque', galleryCat: 'all' } },
  { label: 'حول أوقات الصلاة', when: { kind: 'prayer', prayer: 'all', before: 10, after: 20 }, show: { scene: 'kaaba', galleryCat: 'all' } },
  { label: 'يوم الجمعة', when: { kind: 'weekday', days: [5] }, show: { scene: 'madinah', galleryCat: 'all' } },
  { label: 'شهر رمضان', when: { kind: 'occasion', occ: 'ramadan' }, show: { scene: 'gallery', galleryCat: 'islamic' } },
  { label: 'الأعياد', when: { kind: 'occasion', occ: 'eid_fitr' }, show: { scene: 'geometry', galleryCat: 'all' } },
  { label: 'ساعات أختارها', when: { kind: 'hours', from: 6, to: 12 }, show: { scene: 'gallery', galleryCat: 'nature' } },
]

// ---------- حماية الشاشة (OLED) ----------
/** إزاحة دورية صغيرة للعناصر الثابتة (9 مواضع، كل دقيقتين)، بنسبة من عرض الشاشة */
export function pixelShift(now: Date, on: boolean): { x: number; y: number } {
  if (!on) return { x: 0, y: 0 }
  const step = Math.floor(now.getTime() / 120_000) % 9
  return { x: ((step % 3) - 1) * 0.45, y: (Math.floor(step / 3) - 1) * 0.45 }
}

/** تبديل أماكن الساعة والبطاقة كل ساعة حتى لا يبقى الساطع في مكانه */
export const swapSides = (hour: number, on: boolean) => on && hour % 2 === 1

/** شدة تعتيم الليل (0 = بلا تعتيم): بعد العشاء بنصف ساعة حتى قبل الفجر بنصف ساعة */
export function nightDim(now: Date, times: DayTimes, on: boolean, level: number): number {
  if (!on) return 0
  const t = now.getTime()
  return t >= times.isha.getTime() + 30 * 60_000 || t < times.fajr.getTime() - 30 * 60_000 ? level : 0
}

// ---------- التلاوة ----------
/** السورة التالية: من قائمة التشغيل إن وُجدت (تدور)، وإلا ما بعد الحالية */
export function nextFromPlaylist(cur: number, playlist: number[], fallback: (s: number) => number): number {
  if (!playlist.length) return fallback(cur)
  const i = playlist.indexOf(cur)
  return i < 0 ? playlist[0] : playlist[(i + 1) % playlist.length]
}

/** القراء بترتيب العرض: المفضلون أولًا */
export const orderReciters = (ids: string[], fav: string[]) => [...ids.filter((x) => fav.includes(x)), ...ids.filter((x) => !fav.includes(x))]

// ---------- الإهداء ----------
export function dedicationText(d: PremiumSettings['dedication']): string | null {
  const name = d.name.trim()
  if (!d.on || !name) return null
  return d.deceased ? `صدقة جارية عن روح ${name} — نسألكم الدعاء` : `صدقة جارية عن ${name}`
}
