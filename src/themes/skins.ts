// «الثيمات الغامرة»: كل ثيم مشهد متحرك كامل خلف التطبيق، مع ألوانه وخطه وشكل بطاقاته — ليس لونًا فقط.
// المشاهد مرسومة بالكود (SVG وCSS) داخل التطبيق: لا صور خارجية، ولا حقوق لطرف آخر، وتعمل دون إنترنت.

import type { SceneId } from '../tv/scenes'

export type IdentityId = 't-classic' | 't-night' | 't-nature' | 't-turquoise' | 't-heritage' | 't-violet' | 't-minimal' | 't-gradient' | 't-royal' | 't-dawn' | 't-rose' | 't-evening'
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
  // التصاميم التسعة المعتمدة (بالترتيب والأسماء كما في لوحة التصاميم)
  { id: 't-classic', name: 'الكلاسيكي الراقي', tagline: 'ببساطة .. نقترب من الله', mode: 'light', free: true, bar: '#174B3C', identity: true, swatch: ['#f7f4ea', '#ffffff', '#174b3c', '#202b27'] },
  { id: 't-night', name: 'الليلي الفاخر', tagline: 'صفاء القلب .. وراحة العين', mode: 'dark', free: false, bar: '#0a1730', identity: true, swatch: ['#0a1730', '#12234a', '#e0bd6e', '#f2ecdd'] },
  { id: 't-nature', name: 'الهادئ الطبيعي', tagline: 'راحة بصرية .. لحياة أجمل', mode: 'light', free: false, bar: '#1f6a4f', identity: true, swatch: ['#f6efe3', '#fffdf8', '#1f6a4f', '#2b2a22'] },
  { id: 't-turquoise', name: 'العصري المشرق', tagline: 'تكنولوجيا لخدمة إيمانك', mode: 'light', free: false, bar: '#0f6e70', identity: true, swatch: ['#e6f5f6', '#ffffff', '#138a8c', '#12302f'] },
  { id: 't-heritage', name: 'الإسلامي الفخم', tagline: 'تراث عريق .. بتقنية حديثة', mode: 'dark', free: false, bar: '#06231c', identity: true, swatch: ['#082a22', '#0f3a2e', '#d9b46a', '#f3ead2'] },
  { id: 't-violet', name: 'الغروب الهادئ', tagline: 'مع كل فجر .. بداية جديدة', mode: 'dark', free: false, bar: '#2b1f4f', identity: true, swatch: ['#241a45', '#3a2b66', '#c7a8f0', '#f6effa'] },
  { id: 't-minimal', name: 'المينيمالي الحديث', tagline: 'كل ما تحتاجه .. في مكان واحد', mode: 'light', free: false, bar: '#141414', identity: true, swatch: ['#f7f7f5', '#ffffff', '#1f6a55', '#161a18'] },
  { id: 't-gradient', name: 'الألوان المتدرجة', tagline: 'حياة مليئة بالإيمان', mode: 'light', free: false, bar: '#1b9aa8', identity: true, swatch: ['#eef7fb', '#ffffff', '#4f5bb5', '#1c2a3a'] },
  { id: 't-royal', name: 'الذهبي الفاخر', tagline: 'إيمانك .. أسلوب حياة', mode: 'dark', free: false, bar: '#0c0a07', identity: true, swatch: ['#0c0a07', '#1a160f', '#d4a84f', '#f3e7cc'] },
  // ثيمات أيقونات الشروق والوردي والمساء
  { id: 't-dawn', name: 'الشروق', tagline: 'ضوء الشروق الدافئ — بداية مليئة بالأمل', mode: 'light', free: false, bar: '#7a3b2a', identity: true, swatch: ['#fff3e6', '#fffcf6', '#c8641e', '#3a2516'] },
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
