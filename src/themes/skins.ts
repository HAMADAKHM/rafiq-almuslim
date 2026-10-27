// «الثيمات الغامرة»: كل ثيم مشهد متحرك كامل خلف التطبيق، مع ألوانه وخطه وشكل بطاقاته — ليس لونًا فقط.
// المشاهد مرسومة بالكود (SVG وCSS) داخل التطبيق: لا صور خارجية، ولا حقوق لطرف آخر، وتعمل دون إنترنت.

export type SkinId = 'qadr' | 'andalus' | 'desert' | 'ocean' | 'garden' | 'ramadan' | 'aurora' | 'royal'

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
]

export const skinById = (id: string | undefined | null): Skin | null => SKINS.find((s) => s.id === id) ?? null

/** يُطبَّق الثيم إن كان مجانيًا، أو مع اشتراك ساري */
export function activeSkin(id: string | undefined | null, entitled: boolean): Skin | null {
  const s = skinById(id)
  return s && (s.free || entitled) ? s : null
}
