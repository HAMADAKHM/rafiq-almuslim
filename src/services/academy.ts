// تقدم المتعلم في الأكاديمية: الدروس المنجزة، ونتائج الاختبارات، والنقاط والإنجازات، والمسابقة اليومية.
// يُحفظ لكل ملف على الجهاز (الشخص نفسه أو أحد الأطفال)، ولا يُرسل إلى أي خادم.
import { kv } from '../db/repos'
import { allLessons } from '../content/academy/courses'
import type { QuizQ } from '../content/academy/types'
import { dayIndex } from './daily'

export interface Progress {
  lessons: Record<string, number>
  quizzes: Record<string, { best: number; total: number; at: number }>
  points: number
  badges: string[]
  daily: Record<string, number>
  streak: { last: string; count: number }
}
const EMPTY: Progress = { lessons: {}, quizzes: {}, points: 0, badges: [], daily: {}, streak: { last: '', count: 0 } }
const key = (pid: string) => `academy:progress:${pid}`
export const loadProgress = async (pid = 'self'): Promise<Progress> => ({ ...EMPTY, ...(await kv.get<Partial<Progress>>(key(pid), {})) })
const save = (pid: string, p: Progress) => kv.set(key(pid), p)

export const BADGES: Record<string, { title: string; hint: string }> = {
  'first-lesson': { title: 'أول درس', hint: 'أنهيت أول درس' },
  'first-quiz': { title: 'أول اختبار', hint: 'أجبت عن أول اختبار' },
  perfect: { title: 'العلامة الكاملة', hint: 'أجبت عن كل أسئلة اختبار إجابة صحيحة' },
  'five-quizzes': { title: 'مجتهد', hint: 'أكملت خمسة اختبارات' },
  'ten-lessons': { title: 'طالب علم', hint: 'أنهيت عشرة دروس' },
  'streak-3': { title: 'مواظب', hint: 'تعلمت ثلاثة أيام متتالية' },
  'streak-7': { title: 'مثابر', hint: 'تعلمت سبعة أيام متتالية' },
  'daily-5': { title: 'بطل المسابقة', hint: 'أكملت المسابقة اليومية خمس مرات' },
}

function prevDay(day: string) {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
function touch(p: Progress, day: string) {
  if (p.streak.last === day) return
  p.streak = { last: day, count: p.streak.last === prevDay(day) ? p.streak.count + 1 : 1 }
}
function award(p: Progress, id: string, got: string[]) { if (!p.badges.includes(id)) { p.badges.push(id); got.push(id) } }
function checkBadges(p: Progress, got: string[]) {
  if (Object.keys(p.lessons).length >= 1) award(p, 'first-lesson', got)
  if (Object.keys(p.lessons).length >= 10) award(p, 'ten-lessons', got)
  if (Object.keys(p.quizzes).length >= 1) award(p, 'first-quiz', got)
  if (Object.keys(p.quizzes).length >= 5) award(p, 'five-quizzes', got)
  if (p.streak.count >= 3) award(p, 'streak-3', got)
  if (p.streak.count >= 7) award(p, 'streak-7', got)
  if (Object.keys(p.daily).length >= 5) award(p, 'daily-5', got)
}

export async function markLesson(lessonKey: string, day: string, pid = 'self') {
  const p = await loadProgress(pid)
  const got: string[] = []
  if (!p.lessons[lessonKey]) { p.lessons[lessonKey] = Date.now(); p.points += 5 }
  touch(p, day); checkBadges(p, got)
  await save(pid, p)
  return got
}

/**
 * نتيجة اختبار: النقاط عن التحسن فقط (10 لكل إجابة صحيحة جديدة، و20 للعلامة الكاملة أول مرة)
 * حتى لا تُجمع النقاط بإعادة الاختبار نفسه.
 */
export async function recordQuiz(quizKey: string, correct: number, total: number, day: string, pid = 'self') {
  const p = await loadProgress(pid)
  const got: string[] = []
  const prev = p.quizzes[quizKey]?.best ?? 0
  let gained = Math.max(0, correct - prev) * 10
  if (correct === total && prev < total) { gained += 20; award(p, 'perfect', got) }
  p.quizzes[quizKey] = { best: Math.max(prev, correct), total, at: Date.now() }
  p.points += gained
  touch(p, day); checkBadges(p, got)
  await save(pid, p)
  return { gained, badges: got }
}

export async function recordDaily(day: string, correct: number, pid = 'self') {
  const p = await loadProgress(pid)
  const got: string[] = []
  let gained = 0
  if (p.daily[day] == null) { gained = correct * 10; p.points += gained }
  p.daily[day] = Math.max(p.daily[day] ?? 0, correct)
  touch(p, day); checkBadges(p, got)
  await save(pid, p)
  return { gained, badges: got }
}

/** كل الأسئلة مع مصدرها */
export function questionPool(kidsOnly = false): { q: QuizQ; course: string; lesson: string }[] {
  return allLessons().filter(({ lesson }) => !kidsOnly || lesson.kids).flatMap(({ course, lesson }) => (lesson.quiz ?? []).map((q) => ({ q, course: course.id, lesson: lesson.id })))
    .filter((x, i, a) => a.findIndex((y) => y.q.id === x.q.id) === i)
}

/** المسابقة اليومية: خمسة أسئلة ثابتة لليوم نفسه، متدرجة الصعوبة */
export function dailyQuestions(day: string, kidsOnly = false, n = 5): QuizQ[] {
  const pool = questionPool(kidsOnly).map((x) => x.q).sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))
  if (!pool.length) return []
  const start = (dayIndex(day) * 7) % pool.length
  const out: QuizQ[] = []
  for (let i = 0; out.length < Math.min(n, pool.length); i++) {
    const q = pool[(start + i * 3) % pool.length]
    if (!out.includes(q)) out.push(q)
  }
  return out.sort((a, b) => a.level - b.level)
}

/** تطبيع إجابة «أكمل الفراغ»: دون تشكيل وهمزات وأل التعريف */
export function fillMatches(input: string, answer: string): boolean {
  const n = (s: string) => s.trim().replace(/[ً-ْٰـ]/g, '').replace(/[آأإ]/g, 'ا').replace(/ة/g, 'ه').replace(/^ال/, '').replace(/\s+/g, ' ')
  return !!input.trim() && n(input) === n(answer)
}
