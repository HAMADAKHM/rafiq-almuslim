// «الثيمات الغامرة»: كل ثيم مشهد متحرك كامل خلف التطبيق، مع ألوانه وخطه وشكل بطاقاته — ليس لونًا فقط.
// المشاهد مرسومة بالكود (SVG وCSS) داخل التطبيق: لا صور خارجية، ولا حقوق لطرف آخر، وتعمل دون إنترنت.

import type { SceneId } from '../tv/scenes'

export type SkinId = 'qadr' | 'andalus' | 'desert' | 'ocean' | 'garden' | 'ramadan' | 'aurora' | 'royal'
  | 'live-night' | 'live-galaxy' | 'live-aurora' | 'live-ocean' | 'live-rain' | 'live-forest' | 'live-geometry' | 'live-desert'

export interface Skin {
  id: SkinId
  name: string
  tagline: string
  /** وضع الألوان الذي صُمم له الثيم (يُطبَّق مع الثيم) */
  mode: 'dark' | 'light'
  /** متاح للجميع، والباقي من مزايا رفيق بلس */
  free: boolean
  /** لون شريط النظام */
  bar: string
  /** ثيم حيّ: مشهد مرسوم إطارًا بإطار (من مكتبة مشاهد التلفاز) بدل الرسم الثابت */
  live?: SceneId
  /** لوحة الألوان المستعملة (للثيمات الحية: ألوان أحد الثيمات الأساسية) */
  palette?: 'qadr' | 'andalus' | 'desert' | 'ocean' | 'garden' | 'ramadan' | 'aurora' | 'royal'
}

export const SKINS: Skin[] = [
  { id: 'qadr', name: 'ليلة القدر', tagline: 'سماء مرصّعة بالنجوم وهلال وقباب تتلألأ نوافذها', mode: 'dark', free: true, bar: '#070d22' },
  { id: 'andalus', name: 'قصر الحمراء', tagline: 'زليج أندلسي وأقواس مقرنصة بألوان الفيروز والطين', mode: 'light', free: true, bar: '#0f5a5c' },
  { id: 'desert', name: 'كثبان الذهب', tagline: 'غروب الصحراء وقافلة تمضي بين الكثبان', mode: 'dark', free: false, bar: '#3a1d2e' },
  { id: 'ocean', name: 'سكينة البحر', tagline: 'موج يتهادى وضوء يتراقص تحت الماء', mode: 'dark', free: false, bar: '#032b3a' },
  { id: 'garden', name: 'روضة خضراء', tagline: 'أوراق تتساقط برفق في ضوء الصباح', mode: 'light', free: false, bar: '#2f5d3a' },
  { id: 'ramadan', name: 'فوانيس رمضان', tagline: 'فوانيس تتأرجح بنورها تحت الهلال', mode: 'dark', free: false, bar: '#120d33' },
  { id: 'aurora', name: 'شفق الشمال', tagline: 'أشرطة ضوء تتموّج فوق الجبال', mode: 'dark', free: false, bar: '#06121c' },
  { id: 'royal', name: 'الذهب الملكي', tagline: 'نقوش هندسية ذهبية يعبرها بريق الضوء', mode: 'dark', free: false, bar: '#0a0907' },
  // ---------- الثيمات الحيّة: مشاهد سينمائية تتحرك باستمرار خلف التطبيق ----------
  { id: 'live-night', name: 'ليلة المسجد الحيّة', tagline: 'درب التبانة وشهب تعبر وقباب تومض نوافذها', mode: 'dark', free: true, bar: '#040818', live: 'night-mosque', palette: 'qadr' },
  { id: 'live-galaxy', name: 'رحلة المجرات', tagline: 'مجرة حلزونية تدور وسدم ملونة ونجوم تقترب منك', mode: 'dark', free: false, bar: '#02030a', live: 'galaxy', palette: 'ramadan' },
  { id: 'live-aurora', name: 'الشفق الحيّ', tagline: 'ستائر ضوء خضراء وبنفسجية تتموج وتنعكس على البحيرة', mode: 'dark', free: false, bar: '#020611', live: 'aurora', palette: 'aurora' },
  { id: 'live-ocean', name: 'غروب البحر', tagline: 'شمس تغيب وأمواج تتتابع وبريق يتراقص على الماء', mode: 'dark', free: false, bar: '#1b1640', live: 'ocean-sunset', palette: 'desert' },
  { id: 'live-rain', name: 'مطر على النافذة', tagline: 'قطرات تنساب على الزجاج وأضواء مدينة خلفه', mode: 'dark', free: false, bar: '#0b0f1c', live: 'rain-window', palette: 'ocean' },
  { id: 'live-forest', name: 'غابة اليراعات', tagline: 'ضباب يسري بين الأشجار ويراعات مضيئة تطير', mode: 'dark', free: false, bar: '#06121a', live: 'forest', palette: 'aurora' },
  { id: 'live-geometry', name: 'الزخارف الدوّارة', tagline: 'نجوم هندسية ذهبية تدور وتتفتح كالنور', mode: 'dark', free: false, bar: '#050403', live: 'geometry', palette: 'royal' },
  { id: 'live-desert', name: 'قافلة الصحراء', tagline: 'كثبان تتحرك وقافلة تمضي ورمال تحملها الريح', mode: 'dark', free: false, bar: '#120d2e', live: 'desert', palette: 'desert' },
]

export const skinById = (id: string | undefined | null): Skin | null => SKINS.find((s) => s.id === id) ?? null

/** يُطبَّق الثيم إن كان مجانيًا، أو مع اشتراك ساري */
export function activeSkin(id: string | undefined | null, entitled: boolean): Skin | null {
  const s = skinById(id)
  return s && (s.free || entitled) ? s : null
}
