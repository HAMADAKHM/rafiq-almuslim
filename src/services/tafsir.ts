// التفسير ومعاني المفردات: يُجلب عند الطلب من مستودع tafsir_api المفتوح (ملفات JSON ثابتة)
// ويُحفظ في IndexedDB للقراءة لاحقًا دون إنترنت. لا يُضمَّن في حزمة التطبيق لأن ترخيص إعادة
// توزيع بعض كتب التفسير لم يُتحقق منه بعد (انظر docs/SOURCES.md).
import { kv } from '../db/repos'

export interface TafsirEdition {
  slug: string
  name: string
  author: string
  kind: 'tafsir' | 'gharib'
}

export const TAFSIR_EDITIONS: TafsirEdition[] = [
  { slug: 'ar-tafsir-muyassar', name: 'التفسير الميسر', author: 'نخبة من العلماء — مجمع الملك فهد لطباعة المصحف الشريف', kind: 'tafsir' },
  { slug: 'ar-tafsir-al-mukhtasar', name: 'المختصر في تفسير القرآن الكريم', author: 'مركز تفسير للدراسات القرآنية', kind: 'tafsir' },
  { slug: 'ar-tafseer-al-saddi', name: 'تيسير الكريم الرحمن (تفسير السعدي)', author: 'الشيخ عبد الرحمن بن ناصر السعدي', kind: 'tafsir' },
  { slug: 'ar-tafsir-ibn-kathir', name: 'تفسير القرآن العظيم (ابن كثير)', author: 'الحافظ إسماعيل بن عمر بن كثير', kind: 'tafsir' },
  { slug: 'ar-tafsir-al-baghawi', name: 'معالم التنزيل (تفسير البغوي)', author: 'الإمام الحسين بن مسعود البغوي', kind: 'tafsir' },
  { slug: 'al-muyassar-fi-al-gharib', name: 'الميسر في غريب القرآن', author: 'معاني المفردات القرآنية', kind: 'gharib' },
]

const MIRRORS = [
  'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir',
  'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir',
]

export interface TafsirEntry { surah: number; ayah: number; text: string }

const mem = new Map<string, TafsirEntry[]>()

export async function getTafsirSurah(slug: string, surah: number, fetcher: typeof fetch = fetch): Promise<{ entries: TafsirEntry[]; fromCache: boolean }> {
  const key = `tafsir:${slug}:${surah}`
  if (mem.has(key)) return { entries: mem.get(key)!, fromCache: true }
  const stored = await kv.get<TafsirEntry[] | null>(key, null)
  if (stored) {
    mem.set(key, stored)
    return { entries: stored, fromCache: true }
  }
  let lastErr: unknown
  for (const m of MIRRORS) {
    try {
      const r = await fetcher(`${m}/${slug}/${surah}.json`)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const raw = (await r.json()) as { surah: number; ayah: number; text: string }[]
      const entries = raw.map(({ surah, ayah, text }) => ({ surah, ayah, text }))
      if (!entries.length || entries.some((e) => e.surah !== surah)) throw new Error('بيانات غير متطابقة')
      mem.set(key, entries)
      await kv.set(key, entries)
      return { entries, fromCache: false }
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error('تعذر تحميل التفسير. تحقق من الاتصال بالإنترنت؛ ما يُحمَّل مرة يبقى متاحًا دون اتصال.', { cause: lastErr })
}

/**
 * بعض الكتب تفسّر عدة آيات في نص واحد ويتكرر النص لكل آية؛ نجمع المتكرر المتتالي في مقطع واحد.
 */
export function groupEntries(entries: TafsirEntry[]): { from: number; to: number; text: string }[] {
  const out: { from: number; to: number; text: string }[] = []
  for (const e of entries) {
    const last = out[out.length - 1]
    if (last && last.text === e.text) last.to = e.ayah
    else out.push({ from: e.ayah, to: e.ayah, text: e.text })
  }
  return out
}
