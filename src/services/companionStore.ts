// حالة «رفيقي يذكّرني» على الجهاز: الأذكار المكتملة اليوم، وموضع القراءة الفعلية.
import { kv } from '../db/repos'
import { dayKey } from '../lib/dates'
import type { QuranPosition } from './companion'
import type { LastRead } from '../features/quran/QuranIndexPage'

export const DONE_KEY = 'companion:done'
export const ACTUAL_KEY = 'quran:actual'

export async function loadDoneToday(tz?: string): Promise<{ date: string; ids: string[] }> {
  const today = dayKey(new Date(), tz)
  const v = await kv.get<{ date: string; ids: string[] } | null>(DONE_KEY, null)
  return v && v.date === today ? v : { date: today, ids: [] }
}

/** «قرأت الذكر» أو زر «تمّ» في الإشعار: لا يُعاد هذا الذكر في بقية اليوم */
export async function markDhikrDone(id: string, tz?: string) {
  const cur = await loadDoneToday(tz)
  if (cur.ids.includes(id)) return
  await kv.set(DONE_KEY, { date: cur.date, ids: [...cur.ids, id].slice(-200) })
  // سجل يومي للعدد فقط (للإحصاءات)، آخر 400 يوم
  const days = await kv.get<Record<string, number>>(DONE_DAYS_KEY, {})
  days[cur.date] = (days[cur.date] ?? 0) + 1
  const keys = Object.keys(days).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete days[k]
  await kv.set(DONE_DAYS_KEY, days)
}

export const DONE_DAYS_KEY = 'companion:doneDays'
export async function loadDoneDays(): Promise<Record<string, number>> {
  return kv.get<Record<string, number>>(DONE_DAYS_KEY, {})
}

/** ملخص أسبوعي وشهري: أيام القراءة الفعلية (صفحة بقيت عليها، أو قراءة سجّلتها) والصفحات، والأذكار المكتملة من التذكير */
export function companionSummary(actualDays: Record<string, number[]>, readDays: Record<string, number[]>, doneDays: Record<string, number>, today: string) {
  const shift = (n: number) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
  const range = (n: number) => {
    const since = shift(n - 1)
    const dates = new Set([...Object.keys(actualDays), ...Object.keys(readDays)].filter((d) => d >= since && d <= today))
    let pages = 0
    for (const d of dates) pages += new Set([...(actualDays[d] ?? []), ...(readDays[d] ?? [])]).size
    const adhkar = Object.entries(doneDays).filter(([d]) => d >= since && d <= today).reduce((a, [, n]) => a + n, 0)
    return { readingDays: dates.size, pages, adhkar }
  }
  return { week: range(7), month: range(30) }
}

/** موضع الإشعار: آخر قراءة فعلية، وإلا آخر موضع مفتوح */
export async function loadPosition(): Promise<QuranPosition | null> {
  const actual = await kv.get<QuranPosition | null>(ACTUAL_KEY, null)
  if (actual) return actual
  const last = await kv.get<LastRead | null>('quran:last', null)
  return last ? { surah: last.surah, ayah: last.ayah, page: last.page, at: last.at } : null
}

export const ACTUAL_DAYS_KEY = 'quran:actualDays'
/** مدة البقاء على الصفحة (أو الآية) قبل اعتبارها قراءة فعلية */
export const DWELL_MS = 20_000

/** حفظ آخر قراءة فعلية وتسجيل اليوم (عدد الصفحات المختلفة المقروءة فيه) */
export async function saveActual(pos: QuranPosition, tz?: string) {
  await kv.set(ACTUAL_KEY, pos)
  const today = dayKey(new Date(pos.at), tz)
  const days = await kv.get<Record<string, number[]>>(ACTUAL_DAYS_KEY, {})
  const pages = new Set(days[today] ?? [])
  if (pos.page) pages.add(pos.page)
  days[today] = [...pages]
  // نحتفظ بآخر 400 يوم فقط
  const keys = Object.keys(days).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete days[k]
  await kv.set(ACTUAL_DAYS_KEY, days)
}

export async function loadActualDays(): Promise<Record<string, number[]>> {
  return kv.get<Record<string, number[]>>(ACTUAL_DAYS_KEY, {})
}

/** استعادة الموضع يدويًا: يجعل آخر موضع مفتوح هو موضع القراءة الفعلية */
export async function restoreActualFromLast(): Promise<QuranPosition | null> {
  const last = await kv.get<LastRead | null>('quran:last', null)
  if (!last) return null
  const pos: QuranPosition = { surah: last.surah, ayah: last.ayah, page: last.page, at: Date.now() }
  await kv.set(ACTUAL_KEY, pos)
  return pos
}
