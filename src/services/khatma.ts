// خطط ختم القرآن: أكثر من خطة، بمدة مستهدفة أو بعدد صفحات يومي، مع سجل وختمات سابقة.
// التقدم يُسجَّل بإجراء صريح من المستخدم (لا يُعدّ فتح الصفحة قراءةً مؤكدة).
import { kv, reading } from '../db/repos'
import { daysBetween } from '../lib/dates'
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

export function createPlan(opts: { name?: string; mode: 'days' | 'pages'; targetDays?: number; pagesPerDay?: number; startPage?: number; today: string }): KhatmaPlan {
  const targetDays = Math.max(1, Math.round(opts.targetDays ?? 30))
  const pagesPerDay = Math.max(1, Math.round(opts.pagesPerDay ?? Math.ceil(TOTAL_PAGES / targetDays)))
  return {
    id: newId(), name: opts.name?.trim() || (opts.mode === 'days' ? `ختمة في ${targetDays} يومًا` : `${pagesPerDay} صفحات يوميًا`),
    mode: opts.mode, targetDays, pagesPerDay, nextPage: Math.min(TOTAL_PAGES, Math.max(1, opts.startPage ?? 1)),
    startedAt: opts.today, status: 'active', log: [],
  }
}

export function pagesReadOn(plan: KhatmaPlan, date: string): number {
  return plan.log.filter((l) => l.date === date).reduce((n, l) => n + (l.to - l.from + 1), 0)
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
