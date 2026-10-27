// خطط ختم القرآن: أكثر من خطة، بمدة مستهدفة أو بعدد صفحات يومي، مع سجل وختمات سابقة.
// التقدم يُسجَّل بإجراء صريح من المستخدم (لا يُعدّ فتح الصفحة قراءةً مؤكدة).
import { kv, reading } from '../db/repos'
import { daysBetween, shiftDayKey } from '../lib/dates'
import { pageRange, type QuranMeta } from './quran'

export const TOTAL_PAGES = 604

export interface KhatmaPlan {
  id: string
  name: string
  /** 'days': إنهاء الختمة خلال targetDays يومًا. 'pages': عدد صفحات ثابت يوميًا */
  mode: 'days' | 'pages'
  targetDays: number
  pagesPerDay: number
  /** الصفحة التالية المطلوب قراءتها (1..604) */
  nextPage: number
  startedAt: string
  status: 'active' | 'paused' | 'done'
  completedAt?: string
  /** سجل القراءة داخل الخطة */
  log: { date: string; from: number; to: number }[]
  /** صفحة البداية (للخطط المنشأة منذ 1.0؛ القديمة تُستنتج من السجل) */
  startPage?: number
  /** الدقائق المتاحة يوميًا إن أُنشئت الخطة بالوقت (للعرض فقط) */
  minutesPerDay?: number
  /** الوتيرة الأصلية (صفحات/يوم) لخطط المدة؛ لا تتغير عند تمديد الموعد */
  basePace?: number
}

export interface KhatmaState {
  plans: KhatmaPlan[]
  /** عدد ختمات أُكملت في نظام «الورد» القديم (إصدار 0.1) */
  legacyCompleted: number
}

const KEY = 'khatmas'

function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** يقرأ الخطط، ويرحّل «الورد اليومي» من الإصدار 0.1 دون فقدان موضعه أو عدد ختماته. */
export async function loadKhatmas(): Promise<KhatmaState> {
  const state = await kv.get<KhatmaState | null>(KEY, null)
  if (state) return state
  const legacy = await kv.get<{ pagesPerDay: number; nextPage: number; startedAt: string; khatmas: number; lastDone?: string } | null>('wird', null)
  const migrated: KhatmaState = { plans: [], legacyCompleted: legacy?.khatmas ?? 0 }
  if (legacy) {
    migrated.plans.push({
      id: newId(), name: 'وردي اليومي', mode: 'pages', targetDays: Math.ceil(TOTAL_PAGES / legacy.pagesPerDay),
      pagesPerDay: legacy.pagesPerDay, nextPage: legacy.nextPage, startedAt: legacy.startedAt || legacy.lastDone || '',
      status: 'active', log: legacy.lastDone ? [{ date: legacy.lastDone, from: Math.max(1, legacy.nextPage - legacy.pagesPerDay), to: legacy.nextPage - 1 }] : [],
    })
  }
  await kv.set(KEY, migrated)
  return migrated
}

export async function saveKhatmas(s: KhatmaState) {
  await kv.set(KEY, s)
}

export function createPlan(opts: { name?: string; mode: 'days' | 'pages'; targetDays?: number; pagesPerDay?: number; startPage?: number; minutesPerDay?: number; today: string }): KhatmaPlan {
  const targetDays = Math.max(1, Math.round(opts.targetDays ?? 30))
  const pagesPerDay = Math.max(1, Math.round(opts.pagesPerDay ?? Math.ceil(TOTAL_PAGES / targetDays)))
  return {
    id: newId(), name: opts.name?.trim() || (opts.minutesPerDay ? `${opts.minutesPerDay} دقيقة يوميًا` : opts.mode === 'days' ? `ختمة في ${targetDays} يومًا` : `${pagesPerDay} صفحات يوميًا`),
    mode: opts.mode, targetDays, pagesPerDay, nextPage: Math.min(TOTAL_PAGES, Math.max(1, opts.startPage ?? 1)),
    startedAt: opts.today, status: 'active', log: [],
    startPage: Math.min(TOTAL_PAGES, Math.max(1, opts.startPage ?? 1)),
    basePace: Math.max(1, Math.ceil((TOTAL_PAGES - Math.min(TOTAL_PAGES, Math.max(1, opts.startPage ?? 1)) + 1) / targetDays)),
    ...(opts.minutesPerDay ? { minutesPerDay: opts.minutesPerDay } : {}),
  }
}

