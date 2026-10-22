// القرّاء: ملفات صوتية لكل آية تُبث مباشرة من مصدرين مستقلين، ويُجرَّب الثاني تلقائيًا إن فشل الأول:
// 1) EveryAyah:        https://everyayah.com/data/{folder}/{SSS}{AAA}.mp3
// 2) Islamic Network:  https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{رقم الآية المتسلسل}.mp3
//    (الخادم الذي تستخدمه واجهة alquran.cloud المفتوحة)
// ملاحظة: لم يكن الوصول إلى الخادمين متاحًا من بيئة البناء، لذلك نجرّب أكثر من رابط لكل آية.
import { findAyahIdBySurah } from 'quran-meta/hafs'

export interface Reciter {
  id: string
  name: string
  style: string
  /** مجلد القارئ في EveryAyah (إن وُجد) */
  folder?: string
  /** معرّف القارئ في Islamic Network (إن وُجد) */
  edition?: string
}

export const RECITERS: Reciter[] = [
  { id: 'alafasy', name: 'مشاري راشد العفاسي', style: 'مرتل', folder: 'Alafasy_128kbps', edition: 'ar.alafasy' },
  { id: 'husary', name: 'محمود خليل الحصري', style: 'مرتل', folder: 'Husary_128kbps', edition: 'ar.husary' },
  { id: 'husary-muallim', name: 'محمود خليل الحصري', style: 'المصحف المعلم — مناسب للحفظ', folder: 'Husary_Muallim_128kbps' },
  { id: 'minshawi', name: 'محمد صديق المنشاوي', style: 'مرتل', folder: 'Minshawy_Murattal_128kbps', edition: 'ar.minshawi' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', style: 'مرتل', folder: 'Abdul_Basit_Murattal_192kbps', edition: 'ar.abdulbasitmurattal' },
  { id: 'sudais', name: 'عبد الرحمن السديس', style: 'مرتل', folder: 'Abdurrahmaan_As-Sudais_192kbps', edition: 'ar.abdurrahmaansudais' },
  { id: 'shuraym', name: 'سعود الشريم', style: 'مرتل', folder: 'Saood_ash-Shuraym_128kbps', edition: 'ar.saoodshuraym' },
  { id: 'muaiqly', name: 'ماهر المعيقلي', style: 'مرتل', folder: 'MaherAlMuaiqly128kbps', edition: 'ar.mahermuaiqly' },
  { id: 'ghamdi', name: 'سعد الغامدي', style: 'مرتل', folder: 'Ghamadi_40kbps' },
  { id: 'shatri', name: 'أبو بكر الشاطري', style: 'مرتل', folder: 'Abu_Bakr_Ash-Shaatree_128kbps', edition: 'ar.shaatree' },
  { id: 'hudhaify', name: 'علي الحذيفي', style: 'مرتل', folder: 'Hudhaify_128kbps', edition: 'ar.hudhaify' },
  { id: 'ayyoub', name: 'محمد أيوب', style: 'مرتل', folder: 'Muhammad_Ayyoub_128kbps', edition: 'ar.muhammadayyoub' },
  // 1.0: قرّاء إضافيون. لكل من له معرّف في Islamic Network مصدر بديل مؤكد (من قائمة الإصدارات الصوتية المفتوحة)
  { id: 'ajamy', name: 'أحمد بن علي العجمي', style: 'مرتل', folder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', edition: 'ar.ahmedajamy' },
  { id: 'rifai', name: 'هاني الرفاعي', style: 'مرتل', folder: 'Hani_Rifai_192kbps', edition: 'ar.hanirifai' },
  { id: 'basfar', name: 'عبد الله بصفر', style: 'مرتل', folder: 'Abdullah_Basfar_192kbps', edition: 'ar.abdullahbasfar' },
  { id: 'jibreel', name: 'محمد جبريل', style: 'مرتل', folder: 'Muhammad_Jibreel_128kbps', edition: 'ar.muhammadjibreel' },
  { id: 'akhdar', name: 'إبراهيم الأخضر', style: 'مرتل', folder: 'Ibrahim_Akhdar_32kbps', edition: 'ar.ibrahimakhbar' },
  { id: 'sowaid', name: 'أيمن سويد', style: 'مرتل — تعليمي', folder: 'Ayman_Sowaid_64kbps', edition: 'ar.aymanswoaid' },
  { id: 'husary-mujawwad', name: 'محمود خليل الحصري', style: 'مجود', folder: 'Husary_128kbps_Mujawwad', edition: 'ar.husarymujawwad' },
  { id: 'minshawi-mujawwad', name: 'محمد صديق المنشاوي', style: 'مجود', folder: 'Minshawy_Mujawwad_192kbps', edition: 'ar.minshawimujawwad' },
  // من EveryAyah فقط (بلا مصدر بديل)
  { id: 'dossary', name: 'ياسر الدوسري', style: 'مرتل', folder: 'Yasser_Ad-Dussary_128kbps' },
  { id: 'qatami', name: 'ناصر القطامي', style: 'مرتل', folder: 'Nasser_Alqatami_128kbps' },
  { id: 'fares', name: 'فارس عباد', style: 'مرتل', folder: 'Fares_Abbad_64kbps' },
  { id: 'budair', name: 'صلاح البدير', style: 'مرتل', folder: 'Salah_Al_Budair_128kbps' },
  { id: 'juhany', name: 'عبد الله عواد الجهني', style: 'مرتل', folder: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps' },
  { id: 'tablawi', name: 'محمد الطبلاوي', style: 'مرتل', folder: 'Mohammad_al_Tablaway_128kbps' },
  { id: 'qahtani', name: 'خالد القحطاني', style: 'مرتل', folder: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps' },
  { id: 'alijaber', name: 'علي جابر', style: 'مرتل', folder: 'Ali_Jaber_64kbps' },
]

export const AUDIO_BASE = 'https://everyayah.com/data'

export function ayahAudioUrl(reciter: Reciter, surah: number, ayah: number): string | null {
  if (!reciter.folder) return null
  const p = (n: number) => String(n).padStart(3, '0')
  return `${AUDIO_BASE}/${reciter.folder}/${p(surah)}${p(ayah)}.mp3`
}

export const MIRROR_BASE = 'https://cdn.islamic.network/quran/audio'

/** كل الروابط الممكنة لملف آية، بالترتيب الذي يُجرَّب به */
export function ayahAudioSources(reciter: Reciter, surah: number, ayah: number): string[] {
  const first = ayahAudioUrl(reciter, surah, ayah)
  const out = first ? [first] : []
  if (reciter.edition) {
    const n = findAyahIdBySurah(surah as never, ayah as never)
    // بعض الإصدارات متاحة بمعدل بت واحد فقط (32 أو 48 أو 64)
    for (const br of [128, 64, 192, 48, 32]) out.push(`${MIRROR_BASE}/${br}/${reciter.edition}/${n}.mp3`)
  }
  return out
}

export function reciterById(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0]
}
