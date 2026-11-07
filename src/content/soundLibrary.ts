// مكتبة «استوديو أصوات رفيق المسلم».
// - النغمات وأصوات السبحة وأصوات الطبيعة: أصوات أصلية مُولّدة لتطبيق رفيق المسلم نفسه (لا تسجيلات لطرف آخر)،
//   مضمّنة في التطبيق (public/sounds/studio) وتعمل دون إنترنت. النغمات القصيرة موجودة أيضًا في res/raw لتكون صوت إشعار.
// - تلاوات الأذكار: تسجيلات بشرية حقيقية من مشروع «حصن المسلم» (hisnmuslim.com — بإذن المشروع كما أفاد صاحب التطبيق)،
//   مربوطة بالذكر الذي يطابق نصّه نصَّ التسجيل فقط (src/content/hisnAudio.ts)، وتُنزَّل عند الطلب.
// - الآيات في الأذكار (آية الكرسي، المعوذات…): بأصوات قرّاء المصحف المعروفين في التطبيق (src/content/reciters.ts).
// - الأذكار كاملة بأصوات القرّاء (العفاسي، فارس عباد، محمد جبريل، ناصر القطامي): مجموعة «مكة لايف» على أرشيف الإنترنت
//   (archive.org/details/makkah-live.-net-athkar-01) — باعتماد صاحب التطبيق أنها مسموح استخدامها. نُسب كل ملف لقارئه بعد
//   التحقق من ثلاثة مصادر: وسوم الملف في الأرشيف، وصفحة مكة لايف، ونسخ بداية التسجيل آليًا (scripts عبر net-check).
//   تُشغَّل من الإنترنت وتُنزَّل للعمل دونه عند الطلب فقط (حجمها كبير).
// لا تُنسب أي تسجيلات لشخص لم يُتحقق منه، ولا يُستعمل صوت آلي على أنه قارئ.
import { ADHKAR } from './adhkar'
import { HISN_AUDIO, HISN_AUDIO_CREDIT, hisnAudioUrl } from './hisnAudio'

export type SoundCat = 'nature' | 'tones' | 'human' | 'dhikr' | 'tasbih'
export interface StudioSound {
  id: string
  cat: SoundCat
  name: string
  desc: string
  /** ملف مضمّن في التطبيق */
  file?: string
  /** تسجيل يُنزَّل عند الطلب */
  url?: string
  /** يصلح صوتًا لإشعار Android (ملف res/raw باسم snd_<id>) */
  notify?: boolean
  /** حلقة متكررة (أصوات الطبيعة) */
  loop?: boolean
  plus?: boolean
  credit: string
  /** معرّف الذكر في المكتبة (للتسجيلات) */
  itemId?: string
}

const ORIGINAL = 'صوت أصلي من إنتاج رفيق المسلم'
const f = (n: string) => `sounds/studio/${n}.mp3`

