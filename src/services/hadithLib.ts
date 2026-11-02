// مكتبة الأحاديث النبوية: نصوص الكتب السبعة من قاعدة fawazahmed0/hadith-api (ملكية عامة، النص العربي بالسند).
// - الفهرس (الكتب وأبوابها الكبرى وأرقام أحاديثها) مضمّن في التطبيق: src/content/hadithBooks.json.
// - نصوص الأحاديث تُنزَّل عند الحاجة، كتابًا فرعيًا واحدًا كل مرة، وتُحفظ على الجهاز للعمل دون إنترنت.
// - يتحدث المحتوى من المصدر دون إصدار جديد للتطبيق (يُعاد تنزيل ما يطلبه المستخدم).
// لا يُنشأ هنا أي نص أو حكم: ما لا تحويه القاعدة يُعرض «غير متوفر».
import { kv } from '../db/repos'
import INDEX from '../content/hadithBooks.json'
import { translateGrade, gradeLevel, SCHOLARS, type GradeLevel } from './hadithGrades'

export type BookId = 'bukhari' | 'muslim' | 'abudawud' | 'tirmidhi' | 'nasai' | 'ibnmajah' | 'malik'

export interface BookInfo {
  id: BookId
  name: string
  author: string
  /** وفاة المؤلف بالهجري */
  died: number
  /** تعريف موجز بمنهج الكتاب: يبيّن لماذا تظهر الأحكام لكل حديث أو لا تظهر */
  method: string
  /** هل تحوي القاعدة أحكامًا لكل حديث */
  graded: boolean
}

export const BOOKS: BookInfo[] = [
  { id: 'bukhari', name: 'صحيح البخاري', author: 'الإمام محمد بن إسماعيل البخاري', died: 256, graded: false,
    method: 'التزم مؤلفه إخراج الأحاديث الصحيحة في أصل كتابه المسند، وتلقّته الأمة بالقبول. لا توجد في قاعدة البيانات درجة منفصلة لكل حديث، والمعلّقات وتراجم الأبواب لها أحكام خاصة عند أهل العلم.' },
  { id: 'muslim', name: 'صحيح مسلم', author: 'الإمام مسلم بن الحجاج النيسابوري', died: 261, graded: false,
    method: 'التزم مؤلفه إخراج الأحاديث الصحيحة المسندة، وتلقّته الأمة بالقبول. لا توجد في قاعدة البيانات درجة منفصلة لكل حديث، وأحاديث المقدمة لها منهج مختلف عند أهل العلم.' },
  { id: 'abudawud', name: 'سنن أبي داود', author: 'الإمام سليمان بن الأشعث السجستاني', died: 275, graded: true,
    method: 'كتاب سنن يجمع الصحيح والحسن والضعيف، فلا يكفي وجود الحديث فيه دليلًا على صحته؛ لذلك تُعرض أحكام العلماء على كل حديث منسوبة إلى قائليها.' },
  { id: 'tirmidhi', name: 'جامع الترمذي', author: 'الإمام محمد بن عيسى الترمذي', died: 279, graded: true,
    method: 'يجمع الصحيح والحسن والضعيف، ويذكر المؤلف حكمه على كثير من الأحاديث في نص الكتاب نفسه، وتُعرض معه أحكام العلماء المتأخرين منسوبة إلى قائليها.' },
  { id: 'nasai', name: 'سنن النسائي', author: 'الإمام أحمد بن شعيب النسائي', died: 303, graded: true,
    method: 'السنن الصغرى (المجتبى). فيها الصحيح وغيره، لذلك تُعرض أحكام العلماء على كل حديث منسوبة إلى قائليها.' },
  { id: 'ibnmajah', name: 'سنن ابن ماجه', author: 'الإمام محمد بن يزيد ابن ماجه القزويني', died: 273, graded: true,
    method: 'فيها الصحيح والحسن والضعيف وبعض الواهي، فلا يكفي وجود الحديث فيها دليلًا على صحته؛ لذلك تُعرض أحكام العلماء على كل حديث.' },
  { id: 'malik', name: 'موطأ الإمام مالك', author: 'الإمام مالك بن أنس', died: 179, graded: true,
    method: 'فيه المرفوع والموقوف على الصحابة والمقطوع على التابعين وبلاغات المؤلف، وتُعرض أحكام المحقق على كل نص منسوبة إليه.' },
]

