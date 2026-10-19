// جدولة المراجعة للحفظ: نسخة مبسطة من خوارزمية SM-2 (التكرار المتباعد)
// مبنية على سجل المحاولات وتقييم المستخدم اليدوي لمستوى الإتقان.
import { shiftDayKey } from '../lib/dates'

export type SegmentStatus = 'new' | 'learning' | 'memorized' | 'review'
export const STATUS_LABELS: Record<SegmentStatus, string> = {
  new: 'جديد', learning: 'قيد الحفظ', memorized: 'محفوظ', review: 'يحتاج إلى مراجعة',
}

/** 0: لم أتذكر، 1: بصعوبة، 2: جيد، 3: متقن */
export type Grade = 0 | 1 | 2 | 3
export const GRADE_LABELS: Record<Grade, string> = { 0: 'لم أتذكّر', 1: 'بصعوبة', 2: 'جيد', 3: 'متقن' }

export interface SrsState {
  status: SegmentStatus
  ease: number
  interval: number
  reps: number
  lapses: number
  due: string // YYYY-MM-DD
}

export function initialSrs(today: string): SrsState {
  return { status: 'new', ease: 2.5, interval: 0, reps: 0, lapses: 0, due: today }
}

export function applyGrade(s: SrsState, grade: Grade, today: string): SrsState {
  const next = { ...s }
  if (grade === 0) {
    next.lapses += 1
    next.reps = 0
    next.interval = 1
    next.ease = Math.max(1.3, s.ease - 0.2)
    next.status = s.status === 'new' || s.status === 'learning' ? 'learning' : 'review'
  } else {
    next.reps += 1
    const q = grade + 2 // تحويل 1..3 إلى مقياس SM-2 (3..5)
    next.ease = Math.max(1.3, s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
    if (next.reps === 1) next.interval = grade === 1 ? 1 : grade === 2 ? 1 : 3
    else if (next.reps === 2) next.interval = grade === 1 ? 2 : grade === 2 ? 3 : 6
    else next.interval = Math.max(1, Math.round(s.interval * (grade === 1 ? 1.2 : next.ease) * (grade === 3 ? 1.3 : 1)))
    next.status = next.reps >= 2 && grade >= 2 ? 'memorized' : 'learning'
  }
  next.due = shiftDayKey(today, next.interval)
  return next
}

/** هل المقطع مستحق للمراجعة اليوم؟ يُحدَّث الوضع إلى "يحتاج إلى مراجعة" للمقاطع المحفوظة المستحقة. */
export function effectiveStatus(s: SrsState, today: string): SegmentStatus {
  if (s.status === 'memorized' && s.due <= today) return 'review'
  return s.status
}

/** تقسيم نطاق آيات إلى مقاطع صغيرة */
export function splitRange(from: number, to: number, size: number): [number, number][] {
  const out: [number, number][] = []
  for (let a = from; a <= to; a += size) out.push([a, Math.min(to, a + size - 1)])
  return out
}
