// المساعد الإسلامي: استرجاع محلي فقط من مصادر التطبيق الموثقة (المصحف، الأحاديث المخرّجة، الأذكار والأدعية، الدروس).
// لا يولّد نصًا ولا يصوغ إجابة ولا يفتي، ولا يرسل السؤال إلى أي خادم: يعرض النصوص بمصادرها كما هي.
import { searchSkeleton } from '../lib/arabic'
import type { ContentCategory, DhikrItem } from '../content/types'
import type { QuranData } from './quran'
import { refFromGlobal } from './quran'

export interface AssistTopic { id: string; title: string; keys: string[]; links: { to: string; label: string }[] }

/** مواضيع شائعة تربط السؤال بأقسام موجودة فعلًا في التطبيق (لا نصوص جديدة) */
export const TOPICS: AssistTopic[] = [
  { id: 'distress', title: 'الهم والحزن والقلق', keys: ['هم', 'حزن', 'قلق', 'ضيق', 'كرب', 'خوف', 'اكتئاب', 'توتر'], links: [{ to: '/duas/distress', label: 'أدعية الهم والكرب' }, { to: '/duas/relief', label: 'أدعية تفريج الكرب' }] },
  { id: 'sleep', title: 'النوم والأرق', keys: ['نوم', 'ارق', 'كوابيس', 'منام'], links: [{ to: '/adhkar/sleep', label: 'أذكار النوم' }, { to: '/adhkar/waking', label: 'أذكار الاستيقاظ' }] },
  { id: 'morning', title: 'أذكار الصباح والمساء', keys: ['صباح', 'مساء', 'صبح'], links: [{ to: '/adhkar/morning', label: 'أذكار الصباح' }, { to: '/adhkar/evening', label: 'أذكار المساء' }] },
  { id: 'illness', title: 'المرض والشفاء', keys: ['مرض', 'مريض', 'شفاء', 'رقيه', 'وجع'], links: [{ to: '/duas/healing', label: 'أدعية الشفاء والرقية' }] },
  { id: 'rizq', title: 'الرزق والعمل والدين', keys: ['رزق', 'عمل', 'وظيفه', 'مال', 'دين', 'فقر'], links: [{ to: '/duas/rizq', label: 'أدعية الرزق' }, { to: '/hadith/muamalat', label: 'أحاديث المعاملات' }] },
  { id: 'istighfar', title: 'الذنوب والتوبة والاستغفار', keys: ['ذنب', 'ذنوب', 'توبه', 'استغفار', 'معصيه', 'مغفره'], links: [{ to: '/duas/istighfar', label: 'الاستغفار' }] },
  { id: 'parents', title: 'الوالدان والأسرة', keys: ['والد', 'والدي', 'امي', 'اهل', 'اولاد', 'ذريه', 'متوفى', 'ميت'], links: [{ to: '/duas/parents', label: 'أدعية للوالدين والذرية' }] },
  { id: 'travel', title: 'السفر', keys: ['سفر', 'مسافر', 'رحله'], links: [{ to: '/adhkar/travel', label: 'أذكار السفر' }, { to: '/duas/travel-dua', label: 'أدعية السفر' }] },
  { id: 'prayer', title: 'الصلاة', keys: ['صلاه', 'صلوات', 'وضوء', 'طهاره', 'مسجد', 'جماعه'], links: [{ to: '/prayer', label: 'مواقيت الصلاة' }, { to: '/adhkar/after-prayer', label: 'أذكار بعد الصلاة' }, { to: '/hadith/salah', label: 'أحاديث الطهارة والصلاة' }, { to: '/mosques', label: 'المساجد القريبة' }] },
  { id: 'quran', title: 'القرآن والختمة والحفظ', keys: ['قران', 'ختمه', 'حفظ', 'تلاوه', 'ورد'], links: [{ to: '/wird', label: 'خطة الختمة' }, { to: '/memorize', label: 'الحفظ والمراجعة' }, { to: '/hadith/ibadat', label: 'أحاديث العبادات والقرآن' }] },
  { id: 'akhlaq', title: 'الأخلاق والغضب والجيران', keys: ['غضب', 'اخلاق', 'جار', 'جيران', 'صبر', 'كلام'], links: [{ to: '/hadith/akhlaq', label: 'أحاديث الأخلاق والآداب' }] },
]

