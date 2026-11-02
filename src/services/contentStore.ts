// نظام المحتوى والمصادر: حِزم محتوى تُستورد من ملف أو رابط (دون إصدار جديد للتطبيق)، ولكل عنصر مصدره وحالة مراجعته.
// - شرح الأحاديث وفوائدها لا تُكتب في التطبيق: تُستورد من حزمة تذكر الكتاب ومؤلفه وطبعته وصفحته.
// - الدروس والأسئلة المستوردة تُضاف إلى مقرراتها بعلامة «مستورد» وحالة مراجعتها.
// - المحتوى غير المعتمد يظهر بعلامة واضحة، ويمكن إخفاؤه كله من الإعدادات.
import { kv } from '../db/repos'
import type { AcademyLesson, QuizQ, Review, SourceRef } from '../content/academy/types'
import { BOOKS, type BookId } from './hadithLib'

export const PACK_FORMAT = 'rafiq-content-pack'

export type PackItem =
  | { kind: 'hadith-note'; book: BookId; n: number; sharh?: string; fawaid?: string[]; source: SourceRef; review: Review }
  | { kind: 'lesson'; course: string; lesson: AcademyLesson }
  | { kind: 'quiz'; course: string; lessonId: string; questions: QuizQ[]; source: SourceRef; review: Review }

export interface ContentPack {
  format: typeof PACK_FORMAT
  version: 1
  id: string
  title: string
  publisher?: string
  items: PackItem[]
  /** يُضاف عند الاستيراد */
  importedAt?: number
  origin?: string
}

const KEY = 'content:packs'
const STATUSES = ['approved', 'review', 'incomplete']
const VERIF = ['primary', 'secondary', 'unverified']
const BLOCKS = ['text', 'steps', 'quran', 'hadith', 'link', 'timeline', 'madhab', 'list']

