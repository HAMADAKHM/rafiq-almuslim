// «اقتراح اليوم»: اقتراح واحد هادئ يُبنى من إعدادات المستخدم وسجله على جهازه فقط.
// لا يقيّم حال المستخدم ولا يلومه، ولا يدّعي معرفة ما لا يسجله التطبيق.
import { timeOfDay } from './daily'

export interface SuggestInput {
  hour: number
  hasLocation: boolean
  adhkarDone: Set<string>
  memoDue: number
  khatma: { active: boolean; doneToday: boolean; from?: number; to?: number; page?: number }
}
export interface Suggestion { id: string; title: string; body: string; to: string; action: string }

export function dailySuggestion(i: SuggestInput): Suggestion {
  if (!i.hasLocation) return { id: 'city', title: 'اختر مدينتك', body: 'لتظهر مواقيت الصلاة والعدّ التنازلي واتجاه القبلة.', to: '/prayer', action: 'اختيار المدينة' }
  const t = timeOfDay(i.hour)
  if (t === 'morning' && !i.adhkarDone.has('morning')) return { id: 'morning', title: 'أذكار الصباح', body: 'دقائق قليلة تبدأ بها يومك.', to: '/adhkar/morning', action: 'ابدأ الأذكار' }
  if (t === 'evening' && i.hour >= 15 && !i.adhkarDone.has('evening')) return { id: 'evening', title: 'أذكار المساء', body: 'وقتها من العصر إلى المغرب.', to: '/adhkar/evening', action: 'ابدأ الأذكار' }
  if (i.memoDue > 0) return { id: 'review', title: 'مراجعة الحفظ', body: `${i.memoDue} ${i.memoDue === 1 ? 'مقطع حان' : 'مقاطع حان'} موعد مراجعته.`, to: '/memorize', action: 'ابدأ المراجعة' }
  if (i.khatma.active && !i.khatma.doneToday) return { id: 'wird', title: 'ورد اليوم', body: `الصفحات ${i.khatma.from}–${i.khatma.to} من خطة الختمة.`, to: `/mushaf/${i.khatma.page ?? i.khatma.from}`, action: 'اقرأ الآن' }
  if (t === 'night' && !i.adhkarDone.has('sleep')) return { id: 'sleep', title: 'أذكار النوم', body: 'قبل أن تنام: أذكار النوم في دقيقتين.', to: '/adhkar/sleep', action: 'ابدأ الأذكار' }
  if (!i.khatma.active) return { id: 'plan', title: 'خطة ختمة تناسب وقتك', body: 'اختر المدة أو الدقائق المتاحة يوميًا، ويُحسب وردك تلقائيًا.', to: '/wird', action: 'ضبط الخطة' }
  return { id: 'reflect', title: 'تدبّر آية اليوم', body: 'اقرأ آية اليوم مع التفسير الميسر.', to: '/learn', action: 'فتح التفسير' }
}
