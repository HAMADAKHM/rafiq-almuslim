// البحث عن آية بالصوت: يحوّل النظامُ الكلام إلى نص (Google/Apple)، ثم نطابقه بنص المصحف هنا على الجهاز.
// المطابقة تتسامح مع الإملاء الحديث (بلا تشكيل ولا رسم عثماني) ومع أخطاء التعرف الجزئية.
import { searchSkeleton } from '../lib/arabic'
import type { QuranData } from './quran'

export interface VoiceMatch { surah: number; ayah: number; score: number; exact: boolean }

interface Entry { s: number; a: number; sk: string; tri: Set<string> }
const cache = new WeakMap<QuranData, Entry[]>()

function trigrams(sk: string): Set<string> {
  const t = sk.replace(/ /g, '')
  const out = new Set<string>()
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3))
  return out
}

function index(data: QuranData): Entry[] {
  let idx = cache.get(data)
  if (!idx) {
    idx = []
    data.verses.forEach((list, si) => list.forEach((text, ai) => { const sk = searchSkeleton(text); idx!.push({ s: si + 1, a: ai + 1, sk, tri: trigrams(sk) }) }))
    cache.set(data, idx)
  }
  return idx
}

/** أفضل الآيات المطابقة لنص منطوق. أول نتيجة هي الأرجح. */
export function matchSpokenAyah(data: QuranData, spoken: string | string[], limit = 5): VoiceMatch[] {
  const idx = index(data)
  const candidates = (Array.isArray(spoken) ? spoken : [spoken]).map(searchSkeleton).filter((x) => x.replace(/ /g, '').length >= 4)
  const best = new Map<string, VoiceMatch>()
  const put = (m: VoiceMatch) => { const k = `${m.surah}:${m.ayah}`; const old = best.get(k); if (!old || m.score > old.score) best.set(k, m) }
  for (const sk of candidates) {
    const compact = sk.replace(/ /g, '')
    // ١) تطابق تام (مع تجاهل المسافات)، ويشمل نصًا يمتد عبر آيتين متتاليتين
    for (let i = 0; i < idx.length; i++) {
      const e = idx[i]
      const here = e.sk.replace(/ /g, '')
      // الدرجة: طول النص المطابق أولًا (عبارة مسموعة أطول أدق)، ثم نسبة تغطيتها للآية
      if (here.includes(compact)) { put({ surah: e.s, ayah: e.a, score: compact.length + compact.length / Math.max(here.length, 1), exact: true }); continue }
      const next = idx[i + 1]
      if (next && next.s === e.s && (here + next.sk.replace(/ /g, '')).includes(compact)) put({ surah: e.s, ayah: e.a, score: compact.length + 0.01, exact: true })
    }
    if ([...best.values()].some((m) => m.exact)) continue
    // ٢) تقارب بالمقاطع الثلاثية لتعويض أخطاء التعرف على الكلام
    const q = trigrams(sk)
    if (q.size < 3) continue
    for (const e of idx) {
      let hit = 0
      for (const t of q) if (e.tri.has(t)) hit++
      const score = hit / q.size
      if (score >= 0.55) put({ surah: e.s, ayah: e.a, score, exact: false })
    }
  }
  return [...best.values()].sort((x, y) => (y.exact ? 1 : 0) - (x.exact ? 1 : 0) || y.score - x.score).slice(0, limit)
}
