// قصص القرآن الكريم للتفسير القصصي في «رفيق بلس»: مواضع القصة في المصحف فقط (سورة ونطاق آيات).
// النطاقات مُراجعة على نص المصحف المضمّن (بداية القصة ونهايتها). لا يُكتب أي سرد من عندنا:
// يُعرض نص الآيات من المصحف، وتفسيرها من كتب التفسير المعتمدة كما هو.
import type { PaintTone } from '../components/Scene'

export interface QuranStory {
  id: string
  title: string
  /** وصف قصير محايد لموضوع القصة */
  about: string
  surah: number
  from: number
  to: number
  tone: PaintTone
}

export const STORIES: QuranStory[] = [
  { id: 'adam', title: 'آدم عليه السلام وإبليس', about: 'خلق آدم وسجود الملائكة، وإباء إبليس، والهبوط إلى الأرض', surah: 7, from: 11, to: 25, tone: 'dawn' },
  { id: 'nuh', title: 'نوح عليه السلام والطوفان', about: 'دعوة نوح قومه، وصناعة السفينة، والطوفان والنجاة', surah: 11, from: 25, to: 49, tone: 'night' },
  { id: 'ibrahim', title: 'إبراهيم عليه السلام والأصنام', about: 'محاورة إبراهيم قومه، وتحطيم الأصنام، والنار التي صارت بردًا وسلامًا', surah: 21, from: 51, to: 70, tone: 'sunset' },
  { id: 'yusuf', title: 'يوسف عليه السلام', about: 'رؤيا يوسف، وكيد إخوته، والسجن، ثم التمكين ولقاء أبيه', surah: 12, from: 4, to: 101, tone: 'day' },
  { id: 'musa', title: 'موسى عليه السلام وفرعون', about: 'مولد موسى ونشأته في قصر فرعون، وخروجه إلى مدين، وتكليمه ورسالته', surah: 28, from: 3, to: 43, tone: 'sunset' },
  { id: 'khidr', title: 'موسى والخضر', about: 'رحلة موسى إلى مجمع البحرين، والسفينة والغلام والجدار', surah: 18, from: 60, to: 82, tone: 'day' },
  { id: 'kahf', title: 'أصحاب الكهف', about: 'فتية آمنوا بربهم فآواهم الله إلى الكهف', surah: 18, from: 9, to: 26, tone: 'night' },
  { id: 'jannatayn', title: 'صاحب الجنتين', about: 'مثل الرجلين: صاحب الجنتين وصاحبه المؤمن', surah: 18, from: 32, to: 44, tone: 'day' },
  { id: 'dhulqarnayn', title: 'ذو القرنين', about: 'رحلات ذي القرنين وبناء السد', surah: 18, from: 83, to: 98, tone: 'dawn' },
  { id: 'maryam', title: 'مريم عليها السلام وميلاد عيسى', about: 'بشارة مريم، وميلاد عيسى عليه السلام وكلامه في المهد', surah: 19, from: 16, to: 34, tone: 'dawn' },
  { id: 'sulayman', title: 'سليمان عليه السلام والنملة والهدهد', about: 'ملك سليمان، والنملة، ونبأ الهدهد، وملكة سبأ', surah: 27, from: 15, to: 44, tone: 'day' },
  { id: 'qarun', title: 'قارون', about: 'قارون وكنوزه، وعاقبة البغي', surah: 28, from: 76, to: 82, tone: 'sunset' },
  { id: 'luqman', title: 'وصايا لقمان لابنه', about: 'وصايا لقمان الحكيم لابنه', surah: 31, from: 12, to: 19, tone: 'day' },
  { id: 'yunus', title: 'يونس عليه السلام', about: 'يونس في بطن الحوت، والنجاة، وإيمان قومه', surah: 37, from: 139, to: 148, tone: 'night' },
]

export const storyById = (id: string) => STORIES.find((s) => s.id === id)

/** مشاهد القصة: مقاطع التفسير المتتالية داخل نطاق القصة (المقطع قد يجمع عدة آيات فسّرها الكتاب معًا) */
export function storyScenes(groups: { from: number; to: number; text: string }[], from: number, to: number) {
  return groups
    .filter((g) => g.to >= from && g.from <= to)
    .map((g) => ({ from: Math.max(from, g.from), to: Math.min(to, g.to), text: g.text }))
}