/** مسند الإمام أحمد: لا توجد له قاعدة كاملة مفتوحة الترخيص حاليًا، فلا يُعرض جزء منه على أنه الكتاب كاملًا */
export const UNAVAILABLE_BOOKS = [
  { name: 'مسند الإمام أحمد', author: 'الإمام أحمد بن حنبل', died: 241, reason: 'لا تتوفر حاليًا قاعدة بيانات كاملة له مفتوحة الترخيص يمكن التحقق منها. سيُضاف حين تتوفر نسخة موثوقة، ويمكن استيراده عبر نظام استيراد المحتوى.' },
]

export interface SectionInfo { n: number; en: string; ar: string | null; first: number | null; last: number | null; count: number }
interface IndexBook { id: BookId; total: number; sections: SectionInfo[] }
const IDX = INDEX as unknown as IndexBook[]

export const bookInfo = (id: string) => BOOKS.find((b) => b.id === id) ?? null
export const bookIndex = (id: string) => IDX.find((b) => b.id === id) ?? null
export const sectionTitle = (s: SectionInfo) => s.ar ?? `الكتاب رقم ${s.n}`

/** الكتاب الفرعي الذي فيه رقم الحديث (بالترقيم التسلسلي في القاعدة) */
export function sectionFor(book: BookId, num: number): SectionInfo | null {
  return bookIndex(book)?.sections.find((s) => s.first != null && s.last != null && num >= s.first && num <= s.last) ?? null
}

export interface Grade { by: string; byAr: string; raw: string; ar: string; level: GradeLevel; untranslated: boolean }
export interface Hadith {
  book: BookId
  /** الترقيم التسلسلي في القاعدة */
  n: number
  /** الرقم في الطبعة العربية (لمسلم: ترقيم محمد فؤاد عبد الباقي) إن وُجد */
  an: number | null
  text: string
  section: number
  /** الموضع في الكتاب الفرعي كما في القاعدة */
  refHadith: number
  grades: Grade[]
}

interface Raw { hadithnumber: number; arabicnumber?: number; text: string; grades?: { name: string; grade: string }[]; reference?: { book: number; hadith: number } }

function toHadith(book: BookId, r: Raw): Hadith {
  return {
    book, n: r.hadithnumber, an: typeof r.arabicnumber === 'number' ? r.arabicnumber : null, text: r.text ?? '',
    section: r.reference?.book ?? 0, refHadith: r.reference?.hadith ?? 0,
    grades: (r.grades ?? []).filter((g) => g.grade && g.grade.trim() !== '-').map((g) => {
      const t = translateGrade(g.grade)
      return { by: g.name, byAr: SCHOLARS[g.name] ?? g.name, raw: g.grade, ar: t.ar, level: gradeLevel(g.grade), untranslated: t.untranslated }
    }),
  }
}

// ---------- التنزيل والتخزين ----------
const BASES = [
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions',
  'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions',
]
export const SOURCE_NOTE = 'المصدر: قاعدة fawazahmed0/hadith-api (ملكية عامة) — النص العربي بالسند، والأحكام منسوبة إلى العلماء كما فيها.'

const secKey = (book: BookId, n: number) => `hadith:sec:${book}:${n}`
const HAVE_KEY = 'hadith:have'

async function fetchJson(path: string, fetcher: typeof fetch): Promise<unknown> {
  let last: unknown = null
  for (const base of BASES) {
    try {
      const r = await fetcher(`${base}/${path}`)
      if (r.ok) return await r.json()
      last = new Error(String(r.status))
    } catch (e) { last = e }
  }
  throw last ?? new Error('network')
}

export async function downloadedSections(): Promise<Record<string, number[]>> {
  return kv.get<Record<string, number[]>>(HAVE_KEY, {})
}
async function markHave(book: BookId, ns: number[]) {
  const have = await downloadedSections()
  have[book] = [...new Set([...(have[book] ?? []), ...ns])].sort((a, b) => a - b)
  await kv.set(HAVE_KEY, have)
}

const memo = new Map<string, Hadith[]>()

/** أحاديث كتاب فرعي: من الجهاز إن نُزّل، وإلا من الإنترنت ثم يُحفظ */
export async function loadSection(book: BookId, n: number, fetcher: typeof fetch = fetch): Promise<Hadith[]> {
  const k = secKey(book, n)
  const hit = memo.get(k)
  if (hit) return hit
  const stored = await kv.get<Raw[] | null>(k, null)
  if (stored) { const list = stored.map((r) => toHadith(book, r)); memo.set(k, list); return list }
  const j = (await fetchJson(`ara-${book}/sections/${n}.min.json`, fetcher)) as { hadiths?: Raw[] }
  const raw = (j.hadiths ?? []).filter((r) => r.text && r.text.trim())
  await kv.set(k, raw)
  await markHave(book, [n])
  const list = raw.map((r) => toHadith(book, r))
  memo.set(k, list)
  return list
}