export function pagesReadOn(plan: KhatmaPlan, date: string): number {
  return plan.log.filter((l) => l.date === date).reduce((n, l) => n + (l.to - l.from + 1), 0)
}

/**
 * حصيلة آخر 7 أيام (اليوم وستة قبله) مقابل هدف أسبوعي تقريبي = ورد اليوم × 7،
 * دون تجاوز الصفحات المتبقية في الختمة عند بداية الأسبوع.
 */
export function weekStats(plan: KhatmaPlan, today: string): { read: number; target: number; activeDays: number } {
  const days = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, -i))
  const per = days.map((d) => pagesReadOn(plan, d))
  const read = per.reduce((a, b) => a + b, 0)
  const t = dailyTarget(plan, today)
  const remainingAtWeekStart = TOTAL_PAGES - (plan.nextPage - read) + 1
  return { read, target: Math.max(1, Math.min(t.pages * 7, remainingAtWeekStart)), activeDays: per.filter((n) => n > 0).length }
}

/** متوسط تقديري لدقائق قراءة الصفحة (يعدّله المستخدم؛ لا يُعرض كحقيقة) */
export const DEFAULT_MINUTES_PER_PAGE = 2
export const pagesForMinutes = (minutes: number, minPerPage = DEFAULT_MINUTES_PER_PAGE) => Math.max(1, Math.round(minutes / Math.max(0.5, minPerPage)))

/**
 * حالة الجدول في خطط المدة: إذا ارتفع ورد اليوم كثيرًا عن الوتيرة الأصلية (بسبب أيام لم يُقرأ فيها)
 * يُقترح تمديد الموعد بدل مضاعفة الورد. لا يُعرض ذلك كتقصير.
 */
export function scheduleStatus(plan: KhatmaPlan, today: string): { behind: boolean; originalPace: number; currentPace: number; extendDays: number } {
  const t = dailyTarget(plan, today)
  const originalPace = basePaceOf(plan)
  if (plan.mode !== 'days' || plan.status !== 'active') return { behind: false, originalPace, currentPace: t.pages, extendDays: 0 }
  const remainingAtStart = TOTAL_PAGES - (plan.nextPage - t.doneToday) + 1
  const daysNeeded = Math.ceil(remainingAtStart / originalPace)
  const extendDays = Math.max(0, daysNeeded - t.daysLeft)
  return { behind: t.pages > Math.ceil(originalPace * 1.25) && extendDays > 0, originalPace, currentPace: t.pages, extendDays }
}

function basePaceOf(plan: KhatmaPlan): number {
  if (plan.basePace) return plan.basePace
  const start = plan.startPage ?? plan.log[0]?.from ?? 1
  return Math.max(1, Math.ceil((TOTAL_PAGES - start + 1) / plan.targetDays))
}

/** تمديد الموعد مع الإبقاء على الوتيرة الأصلية مرجعًا */
export const extendPlan = (plan: KhatmaPlan, days: number): KhatmaPlan => ({ ...plan, basePace: basePaceOf(plan), targetDays: plan.targetDays + Math.max(0, Math.round(days)) })

/** الجزء الحالي وعدد الأجزاء المكتملة في الخطة */
export function juzProgress(plan: KhatmaPlan, juzStartPages: number[]): { current: number; completed: number } {
  // juzStartPages[j-1] = أول صفحة في الجزء j
  let current = 1
  for (let j = 1; j <= 30; j++) if (juzStartPages[j - 1] <= Math.min(plan.nextPage, TOTAL_PAGES)) current = j
  let completed = 0
  for (let j = 1; j <= 30; j++) {
    const nextStart = j < 30 ? juzStartPages[j] : TOTAL_PAGES + 1
    if (plan.status === 'done' || nextStart <= plan.nextPage) completed = j
  }
  return { current: plan.status === 'done' ? 30 : current, completed }
}