export const BUNDLED: StudioSound[] = [
  // نغمات التنبيه (دون موسيقى: أجراس وماء ونسيم)
  { id: 'chime', cat: 'tones', name: 'نغمة رفيق المسلم', desc: 'أجراس ناعمة على مقام الحجاز — النغمة الافتراضية', file: 'sounds/rafiq_chime.mp3', notify: true, credit: ORIGINAL },
  { id: 't_gold', cat: 'tones', name: 'الجرس الذهبي', desc: 'ضربة جرس واحدة صافية برنين طويل', file: f('t_gold'), notify: true, credit: ORIGINAL },
  { id: 't_drop', cat: 'tones', name: 'قطرة ماء', desc: 'قطرة هادئة قصيرة جدًا', file: f('t_drop'), notify: true, credit: ORIGINAL },
  { id: 't_morning', cat: 'tones', name: 'إشراقة الصباح', desc: 'تغريد عصافير قصير — لأذكار الصباح', file: f('t_morning'), notify: true, plus: true, credit: ORIGINAL },
  { id: 't_evening', cat: 'tones', name: 'نسيم المساء', desc: 'نسيم هادئ وجرس خافت — لأذكار المساء', file: f('t_evening'), notify: true, plus: true, credit: ORIGINAL },
  { id: 't_sleep', cat: 'tones', name: 'سكينة الليل', desc: 'همس هادئ جدًا — لأذكار النوم', file: f('t_sleep'), notify: true, plus: true, credit: ORIGINAL },
  // أصوات السبحة
  { id: 'k_click', cat: 'tasbih', name: 'نقرة خرز خشبي', desc: 'نقرة خفيفة عند كل تسبيحة', file: f('k_click'), credit: ORIGINAL },
  { id: 'k_tap', cat: 'tasbih', name: 'لمسة ناعمة', desc: 'نقرة منخفضة هادئة', file: f('k_tap'), plus: true, credit: ORIGINAL },
  { id: 'k_stone', cat: 'tasbih', name: 'خرز حجري', desc: 'نقرة حجر مزدوجة', file: f('k_stone'), plus: true, credit: ORIGINAL },
  { id: 'k_33', cat: 'tasbih', name: 'تمام الثلاث والثلاثين', desc: 'جرسان عند الوصول إلى 33', file: f('k_33'), credit: ORIGINAL },
  { id: 'k_100', cat: 'tasbih', name: 'تمام المئة', desc: 'أربعة أجراس عند الوصول إلى 100', file: f('k_100'), credit: ORIGINAL },
  { id: 'k_done', cat: 'tasbih', name: 'إتمام الأذكار', desc: 'أجراس عند إكمال العدد أو إتمام الأذكار', file: f('k_done'), credit: ORIGINAL },
  // أصوات الطبيعة (حلقات تتكرر بلا قفزة)
  { id: 'n_rain', cat: 'nature', name: 'مطر هادئ', desc: 'قطرات مطر على أرض هادئة', file: f('n_rain'), loop: true, credit: ORIGINAL },
  { id: 'n_wind', cat: 'nature', name: 'نسيم الهواء', desc: 'هواء لطيف يعلو وينخفض', file: f('n_wind'), loop: true, credit: ORIGINAL },
  { id: 'n_waves', cat: 'nature', name: 'أمواج البحر', desc: 'موج يأتي ويذهب على الشاطئ', file: f('n_waves'), loop: true, plus: true, credit: ORIGINAL },
  { id: 'n_birds', cat: 'nature', name: 'عصافير الصباح', desc: 'تغريد متفرق في صباح هادئ', file: f('n_birds'), loop: true, plus: true, credit: ORIGINAL },
  { id: 'n_night', cat: 'nature', name: 'ليل هادئ للنوم', desc: 'صرير خافت في ليلة ساكنة', file: f('n_night'), loop: true, plus: true, credit: ORIGINAL },
]

/** عبارات التذكير البشرية المطلوبة: لا تسجيلات مرخّصة لها بعد — يضيف المستخدم تسجيله (بحقوقه) أو يسمعها بصوت الجهاز الآلي */
export const HUMAN_PHRASES: { id: string; text: string }[] = [
  { id: 'ph-morning', text: 'لا تنسَ أذكار الصباح' },
  { id: 'ph-dhikr', text: 'حان الآن وقت ذكر الله' },
  { id: 'ph-ratb', text: 'اجعل لسانك رطبًا بذكر الله' },
  { id: 'ph-evening', text: 'لا تنسَ أذكار المساء' },
  { id: 'ph-sleep', text: 'لا تنسَ أذكار النوم' },
  { id: 'ph-salawat', text: 'حان وقت الصلاة على النبي ﷺ' },
]

/** أذكار مفردة طُلبت تسجيلاتها: يُعرض المتوفر منها في حصن المسلم فقط، والباقي يضيفه المستخدم */
export const SINGLE_DHIKR: { id: string; text: string }[] = [
  { id: 'sd-subhan', text: 'سبحان الله' }, { id: 'sd-hamd', text: 'الحمد لله' }, { id: 'sd-akbar', text: 'الله أكبر' },
  { id: 'sd-istighfar', text: 'أستغفر الله' }, { id: 'sd-tahlil', text: 'لا إله إلا الله' }, { id: 'sd-subhan-bihamdih', text: 'سبحان الله وبحمده' },
  { id: 'sd-subhan-azim', text: 'سبحان الله العظيم' }, { id: 'sd-hawqala', text: 'لا حول ولا قوة إلا بالله' }, { id: 'sd-salawat', text: 'الصلاة على النبي ﷺ' },
]

export type DhikrGroup = 'morning' | 'evening' | 'sleep'
export const GROUP_TITLES: Record<DhikrGroup, string> = { morning: 'أذكار الصباح', evening: 'أذكار المساء', sleep: 'أذكار النوم' }

/** تسجيلات حصن المسلم لمجموعة أذكار، بترتيبها في التطبيق (المطابقة لنصّها فقط) */
export function hisnRecordings(group: DhikrGroup): StudioSound[] {
  const cat = ADHKAR.find((c) => c.id === group)
  return (cat?.items ?? []).filter((it) => HISN_AUDIO[it.id]).map((it) => ({
    id: `h-${it.id}`, cat: 'dhikr' as const, name: (it.text ?? '').split('،')[0].slice(0, 60) || it.id, desc: it.source,
    url: hisnAudioUrl(it.id)!, credit: HISN_AUDIO_CREDIT, itemId: it.id,
  }))
}

