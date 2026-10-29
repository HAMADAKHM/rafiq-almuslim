// «الثيمات الغامرة»: كل ثيم مشهد متحرك كامل خلف التطبيق، مع ألوانه وخطه وشكل بطاقاته — ليس لونًا فقط.
// المشاهد مرسومة بالكود (SVG وCSS) داخل التطبيق: لا صور خارجية، ولا حقوق لطرف آخر، وتعمل دون إنترنت.

import type { SceneId } from '../tv/scenes'

export type IdentityId = 't-classic' | 't-royal' | 't-night' | 't-turquoise' | 't-dawn' | 't-nature' | 't-violet' | 't-rose' | 't-evening'
export type SkinId = IdentityId | 'qadr' | 'andalus' | 'desert' | 'ocean' | 'garden' | 'ramadan' | 'aurora' | 'royal'
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
  /** ثيم هوية: خلفية هادئة مرسومة (IdentityScene) وألوانه الخاصة، ويطابقه أيقونة تطبيق بالاسم نفسه */
  identity?: boolean
  /** ألوان المعاينة المصغرة: الخلفية، والبطاقة، واللون الأساسي، والنص */
  swatch?: [string, string, string, string]
  /** لوحة الألوان المستعملة (للثيمات الحية: ألوان أحد الثيمات الأساسية) */
  palette?: 'qadr' | 'andalus' | 'desert' | 'ocean' | 'garden' | 'ramadan' | 'aurora' | 'royal'
}

export const SKINS: Skin[] = [
  // ---------- ثيمات الهوية: هوية بصرية كاملة لكل الصفحات، ولكل منها أيقونة تطبيق مطابقة ----------
  { id: 't-classic', name: 'الإسلامي الكلاسيكي', tagline: 'أخضر زمردي وعاجي ولمسات ذهبية خفيفة', mode: 'light', free: true, bar: '#0b4a3e', identity: true, swatch: ['#f7f3ea', '#fffdf7', '#0b5e4a', '#1f2a26'] },
  { id: 't-royal', name: 'الملكي', tagline: 'كحلي داكن وذهب معدني — فخامة بأناقة', mode: 'dark', free: false, bar: '#0a1430', identity: true, swatch: ['#0b1530', '#16285a', '#d9b45a', '#f4ecd8'] },
  { id: 't-night', name: 'الليلي', tagline: 'هلال مضيء وتدرجات زرقاء هادئة — هدوء وطمأنينة', mode: 'dark', free: false, bar: '#071026', identity: true, swatch: ['#071026', '#13285a', '#8cc4ff', '#eaf1ff'] },
  { id: 't-turquoise', name: 'الفيروزي', tagline: 'فيروز وسماوي ونقوش إسلامية — نقاء وروحانية', mode: 'light', free: false, bar: '#0b5f63', identity: true, swatch: ['#eaf7f6', '#ffffff', '#0f8c88', '#10322f'] },
  { id: 't-dawn', name: 'الفجر', tagline: 'ضوء الشروق الدافئ — بداية مليئة بالأمل', mode: 'light', free: false, bar: '#7a3b2a', identity: true, swatch: ['#fff3e6', '#fffcf6', '#c8641e', '#3a2516'] },
  { id: 't-nature', name: 'الطبيعي', tagline: 'أخضر نباتي وعاجي وأوراق هادئة — قرب من الطبيعة', mode: 'light', free: false, bar: '#2f5a2c', identity: true, swatch: ['#f1f5e8', '#fffffa', '#3d7a3a', '#1f2d1c'] },
  { id: 't-violet', name: 'البنفسجي', tagline: 'بنفسجي عميق ولمسات فضية ونجوم دقيقة — سكينة', mode: 'dark', free: false, bar: '#1b0f38', identity: true, swatch: ['#150c2a', '#3a2272', '#c9b6ff', '#f3eeff'] },
  { id: 't-rose', name: 'الوردي', tagline: 'وردي هادئ وذهبي وردي — دفء وجمال', mode: 'light', free: false, bar: '#7a3549', identity: true, swatch: ['#fbeff1', '#fffcfd', '#b4536e', '#3a1f27'] },
  { id: 't-evening', name: 'المساء', tagline: 'أزرق داكن وإضاءة الفوانيس — هدوء الليل', mode: 'dark', free: false, bar: '#0a1424', identity: true, swatch: ['#0a1424', '#1b2f4c', '#f0b45a', '#f4eedd'] },
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

/** الثيمات الفنية المرسومة (SkinScene) */
export type ArtSkinId = 'qadr' | 'andalus' | 'desert' | 'ocean' | 'garden' | 'ramadan' | 'aurora' | 'royal'

export const skinById = (id: string | undefined | null): Skin | null => SKINS.find((s) => s.id === id) ?? null

/** يُطبَّق الثيم إن كان مجانيًا، أو مع اشتراك ساري */
export function activeSkin(id: string | undefined | null, entitled: boolean): Skin | null {
  const s = skinById(id)
  return s && (s.free || entitled) ? s : null
}