/** تنزيل كتاب كامل للعمل دون إنترنت والبحث فيه (ملف واحد ثم تقسيمه على الكتب الفرعية) */
export async function downloadBook(book: BookId, onProgress?: (msg: string) => void, fetcher: typeof fetch = fetch): Promise<number> {
  onProgress?.('جارٍ تنزيل الكتاب…')
  const j = (await fetchJson(`ara-${book}.min.json`, fetcher)) as { hadiths?: Raw[] }
  const bySec = new Map<number, Raw[]>()
  for (const r of j.hadiths ?? []) {
    if (!r.text || !r.text.trim()) continue
    const s = r.reference?.book ?? 0
    if (!bySec.has(s)) bySec.set(s, [])
    bySec.get(s)!.push(r)
  }
  let i = 0
  for (const [s, list] of bySec) {
    await kv.set(secKey(book, s), list)
    memo.delete(secKey(book, s))
    if (++i % 10 === 0) onProgress?.(`جارٍ الحفظ على الجهاز… ${i} من ${bySec.size}`)
  }
  await markHave(book, [...bySec.keys()])
  return [...bySec.values()].reduce((a, l) => a + l.length, 0)
}

export async function removeBook(book: BookId) {
  const have = await downloadedSections()
  for (const n of have[book] ?? []) { await kv.set(secKey(book, n), null); memo.delete(secKey(book, n)) }
  delete have[book]
  await kv.set(HAVE_KEY, have)
}

/** حديث برقمه التسلسلي في كتابه */
export async function getHadith(book: BookId, num: number, fetcher: typeof fetch = fetch): Promise<Hadith | null> {
  const sec = sectionFor(book, num)
  if (!sec) return null
  return (await loadSection(book, sec.n, fetcher)).find((h) => h.n === num) ?? null
}

// ---------- النص: السند والمتن، والتطبيع للبحث ----------
/**
 * فصل السند عن المتن تقريبيًا لعرضهما بوضوح: المتن يبدأ عادةً بعلامة التنصيص الأولى في نص القاعدة.
 * إن لم توجد يُعرض النص كاملًا متنًا واحدًا (لا يُخمَّن موضع الفصل).
 */
