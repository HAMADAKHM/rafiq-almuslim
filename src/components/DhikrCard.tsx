import { useState } from 'react'
import { Copy, Star } from 'lucide-react'
import type { DhikrItem } from '../content/types'
import { QuranRefText } from './QuranRefText'
import { copyText } from '../platform'
import { toast } from '../hooks'
import { favorites } from '../db/repos'

const KIND_LABEL = { quran: 'قرآن كريم', hadith: 'حديث نبوي', general: 'دعاء عام' } as const

export function DhikrCard({ item, fav, favKind, withCounter }: { item: DhikrItem; fav: boolean; favKind: 'dhikr' | 'dua'; withCounter?: boolean }) {
  const [n, setN] = useState(0)
  const target = item.count ?? 1
  const done = n >= target
  return (
    <article className="card">
      <div className="spread" style={{ marginBottom: 6 }}>
        <span className={'badge ' + (item.kind === 'quran' ? 'badge-quran' : 'badge-hadith')}>{KIND_LABEL[item.kind]}</span>
        <span className="row">
          {item.count && <span className="badge">{item.count <= 10 ? `${item.count} مرات` : `${item.count} مرة`}</span>}
          {item.text && (
            <button className="btn btn-ghost btn-sm icon-btn" aria-label="نسخ" onClick={async () => toast((await copyText(`${item.text}\n— ${item.source}`)) ? 'نُسخ النص' : 'تعذر النسخ')}><Copy size={15} /></button>
          )}
          <button className="btn btn-ghost btn-sm icon-btn" aria-label={fav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={fav} onClick={() => favorites.toggle(favKind, item.id)}>
            <Star size={16} fill={fav ? 'var(--gold)' : 'none'} color={fav ? 'var(--gold)' : 'currentColor'} />
          </button>
        </span>
      </div>
      {item.note && <p className="small muted">{item.note}</p>}
      {item.quran ? <QuranRefText ranges={item.quran} size="1.6rem" /> : <p className="classic-text">{item.text}</p>}
      <p className="source">
        <strong>المصدر:</strong> {item.source}
        {item.grade && <> • <strong>الدرجة:</strong> {item.grade}</>}
      </p>
      {withCounter && target > 1 && (
        <button className={'counter-btn' + (done ? ' done' : '')} onClick={() => setN((x) => (x >= target ? 0 : x + 1))} aria-label={`عدّاد: ${n} من ${target}`}>
          {done ? `اكتمل (${target}) — اضغط لإعادة العد` : `${n} / ${target}`}
        </button>
      )}
    </article>
  )
}
