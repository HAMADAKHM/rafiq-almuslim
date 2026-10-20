// «ابدأ رحلتك»: خطط مرنة يحددها المستخدم، بلا لوم عند الانقطاع، ويمكن البدء من جديد دائمًا.

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