export function splitIsnad(text: string): { isnad: string; matn: string } {
  const i = text.search(/["“«]/)
  if (i > 20 && i < text.length - 10) return { isnad: text.slice(0, i).trim(), matn: text.slice(i).trim() }
  return { isnad: '', matn: text.trim() }
}

export function normalizeAr(s: string): string {
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200F\u200E]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0621-\u064A0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type SearchMode = 'words' | 'phrase' | 'narrator'
export interface SearchHit { h: Hadith; score: number }

/** البحث في الأحاديث المنزّلة على الجهاز */
export async function searchHadith(query: string, mode: SearchMode, books: BookId[] | null, limit = 200): Promise<{ hits: SearchHit[]; searchedBooks: BookId[]; total: number }> {
  const q = normalizeAr(query)
  if (q.length < 2) return { hits: [], searchedBooks: [], total: 0 }
  const terms = q.split(' ').filter((t) => t.length > 1)
  const have = await downloadedSections()
  const hits: SearchHit[] = []
  const searched: BookId[] = []
  let total = 0
  for (const b of BOOKS) {
    if (books && !books.includes(b.id)) continue
    const secs = have[b.id] ?? []
    if (!secs.length) continue
    searched.push(b.id)
    for (const n of secs) {
      for (const h of await loadSection(b.id, n)) {
        const target = normalizeAr(mode === 'narrator' ? splitIsnad(h.text).isnad || h.text.slice(0, Math.floor(h.text.length * 0.45)) : h.text)
        const ok = mode === 'phrase' ? target.includes(q) : terms.every((t) => target.includes(t))
        if (!ok) continue
        total++
        if (hits.length < limit) hits.push({ h, score: mode === 'phrase' ? 1 : terms.length })
      }
    }
  }
  return { hits, searchedBooks: searched, total }
}

/** البحث بالموضوع: في عناوين الكتب الفرعية لكل الكتب (لا يحتاج تنزيلًا) */
export function searchTopics(query: string): { book: BookInfo; section: SectionInfo }[] {
  const q = normalizeAr(query)
  if (q.length < 2) return []
  const out: { book: BookInfo; section: SectionInfo }[] = []
  for (const b of BOOKS) for (const s of bookIndex(b.id)?.sections ?? []) if (s.ar && normalizeAr(s.ar).includes(q)) out.push({ book: b, section: s })
  return out
}

/** موضوعات جاهزة للتصفح: تجمع الكتب الفرعية ذات العنوان المتقارب من الكتب السبعة */
export const TOPICS = ['الإيمان', 'العلم', 'الطهارة', 'الصلاة', 'الجنائز', 'الزكاة', 'الصوم', 'الحج', 'النكاح', 'البيوع', 'الأطعمة', 'الأشربة', 'اللباس', 'الأدب', 'الدعوات', 'الرقاق', 'الفتن', 'التفسير', 'المناقب', 'الجهاد', 'الطب', 'الأحكام']

/** صحابة يكثر ورودهم في الأسانيد (للبحث في السند) */
export const COMPANIONS = ['أبي هريرة', 'عائشة', 'عبد الله بن عمر', 'ابن عمر', 'أنس بن مالك', 'ابن عباس', 'جابر بن عبد الله', 'أبي سعيد الخدري', 'عبد الله بن مسعود', 'عمر بن الخطاب', 'علي بن أبي طالب', 'أبي موسى', 'معاذ بن جبل', 'أم سلمة', 'أبي ذر']

/** أحاديث متقاربة في اللفظ (مقارنة آلية بين الكلمات، ضمن ما نُزّل على الجهاز) */
export async function relatedHadith(h: Hadith, limit = 5): Promise<SearchHit[]> {
  const words = (s: string) => new Set(normalizeAr(splitIsnad(s).matn).split(' ').filter((w) => w.length > 3))
  const base = words(h.text)
  if (base.size < 4) return []
  const have = await downloadedSections()
  const out: SearchHit[] = []
  for (const b of BOOKS) {
    for (const n of have[b.id] ?? []) {
      for (const x of await loadSection(b.id, n)) {
        if (x.book === h.book && x.n === h.n) continue
        const w = words(x.text)
        let common = 0
        for (const t of base) if (w.has(t)) common++
        const score = common / Math.max(1, Math.min(base.size, w.size))
        if (common >= 4 && score >= 0.5) out.push({ h: x, score })
      }
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** التخريج كما ورد في أحكام القاعدة (مثل: أخرجه البخاري (1023) ومسلم (894)) */
export function takhrijFromGrades(h: Hadith): string[] {
  return [...new Set(h.grades.map((g) => (g.ar.match(/أخرجه [^،]+/) ?? [])[0]).filter((x): x is string => !!x))]
}

// ---------- المفضلة وإعدادات القراءة ----------
export interface HadithFav { book: BookId; n: number; snippet: string; at: number }
export const loadFavs = () => kv.get<HadithFav[]>('hadith:favs', [])
export async function toggleFav(h: Hadith): Promise<boolean> {
  const list = await loadFavs()
  const i = list.findIndex((f) => f.book === h.book && f.n === h.n)
  if (i >= 0) { list.splice(i, 1); await kv.set('hadith:favs', list); return false }
  list.unshift({ book: h.book, n: h.n, snippet: splitIsnad(h.text).matn.slice(0, 140), at: Date.now() })
  await kv.set('hadith:favs', list.slice(0, 500))
  return true
}

export interface ReadPrefs { size: number; night: boolean }
export const loadReadPrefs = () => kv.get<ReadPrefs>('hadith:prefs', { size: 1.25, night: false })
export const saveReadPrefs = (p: ReadPrefs) => kv.set('hadith:prefs', p)

/** نص المشاركة والنسخ: المتن مع المصدر والرقم والأحكام كما هي */
export function shareTextFor(h: Hadith): string {
  const b = bookInfo(h.book)!
  const sec = bookIndex(h.book)?.sections.find((s) => s.n === h.section)
  const g = h.grades.length ? `\nالحكم: ${h.grades.map((x) => `${x.ar} (${x.byAr})`).join('؛ ')}` : ''
  return `${h.text}\n\n${b.name}${sec ? ` — ${sectionTitle(sec)}` : ''} — رقم ${h.an ?? h.n}${g}`
}
