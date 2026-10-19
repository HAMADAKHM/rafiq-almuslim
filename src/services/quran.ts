// خدمة القرآن الكريم: تحميل النص المعتمد والبيانات الوصفية من الملفات المحلية (public/data/quran)
// النص غير معدَّل: يُعرض كما ورد من المصدر (انظر docs/SOURCES.md).
import { searchSkeleton } from '../lib/arabic'

export interface SurahInfo {
  n: number
  name: string
  tr: string
  type: 'meccan' | 'medinan'
  count: number
  /** الرقم المتسلسل لأول آية (1..6236) */
  start: number
}

export interface QuranMeta {
  surahs: SurahInfo[]
  juz: number[]
  page: number[]
  rub: number[]
  sajdas: number[]
  pages: number
  source: { text: string; meta: string; sha256: string }
}

export interface QuranData {
  meta: QuranMeta
  verses: string[][]
}

export interface AyahRef {
  surah: number
  ayah: number
}

let cache: Promise<QuranData> | null = null
let skeletons: string[] | null = null

const base = () => (import.meta.env?.BASE_URL ?? '/')

export function loadQuran(fetcher: typeof fetch = fetch): Promise<QuranData> {
  if (!cache) {
    cache = Promise.all([
      fetcher(base() + 'data/quran/meta.json').then((r) => { if (!r.ok) throw new Error('meta'); return r.json() }),
      fetcher(base() + 'data/quran/quran.json').then((r) => { if (!r.ok) throw new Error('text'); return r.json() }),
    ]).then(([meta, text]) => ({ meta, verses: text.verses }))
    cache.catch(() => { cache = null })
  }
  return cache
}

/** للاختبارات: حقن بيانات محمّلة مسبقًا. */
export function setQuranData(data: QuranData) {
  cache = Promise.resolve(data)
  skeletons = null
}

export function globalId(meta: QuranMeta, surah: number, ayah: number): number {
  return meta.surahs[surah - 1].start + ayah - 1
}

export function refFromGlobal(meta: QuranMeta, id: number): AyahRef {
  let lo = 0, hi = 113
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (meta.surahs[mid].start <= id) lo = mid
    else hi = mid - 1
  }
  return { surah: lo + 1, ayah: id - meta.surahs[lo].start + 1 }
}

export function ayahMeta(meta: QuranMeta, surah: number, ayah: number) {
  const g = globalId(meta, surah, ayah) - 1
  return { juz: meta.juz[g], page: meta.page[g], rub: meta.rub[g], hizb: Math.ceil(meta.rub[g] / 4), sajda: meta.sajdas.includes(g + 1) }
}

/** أول آية في الجزء / الصفحة / الربع */
export function firstAyahOf(meta: QuranMeta, kind: 'juz' | 'page' | 'rub', value: number): AyahRef | null {
  const arr = meta[kind]
  const idx = arr.indexOf(value)
  return idx < 0 ? null : refFromGlobal(meta, idx + 1)
}

/** نطاق آيات صفحة من صفحات المصحف (604 صفحة، مصحف المدينة) */
export function pageRange(meta: QuranMeta, page: number): { from: AyahRef; to: AyahRef } | null {
  const first = meta.page.indexOf(page)
  if (first < 0) return null
  const last = meta.page.lastIndexOf(page)
  return { from: refFromGlobal(meta, first + 1), to: refFromGlobal(meta, last + 1) }
}

export function nextAyah(meta: QuranMeta, ref: AyahRef): AyahRef | null {
  const s = meta.surahs[ref.surah - 1]
  if (ref.ayah < s.count) return { surah: ref.surah, ayah: ref.ayah + 1 }
  if (ref.surah < 114) return { surah: ref.surah + 1, ayah: 1 }
  return null
}

export function prevAyah(meta: QuranMeta, ref: AyahRef): AyahRef | null {
  if (ref.ayah > 1) return { surah: ref.surah, ayah: ref.ayah - 1 }
  if (ref.surah > 1) return { surah: ref.surah - 1, ayah: meta.surahs[ref.surah - 2].count }
  return null
}

export interface AyahHit extends AyahRef {
  text: string
}

/** البحث في الآيات مع تجاهل التشكيل واختلاف الهمزات. يعيد حتى limit نتيجة. */
export function searchAyahs(data: QuranData, query: string, limit = 50): { hits: AyahHit[]; total: number } {
  const q = searchSkeleton(query)
  if (q.length < 2) return { hits: [], total: 0 }
  if (!skeletons) skeletons = data.verses.flatMap((s) => s.map(searchSkeleton))
  const hits: AyahHit[] = []
  let total = 0
  for (let g = 0; g < skeletons.length; g++) {
    if (skeletons[g].includes(q)) {
      total++
      if (hits.length < limit) {
        const ref = refFromGlobal(data.meta, g + 1)
        hits.push({ ...ref, text: data.verses[ref.surah - 1][ref.ayah - 1] })
      }
    }
  }
  return { hits, total }
}

/** البحث في أسماء السور (عربي/لاتيني/رقم) */
export function searchSurahs(meta: QuranMeta, query: string): SurahInfo[] {
  const q = query.trim()
  if (!q) return meta.surahs
  if (/^\d+$/.test(q)) return meta.surahs.filter((s) => String(s.n) === q)
  const sk = searchSkeleton(q)
  const lat = q.toLowerCase().replace(/[^a-z]/g, '')
  return meta.surahs.filter((s) => (sk && searchSkeleton(s.name).includes(sk)) || (lat && s.tr.toLowerCase().replace(/[^a-z]/g, '').includes(lat)))
}

/** تحليل مرجع مثل "2:255" أو "البقرة 255" */
export function parseRef(meta: QuranMeta, input: string): AyahRef | null {
  const m = input.trim().match(/^(\d{1,3})\s*[:：/ ]\s*(\d{1,3})$/)
  if (m) {
    const surah = Number(m[1]), ayah = Number(m[2])
    if (surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= meta.surahs[surah - 1].count) return { surah, ayah }
  }
  return null
}

export const BASMALA_SURAH_EXCEPTIONS = new Set([1, 9])
