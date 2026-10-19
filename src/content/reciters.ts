// القرّاء: ملفات صوتية لكل آية من مشروع EveryAyah (everyayah.com) — تُبث مباشرة من الخادم.
// صيغة الرابط: https://everyayah.com/data/{folder}/{SSS}{AAA}.mp3
// ملاحظة: لم يكن الوصول إلى الخادم متاحًا من بيئة البناء، فالمجلدات أدناه موثقة من المشروع
// لكن يجب التحقق منها يدويًا عند أول تشغيل (يعرض المشغل رسالة واضحة إن فشل التحميل).
export interface Reciter {
  id: string
  name: string
  style: string
  folder: string
}

export const RECITERS: Reciter[] = [
  { id: 'alafasy', name: 'مشاري راشد العفاسي', style: 'مرتل', folder: 'Alafasy_128kbps' },
  { id: 'husary', name: 'محمود خليل الحصري', style: 'مرتل', folder: 'Husary_128kbps' },
  { id: 'husary-muallim', name: 'محمود خليل الحصري', style: 'المصحف المعلم — مناسب للحفظ', folder: 'Husary_Muallim_128kbps' },
  { id: 'minshawi', name: 'محمد صديق المنشاوي', style: 'مرتل', folder: 'Minshawy_Murattal_128kbps' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', style: 'مرتل', folder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'sudais', name: 'عبد الرحمن السديس', style: 'مرتل', folder: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 'shuraym', name: 'سعود الشريم', style: 'مرتل', folder: 'Saood_ash-Shuraym_128kbps' },
  { id: 'muaiqly', name: 'ماهر المعيقلي', style: 'مرتل', folder: 'MaherAlMuaiqly128kbps' },
  { id: 'ghamdi', name: 'سعد الغامدي', style: 'مرتل', folder: 'Ghamadi_40kbps' },
  { id: 'shatri', name: 'أبو بكر الشاطري', style: 'مرتل', folder: 'Abu_Bakr_Ash-Shaatree_128kbps' },
  { id: 'hudhaify', name: 'علي الحذيفي', style: 'مرتل', folder: 'Hudhaify_128kbps' },
  { id: 'ayyoub', name: 'محمد أيوب', style: 'مرتل', folder: 'Muhammad_Ayyoub_128kbps' },
]

export const AUDIO_BASE = 'https://everyayah.com/data'

export function ayahAudioUrl(reciter: Reciter, surah: number, ayah: number): string {
  const p = (n: number) => String(n).padStart(3, '0')
  return `${AUDIO_BASE}/${reciter.folder}/${p(surah)}${p(ayah)}.mp3`
}

export function reciterById(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0]
}
