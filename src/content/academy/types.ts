// نموذج محتوى «الأكاديمية الإسلامية» ونظام المصادر والمراجعة المشترك.
// كل درس يحمل حالة مراجعته ودرجة تحققه ومصادره؛ ويُفصل في الواجهة بين المعتمد وغير المراجَع.
import type { BookId } from '../../services/hadithLib'

/** حالة المراجعة العلمية */
export type ReviewStatus = 'approved' | 'review' | 'incomplete'
/**
 * درجة التحقق:
 * primary = نصوص أصلية فقط (آيات من المصحف، وأحاديث من الكتب بأرقامها) دون شرح من عندنا
 * secondary = تلخيص تعليمي مبني على المصادر المذكورة
 * unverified = يحتاج توثيقًا
 */
export type Verification = 'primary' | 'secondary' | 'unverified'

export interface Review {
  status: ReviewStatus
  verification: Verification
  /** اسم المراجع العلمي (يُملأ عند المراجعة فقط) */
  reviewer?: string
  /** تاريخ آخر مراجعة YYYY-MM-DD */
  reviewedAt?: string
  note?: string
}

/** مصدر علمي */
export interface SourceRef {
  title: string
  author?: string
  edition?: string
  /** رقم الصفحة أو الجزء (إن وُثّق) */
  page?: string
  url?: string
  note?: string
}

export type Block =
  | { type: 'text'; title?: string; body: string }
  | { type: 'steps'; title?: string; items: { title: string; body: string; pose?: Pose }[] }
  | { type: 'quran'; surah: number; from: number; to: number; note?: string }
  | { type: 'hadith'; book: BookId; n: number; cite: string; note?: string }
  | { type: 'link'; to: string; title: string; hint?: string }
  | { type: 'timeline'; events: { when: string; title: string; quran?: [number, number, number] }[]; note?: string }
  | { type: 'madhab'; issue: string; views: { madhab: 'الحنفية' | 'المالكية' | 'الشافعية' | 'الحنابلة' | 'الجمهور'; view: string }[]; source: string }
  | { type: 'list'; title?: string; items: string[] }

/** رسوم توضيحية لأوضاع الصلاة (أشكال هندسية مبسطة بلا ملامح) */
export type Pose = 'stand' | 'ruku' | 'sujud' | 'sit' | 'takbir' | 'salam'

export interface QuizQ {
  id: string
  kind: 'mcq' | 'tf' | 'fill'
  q: string
  /** خيارات الاختيار من متعدد (الصح أو الخطأ: ['صح','خطأ']) */
  options?: string[]
  /** رقم الخيار الصحيح، أو الكلمة الصحيحة في الإكمال */
  answer: number | string
  explain: string
  /** مرجع الإجابة */
  ref?: string
  level: 1 | 2 | 3
}

export interface AcademyLesson {
  id: string
  title: string
  summary: string
  blocks: Block[]
  sources: SourceRef[]
  review: Review
  quiz?: QuizQ[]
  /** مناسب للأطفال */
  kids?: boolean
}

export interface Unit { id: string; title: string; lessons: AcademyLesson[] }

export interface Course {
  id: string
  title: string
  intro: string
  color: string
  icon: 'prayer' | 'water' | 'seerah' | 'prophets' | 'companions' | 'aqidah' | 'fiqh' | 'kids'
  units: Unit[]
  kids?: boolean
}

export const STATUS_LABEL: Record<ReviewStatus, string> = { approved: 'معتمد', review: 'قيد المراجعة', incomplete: 'غير مكتمل' }
export const VERIFY_LABEL: Record<Verification, string> = { primary: 'نصوص أصلية موثقة', secondary: 'تلخيص تعليمي من المصادر', unverified: 'يحتاج توثيقًا' }

/** المصادر المشتركة */
export const SRC = {
  mushaf: { title: 'المصحف الشريف — رواية حفص عن عاصم', author: 'نص quran-json 3.1.2 (الرسم العثماني)' },
  muyassar: { title: 'التفسير الميسر', author: 'نخبة من العلماء — مجمع الملك فهد لطباعة المصحف الشريف' },
  hadithDb: { title: 'قاعدة أحاديث الكتب السبعة', author: 'fawazahmed0/hadith-api (ملكية عامة)' },
  fiqhSchools: { title: 'كتب الفقه المعتمدة في المذاهب الأربعة', note: 'نسبة الأقوال إلى المذاهب مشهورة في كتبها؛ أرقام الصفحات لم تُوثَّق بعد' },
} as const
