// التلاوة على شاشة التلفاز: قائمة الآيات بحسب الوضع المختار، بأصوات القرّاء (EveryAyah وIslamic Network).
// الأذان أولى دائمًا: تتوقف التلاوة عند دخول الوقت وتُستأنف بعد الإقامة.
import { ADHKAR } from '../content/adhkar'
import { ayahOfDay, adhkarForNow } from '../services/daily'
import type { QuranMeta } from '../services/quran'

export type ReciteMode = 'ayah' | 'surah' | 'adhkar'
/** ayah = 0 تعني البسملة قبل بداية السورة (تُتلى من ملف الفاتحة 1:1) */
export interface AyahRef { surah: number; ayah: number }
export const BASMALA_AYAH = 0

/** قرّاء بأصوات هادئة مناسبة للاستماع المتواصل (من قائمة التطبيق) */
export const TV_RECITERS = ['husary', 'minshawi', 'alafasy', 'abdulbasit', 'ajamy', 'basfar', 'husary-mujawwad', 'minshawi-mujawwad', 'muaiqly', 'shatri']

export const RECITE_MODES: { id: ReciteMode; label: string; hint: string }[] = [
  { id: 'surah', label: 'تلاوة متواصلة', hint: 'سورة تختارها ثم ما بعدها، ويُحفظ الموضع' },
  { id: 'ayah', label: 'آية اليوم', hint: 'تُتلى آية اليوم ثم تتكرر كل بضع دقائق' },
  { id: 'adhkar', label: 'آيات الأذكار', hint: 'آيات أذكار الصباح أو المساء أو النوم بحسب الوقت (آية الكرسي والمعوذات…)' },
]

/** فاصل الصمت قبل إعادة آية اليوم أو آيات الأذكار */
export const REPEAT_GAP_MS = 3 * 60_000

/** قائمة الآيات للوضع المختار */
export function reciteQueue(mode: ReciteMode, meta: Pick<QuranMeta, 'surahs'>, opts: { day: string; hour: number; surah: number; from?: number }): AyahRef[] {
  if (mode === 'ayah') return [ayahOfDay(opts.day)]
  if (mode === 'adhkar') {
    const cat = ADHKAR.find((c) => c.id === adhkarForNow(opts.hour).id)
    return (cat?.items ?? []).flatMap((it) => (it.kind === 'quran' && it.quran ? it.quran.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => ({ surah: r.surah, ayah: r.from + i }))) : []))
  }
  const s = Math.min(114, Math.max(1, opts.surah))
  const count = meta.surahs[s - 1].count
  const start = Math.min(count, Math.max(1, opts.from ?? 1))
  const ayat = Array.from({ length: count - start + 1 }, (_, i) => ({ surah: s, ayah: start + i }))
  // التلاوة المتواصلة: البسملة قبل أول السورة (عدا الفاتحة فهي آيتها الأولى، والتوبة بلا بسملة)
  return start === 1 && s !== 1 && s !== 9 ? [{ surah: s, ayah: BASMALA_AYAH }, ...ayat] : ayat
}

/** السورة التالية بعد ختم سورة في التلاوة المتواصلة (بعد الناس تعود إلى الفاتحة) */
export const nextSurah = (s: number) => (s >= 114 ? 1 : s + 1)