export function remainingPages(plan: KhatmaPlan): number {
  return plan.status === 'done' ? 0 : TOTAL_PAGES - plan.nextPage + 1
}

/** الورد المطلوب اليوم بحسب المدة المتبقية والموضع الحالي. */
export function dailyTarget(plan: KhatmaPlan, today: string): { pages: number; from: number; to: number; doneToday: number; daysLeft: number } {
  const doneToday = pagesReadOn(plan, today)
  // نحسب الهدف من الموضع في بداية اليوم حتى لا يتغير بعد القراءة
  const startOfDayPage = plan.nextPage - doneToday
  const remainingAtStart = TOTAL_PAGES - startOfDayPage + 1
  let pages: number
  let daysLeft: number
  if (plan.mode === 'days') {
    const elapsed = Math.max(0, daysBetween(plan.startedAt, today))
    daysLeft = Math.max(1, plan.targetDays - elapsed)
    pages = Math.ceil(remainingAtStart / daysLeft)
  } else {
    pages = plan.pagesPerDay
    daysLeft = Math.ceil(remainingAtStart / plan.pagesPerDay)
  }
  pages = Math.max(1, Math.min(pages, remainingAtStart))
  return { pages, from: startOfDayPage, to: Math.min(TOTAL_PAGES, startOfDayPage + pages - 1), doneToday, daysLeft }
}

export function progress(plan: KhatmaPlan): number {
  return plan.status === 'done' ? 1 : (plan.nextPage - 1) / TOTAL_PAGES
}

/**
 * تسجيل قراءة صفحات من الموضع الحالي حتى الصفحة `toPage` (تشمله).
 * يضيف سجلًا لإحصائيات القراءة العامة ويُنهي الخطة عند بلوغ الصفحة 604.
 */
export async function recordPages(state: KhatmaState, planId: string, toPage: number, meta: QuranMeta, today: string): Promise<KhatmaState> {
  const plan = state.plans.find((p) => p.id === planId)
  if (!plan || plan.status === 'done') return state
  const from = plan.nextPage
  const to = Math.min(TOTAL_PAGES, Math.max(from, toPage))
  for (let pg = from; pg <= to; pg++) {
    const r = pageRange(meta, pg)!
    for (let s = r.from.surah; s <= r.to.surah; s++) {
      const a = s === r.from.surah ? r.from.ayah : 1
      const b = s === r.to.surah ? r.to.ayah : meta.surahs[s - 1].count
      await reading.log({ date: today, surah: s, from: a, to: b, ayahs: b - a + 1, pages: s === r.from.surah ? [pg] : [] })
    }
  }
  const updated: KhatmaPlan = { ...plan, nextPage: to + 1, log: [...plan.log, { date: today, from, to }] }
  if (to >= TOTAL_PAGES) { updated.status = 'done'; updated.completedAt = today; updated.nextPage = TOTAL_PAGES + 1 }
  const next = { ...state, plans: state.plans.map((p) => (p.id === planId ? updated : p)) }
  await saveKhatmas(next)
  return next
}

export function activePlan(state: KhatmaState): KhatmaPlan | undefined {
  return state.plans.find((p) => p.status === 'active')
}

export function completedCount(state: KhatmaState): number {
  return state.legacyCompleted + state.plans.filter((p) => p.status === 'done').length
}

/**
 * الأيام المتبقية تقديريًا بحسب معدل القراءة الفعلي المسجَّل في الخطة خلال آخر 14 يومًا
 * (صفحات مسجلة ÷ 14). null إن لم تُسجَّل قراءة فيها — لا تقدير بلا بيانات.
 */
export function actualPaceEta(plan: KhatmaPlan, today: string, windowDays = 14): { pagesPerDay: number; days: number } | null {
  const since = shiftDayKey(today, -(windowDays - 1))
  const pages = plan.log.filter((l) => l.date >= since && l.date <= today).reduce((n, l) => n + Math.max(0, l.to - l.from + 1), 0)
  if (!pages) return null
  const remaining = Math.max(0, TOTAL_PAGES - plan.nextPage + 1)
  const rate = pages / windowDays
  return { pagesPerDay: Math.round(rate * 10) / 10, days: Math.ceil(remaining / rate) }
}
