// نص أي ذكر أو دعاء كما هو: النص المكتوب، أو آيات المصحف المضمّن لعناصر القرآن
import type { QuranData } from '../services/quran'
import type { DhikrItem } from './types'
import { ADHKAR } from './adhkar'
import { DUAS } from './duas'

export function itemText(data: QuranData | null, it: DhikrItem): string {
  if (it.text) return it.text
  if (!data || !it.quran) return ''
  return it.quran.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => data.verses[r.surah - 1][r.from + i - 1])).join(' ۝ ')
}

/** البحث عن ذكر أو دعاء بمعرّفه في المكتبة */
export function findItem(id: string): DhikrItem | null {
  for (const c of [...ADHKAR, ...DUAS]) {
    const it = c.items.find((x) => x.id === id)
    if (it) return it
  }
  return null
}
