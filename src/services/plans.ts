// ورد اليوم و«ابدأ رحلتك»: خطط مرنة يحددها المستخدم، بلا لوم عند الانقطاع، ويمكن البدء من جديد دائمًا.
import { kv, reading } from '../db/repos'
import { pageRange, type QuranMeta } from './quran'

export interface WirdPlan {
  pagesPerDay: number
  /** الصفحة التالية في الختمة الجارية (1..604) */
  nextPage: number
  startedAt: string
  khatmas: number
  /** آخر يوم أُكمل فيه الورد */
  lastDone?: string
}

export const DEFAULT_WIRD: WirdPlan = { pagesPerDay: 4, nextPage: 1, startedAt: '', khatmas: 0 }

export async function getWird(): Promise<WirdPlan | null> {
  return kv.get<WirdPlan | null>('wird', null)
}

export async function saveWird(p: WirdPlan) {
  await kv.set('wird', p)
}

export function wirdTarget(p: WirdPlan, meta: QuranMeta): { from: number; to: number } {
  return { from: p.nextPage, to: Math.min(meta.pages, p.nextPage + p.pagesPerDay - 1) }
}

/** تسجيل إتمام ورد اليوم: يضيف سجل قراءة لكل صفحة ويتقدم بالمؤشر. */
export async function completeWird(p: WirdPlan, meta: QuranMeta, today: string): Promise<WirdPlan> {
  const { from, to } = wirdTarget(p, meta)
  for (let pg = from; pg <= to; pg++) {
    const r = pageRange(meta, pg)!
    // الصفحة قد تمتد عبر سورتين؛ نسجل كل جزء على حدة
    if (r.from.surah === r.to.surah) {
      await reading.log({ date: today, surah: r.from.surah, from: r.from.ayah, to: r.to.ayah, ayahs: r.to.ayah - r.from.ayah + 1, pages: [pg] })
    } else {
      for (let s = r.from.surah; s <= r.to.surah; s++) {
        const a = s === r.from.surah ? r.from.ayah : 1
        const b = s === r.to.surah ? r.to.ayah : meta.surahs[s - 1].count
        await reading.log({ date: today, surah: s, from: a, to: b, ayahs: b - a + 1, pages: s === r.from.surah ? [pg] : [] })
      }
    }
  }
  const finished = to >= meta.pages
  const next: WirdPlan = { ...p, nextPage: finished ? 1 : to + 1, khatmas: p.khatmas + (finished ? 1 : 0), lastDone: today }
  await saveWird(next)
  return next
}

// ---------------- ابدأ رحلتك ----------------
export type JourneyGoal = 'return' | 'regular-reading' | 'memorize' | 'adhkar' | 'organize'

export const GOALS: { id: JourneyGoal; title: string; desc: string }[] = [
  { id: 'return', title: 'العودة إلى الصلاة والقرآن تدريجيًا', desc: 'خطوات صغيرة ثابتة: صلاة في وقتها، وصفحة من القرآن، وذكر قصير.' },
  { id: 'regular-reading', title: 'الانتظام في قراءة القرآن', desc: 'ورد يومي ثابت يناسب وقتك، مع متابعة الختمة.' },
  { id: 'memorize', title: 'حفظ القرآن', desc: 'مقاطع صغيرة يومية مع مراجعة متباعدة لما حفظت.' },
  { id: 'adhkar', title: 'المحافظة على الأذكار', desc: 'أذكار الصباح والمساء وبعد الصلاة مع تذكير اختياري.' },
  { id: 'organize', title: 'تنظيم العبادات', desc: 'برنامج متوازن يجمع الصلاة والورد والأذكار.' },
]

export interface Journey {
  goal: JourneyGoal
  minutes: number
  createdAt: string
}

export interface JourneyPlan {
  pagesPerDay: number
  memorizeAyahs: number
  adhkar: boolean
  tips: string[]
}

/** اقتراح برنامج بحسب الهدف والوقت المتاح يوميًا. تقدير تقريبي: الصفحة ≈ 2–3 دقائق قراءة. */
export function suggestPlan(goal: JourneyGoal, minutes: number): JourneyPlan {
  const m = Math.max(5, minutes)
  switch (goal) {
    case 'return':
      return { pagesPerDay: m >= 20 ? 2 : 1, memorizeAyahs: 0, adhkar: true, tips: ['ابدأ بالمحافظة على الصلوات الخمس في وقتها؛ فعّل تنبيهات الصلاة إن أحببت.', 'صفحة واحدة يوميًا مع الاستمرار خير من كثير منقطع.', 'إن فاتك يوم فلا بأس، عُد في اليوم التالي من حيث توقفت.'] }
    case 'regular-reading':
      return { pagesPerDay: Math.max(1, Math.min(20, Math.round(m / 2.5))), memorizeAyahs: 0, adhkar: false, tips: ['اختر وقتًا ثابتًا للقراءة، كبعد الفجر أو قبل النوم.', `بهذا المعدل تختم القرآن تقريبًا كل ${Math.ceil(604 / Math.max(1, Math.round(m / 2.5)))} يومًا.`] }
    case 'memorize':
      return { pagesPerDay: 1, memorizeAyahs: m >= 30 ? 5 : m >= 15 ? 3 : 2, adhkar: false, tips: ['ابدأ بالسور القصيرة من جزء عمّ إن كنت في البداية.', 'المراجعة أهم من الجديد؛ لا تتجاوز مراجعة اليوم.', 'استمع للآية مرات قبل حفظها، ويفيد المصحف المعلم للحصري.'] }
    case 'adhkar':
      return { pagesPerDay: 1, memorizeAyahs: 0, adhkar: true, tips: ['أذكار الصباح بعد الفجر، وأذكار المساء بعد العصر.', 'يمكنك ضبط تذكير يومي من الإعدادات.'] }
    case 'organize':
      return { pagesPerDay: Math.max(1, Math.min(10, Math.round(m / 4))), memorizeAyahs: m >= 30 ? 2 : 0, adhkar: true, tips: ['اربط وردك بالصلاة: صفحات بعد كل فريضة تكفي لورد يومي.', 'تابع تقدمك أسبوعيًا من صفحة متابعة التقدم.'] }
  }
}