const str = (v: unknown, max = 20000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max
function checkSource(s: unknown, where: string, errs: string[]) {
  const x = s as SourceRef | undefined
  if (!x || !str(x.title, 300)) errs.push(`${where}: يجب ذكر اسم المصدر (source.title)`)
}
function checkReview(r: unknown, where: string, errs: string[]) {
  const x = r as Review | undefined
  if (!x || !STATUSES.includes(x.status)) errs.push(`${where}: حالة المراجعة يجب أن تكون approved أو review أو incomplete`)
  else if (!VERIF.includes(x.verification)) errs.push(`${where}: درجة التحقق يجب أن تكون primary أو secondary أو unverified`)
  else if (x.status === 'approved' && !str(x.reviewer, 200)) errs.push(`${where}: المحتوى المعتمد يجب أن يذكر اسم المراجع العلمي (review.reviewer)`)
}

/** التحقق من الحزمة قبل الاستيراد: أي خطأ يرفض الحزمة كاملة */
export function validatePack(x: unknown): { ok: true; pack: ContentPack } | { ok: false; errors: string[] } {
  const errs: string[] = []
  const p = x as ContentPack
  if (!p || typeof p !== 'object') return { ok: false, errors: ['الملف ليس حزمة محتوى'] }
  if (p.format !== PACK_FORMAT) errs.push(`صيغة الملف يجب أن تكون "${PACK_FORMAT}"`)
  if (p.version !== 1) errs.push('إصدار الصيغة غير مدعوم')
  if (!str(p.id, 80) || !/^[a-z0-9._-]+$/i.test(p.id)) errs.push('معرّف الحزمة (id) مطلوب بحروف لاتينية وأرقام')
  if (!str(p.title, 200)) errs.push('عنوان الحزمة مطلوب')
  if (!Array.isArray(p.items) || !p.items.length) errs.push('الحزمة لا تحتوي عناصر')
  else if (p.items.length > 5000) errs.push('الحزمة كبيرة جدًا')
  ;(Array.isArray(p.items) ? p.items : []).forEach((it, i) => {
    const w = `العنصر ${i + 1}`
    if (it?.kind === 'hadith-note') {
      if (!BOOKS.some((b) => b.id === it.book)) errs.push(`${w}: كتاب غير معروف`)
      if (!Number.isInteger(it.n) || it.n < 1) errs.push(`${w}: رقم الحديث غير صالح`)
      if (!str(it.sharh) && !(Array.isArray(it.fawaid) && it.fawaid.every((f) => str(f, 2000)) && it.fawaid.length)) errs.push(`${w}: لا يوجد شرح ولا فوائد`)
      checkSource(it.source, w, errs); checkReview(it.review, w, errs)
    } else if (it?.kind === 'lesson') {
      const l = it.lesson
      if (!str(it.course, 60)) errs.push(`${w}: المقرر مطلوب`)
      if (!l || !str(l.id, 80) || !str(l.title, 200) || !Array.isArray(l.blocks) || !l.blocks.length) errs.push(`${w}: الدرس ناقص (id أو title أو blocks)`)
      else {
        if (l.blocks.some((b) => !BLOCKS.includes(b?.type))) errs.push(`${w}: نوع فقرة غير مدعوم`)
        if (!Array.isArray(l.sources) || !l.sources.length) errs.push(`${w}: يجب ذكر مصدر واحد على الأقل`)
        else l.sources.forEach((s, k) => checkSource(s, `${w} المصدر ${k + 1}`, errs))
        checkReview(l.review, w, errs)
        if (l.blocks.some((b) => b.type === 'link' && /^https?:/i.test(b.to))) errs.push(`${w}: الروابط الخارجية غير مسموحة داخل الدروس`)
      }
    } else if (it?.kind === 'quiz') {
      if (!Array.isArray(it.questions) || !it.questions.length) errs.push(`${w}: لا أسئلة`)
      else it.questions.forEach((q, k) => { if (!str(q?.q, 500) || !str(q?.explain, 2000)) errs.push(`${w} السؤال ${k + 1}: نص السؤال وشرح الإجابة مطلوبان`) })
      checkSource(it.source, w, errs); checkReview(it.review, w, errs)
    } else errs.push(`${w}: نوع غير معروف`)
  })
  return errs.length ? { ok: false, errors: errs.slice(0, 30) } : { ok: true, pack: p }
}

export const listPacks = () => kv.get<ContentPack[]>(KEY, [])

export async function importPack(raw: unknown, origin: string): Promise<{ ok: true; pack: ContentPack; replaced: boolean } | { ok: false; errors: string[] }> {
  const v = validatePack(raw)
  if (!v.ok) return v
  const list = await listPacks()
  const replaced = list.some((p) => p.id === v.pack.id)
  const next = [{ ...v.pack, importedAt: Date.now(), origin }, ...list.filter((p) => p.id !== v.pack.id)]
  await kv.set(KEY, next)
  return { ok: true, pack: v.pack, replaced }
}

/** استيراد من رابط https فقط (تحديث المحتوى دون إصدار جديد) */
export async function importFromUrl(url: string, fetcher: typeof fetch = fetch) {
  if (!/^https:\/\//i.test(url)) return { ok: false as const, errors: ['الرابط يجب أن يبدأ بـ https://'] }
  let json: unknown
  try {
    const r = await fetcher(url)
    if (!r.ok) return { ok: false as const, errors: [`تعذر التحميل (${r.status})`] }
    json = await r.json()
  } catch { return { ok: false as const, errors: ['تعذر تحميل الملف أو قراءته'] } }
  return importPack(json, url)
}

export async function removePack(id: string) {
  await kv.set(KEY, (await listPacks()).filter((p) => p.id !== id))
}

/** إظهار المحتوى غير المعتمد (بعلامته) */
export const loadShowUnreviewed = () => kv.get<boolean>('content:showUnreviewed', true)
export const saveShowUnreviewed = (v: boolean) => kv.set('content:showUnreviewed', v)

export function hadithNotes(packs: ContentPack[], book: BookId, n: number) {
  return packs.flatMap((p) => p.items.filter((it): it is Extract<PackItem, { kind: 'hadith-note' }> => it.kind === 'hadith-note' && it.book === book && it.n === n).map((it) => ({ ...it, pack: p.title })))
}
export function importedLessons(packs: ContentPack[], course: string): AcademyLesson[] {
  return packs.flatMap((p) => p.items.filter((it): it is Extract<PackItem, { kind: 'lesson' }> => it.kind === 'lesson' && it.course === course).map((it) => ({ ...it.lesson, id: `pack:${p.id}:${it.lesson.id}` })))
}
export function importedQuiz(packs: ContentPack[], course: string, lessonId: string): QuizQ[] {
  return packs.flatMap((p) => p.items.filter((it): it is Extract<PackItem, { kind: 'quiz' }> => it.kind === 'quiz' && it.course === course && it.lessonId === lessonId).flatMap((it) => it.questions))
}

/** قالب فارغ للحزمة يوضح الصيغة (بلا أي محتوى ديني) */
export const PACK_TEMPLATE: ContentPack = {
  format: PACK_FORMAT, version: 1, id: 'my-pack', title: 'اسم الحزمة', publisher: 'الجهة الناشرة',
  items: [
    { kind: 'hadith-note', book: 'bukhari', n: 1, sharh: '<نص الشرح كما في المصدر>', fawaid: ['<فائدة كما في المصدر>'],
      source: { title: '<اسم كتاب الشرح>', author: '<المؤلف>', edition: '<الطبعة>', page: '<الجزء/الصفحة>' },
      review: { status: 'review', verification: 'secondary', reviewer: '', reviewedAt: '' } },
  ],
}