/** الآيات في مجموعة أذكار (تُتلى بصوت قارئ مصحف يختاره المستخدم) */
export function quranItems(group: DhikrGroup): { id: string; label: string; ranges: { surah: number; from: number; to: number }[] }[] {
  const cat = ADHKAR.find((c) => c.id === group)
  return (cat?.items ?? []).filter((it) => it.quran?.length).map((it) => ({ id: it.id, label: it.source, ranges: it.quran! }))
}

export type SessionGroup = DhikrGroup | 'wake'
export interface FullSession { id: string; group: SessionGroup; title: string; reciter: string | null; url: string; secs: number; bytes: number }
const ML = (n: string) => `https://archive.org/download/makkah-live.-net-athkar-01/MakkahLive.Net_athkar_${n}.mp3`
export const FULL_SESSIONS_CREDIT = 'التسجيلات: مجموعة «مكة لايف» على أرشيف الإنترنت (archive.org)'
/** تسجيلات الأذكار كاملة (جلسة واحدة لكل تسجيل) بأصوات قرّاء معروفين — مُتحقق من نسبة كل ملف لقارئه */
export const FULL_SESSIONS: FullSession[] = [
  { id: 'fs-m-afasy', group: 'morning', title: 'أذكار الصباح', reciter: 'مشاري العفاسي', url: ML('03'), secs: 1265, bytes: 10168000 },
  { id: 'fs-m-abbad', group: 'morning', title: 'أذكار الصباح', reciter: 'فارس عباد', url: ML('05'), secs: 1233, bytes: 9913046 },
  { id: 'fs-m-jibril', group: 'morning', title: 'أذكار الصباح', reciter: 'محمد جبريل', url: ML('07'), secs: 1308, bytes: 10513240 },
  { id: 'fs-m-short', group: 'morning', title: 'أذكار الصباح (مختصرة)', reciter: null, url: ML('09'), secs: 223, bytes: 1830323 },
  { id: 'fs-e-afasy', group: 'evening', title: 'أذكار المساء', reciter: 'مشاري العفاسي', url: ML('04'), secs: 1257, bytes: 10103425 },
  { id: 'fs-e-abbad', group: 'evening', title: 'أذكار المساء', reciter: 'فارس عباد', url: ML('06'), secs: 1228, bytes: 9870208 },
  { id: 'fs-e-jibril', group: 'evening', title: 'أذكار المساء', reciter: 'محمد جبريل', url: ML('08'), secs: 1347, bytes: 10821903 },
  { id: 'fs-e-short', group: 'evening', title: 'أذكار المساء (مختصرة)', reciter: null, url: ML('10'), secs: 234, bytes: 1917676 },
  { id: 'fs-daynight', group: 'morning', title: 'أذكار اليوم والليلة', reciter: 'ناصر القطامي', url: ML('02'), secs: 354, bytes: 2877353 },
  { id: 'fs-s-afasy', group: 'sleep', title: 'أذكار النوم', reciter: 'مشاري العفاسي', url: ML('11'), secs: 634, bytes: 5121558 },
  { id: 'fs-w-afasy', group: 'wake', title: 'أذكار الاستيقاظ من النوم', reciter: 'مشاري العفاسي', url: ML('01'), secs: 132, bytes: 1104804 },
]
/** التسجيلات الكاملة لمجموعة (أذكار اليوم والليلة تظهر مع الصباح والمساء، والاستيقاظ مع النوم) */
export const sessionsFor = (g: DhikrGroup) => FULL_SESSIONS.filter((x) => x.group === g || (g === 'evening' && x.id === 'fs-daynight') || (g === 'sleep' && x.group === 'wake'))
export const fmtDur = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`

export const ALL_STUDIO_SOUNDS: StudioSound[] = [...BUNDLED, ...hisnRecordings('morning'), ...hisnRecordings('evening'), ...hisnRecordings('sleep')]
export const soundById = (id: string) => ALL_STUDIO_SOUNDS.find((s) => s.id === id)
/** قناة إشعار Android لنغمة من المكتبة (الملف res/raw/snd_<id>.ogg، والنغمة الافتراضية rafiq_chime) */
export const soundChannel = (id: string, flags = 'v1') => `rafiq-snd-${id}-${flags}`
export const soundRawName = (id: string) => (id === 'chime' ? 'rafiq_chime.ogg' : `snd_${id}.ogg`)