/** كلمات الفتوى: يُعرض تنبيه بالرجوع إلى أهل العلم، ولا يُجاب بحكم */
const FIQH = ['حكم', 'يجوز', 'جائز', 'حلال', 'حرام', 'فتوى', 'فتوي', 'واجب', 'مكروه', 'بدعه', 'نصاب', 'كفاره', 'يبطل', 'مبطلات']
const STOP = new Set(['ما', 'ماذا', 'هل', 'كيف', 'لماذا', 'متى', 'اين', 'عن', 'في', 'من', 'الى', 'علي', 'على', 'اريد', 'ابي', 'ابغى', 'عندي', 'انا', 'لي', 'هو', 'هي', 'او', 'ثم', 'مع', 'كل', 'اذا', 'ان', 'لا', 'قل', 'شيء', 'شي', 'يا', 'الله', 'دعاء', 'ذكر', 'ايه', 'ايات', 'حديث', 'احاديث'])

// المفاتيح وكلمات التوقف تُطبَّع مثل السؤال (يحذف التطبيع كل صور الألف والهمزة)
const sk = (xs: string[]) => xs.map(searchSkeleton)
const STOP_SK = new Set(sk([...STOP]))
for (const t of TOPICS) t.keys = sk(t.keys)
const FIQH_SK = sk(FIQH)

/** كلمات السؤال المفيدة: تُحذف «ال» وحروف العطف والجر الملتصقة قبل التطبيع، ثم كلمات التوقف */
export function queryWords(q: string): string[] {
  const out: string[] = []
  for (const raw of q.replace(/[\u064B-\u065F\u0670]/g, '').replace(/[؟،؛٪«»!?.,:;"'()]/g, ' ').split(/\s+/)) {
    if (STOP_SK.has(searchSkeleton(raw))) continue
    const w = searchSkeleton(raw.replace(/^(و|ف)?(بال|كال|لل|ال)(?=..)/, ''))
    if (w.length >= 2 && !STOP_SK.has(w) && !out.includes(w)) out.push(w)
  }
  return out
}

export const isFiqhQuestion = (q: string) => { const s = searchSkeleton(q); return FIQH_SK.some((k) => s.includes(k)) }

export function matchTopics(words: string[]): AssistTopic[] {
  return TOPICS.filter((t) => t.keys.some((k) => words.some((w) => w === k || (k.length >= 3 && w.startsWith(k)) || (w.length >= 3 && k.startsWith(w)))))
}

export interface AyahHitScored { surah: number; ayah: number; text: string; score: number }
let skel: string[] | null = null
/** الآيات التي تحتوي أكثر كلمات السؤال (كلمات من 3 أحرف فأكثر)، الأعلى تطابقًا أولًا */
export function findVerses(data: QuranData, words: string[], limit = 5): AyahHitScored[] {
  const ws = words.filter((w) => w.length >= 3)
  if (!ws.length) return []
  if (!skel) skel = data.verses.flatMap((s) => s.map(searchSkeleton))
  const scored: { g: number; score: number }[] = []
  for (let g = 0; g < skel.length; g++) {
    let score = 0
    for (const w of ws) if (skel[g].includes(w)) score += w.length
    if (score) scored.push({ g, score })
  }
  scored.sort((a, b) => b.score - a.score || skel![a.g].length - skel![b.g].length)
  return scored.slice(0, limit).map(({ g, score }) => { const r = refFromGlobal(data.meta, g + 1); return { ...r, text: data.verses[r.surah - 1][r.ayah - 1], score } })
}

export interface ContentHit { cat: ContentCategory; it: DhikrItem; score: number }
export function findContent(cats: ContentCategory[], words: string[], limit = 5): ContentHit[] {
  const ws = words.filter((w) => w.length >= 3)
  if (!ws.length) return []
  const out: ContentHit[] = []
  for (const cat of cats) for (const it of cat.items) {
    const s = searchSkeleton(`${it.text ?? ''} ${it.note ?? ''} ${cat.title}`)
    let score = 0
    for (const w of ws) if (s.includes(w)) score += w.length
    if (score) out.push({ cat, it, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}
