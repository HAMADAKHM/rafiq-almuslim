import { useMemo, useState } from 'react'
import { ChevronDown, Copy, Image, Star } from 'lucide-react'
import type { DhikrItem } from '../content/types'
import { QuranRefText } from './QuranRefText'
import { ShareCardDialog } from './ShareCardDialog'
import { copyText, vibrate } from '../platform'
import { toast } from '../hooks'
import { favorites } from '../db/repos'

export const KIND_LABEL = { quran: 'قرآن كريم', hadith: 'حديث نبوي', general: 'دعاء عام', personal: 'ذكر شخصي — ليس من المأثور' } as const
export const kindBadge = (k: DhikrItem['kind']) => 'badge ' + (k === 'quran' ? 'badge-quran' : k === 'personal' ? 'badge-personal' : 'badge-hadith')

export interface DhikrCardProps {
  item: DhikrItem
  fav: boolean
  favKind: 'dhikr' | 'dua' | 'hadith'
  withCounter?: boolean
  /** العدد المحفوظ لهذا اليوم (يُستأنف عند العودة) */
  count?: number
  onCount?: (n: number) => void
  onNext?: () => void
}

export function DhikrCard({ item, fav, favKind, withCounter, count = 0, onCount, onNext }: DhikrCardProps) {
  const [share, setShare] = useState(false)
  const target = item.count ?? 1
  const n = count
  const done = n >= target
  const cardInput = useMemo(() => (item.text ? { kind: 'dhikr' as const, heading: item.kind === 'hadith' ? 'من السنة النبوية' : 'دعاء', text: item.text, reference: item.source.length <= 70 ? item.source : item.source.split(/[:—]/)[0].trim() } : null), [item])
  return (
    <article className={'card dhikr-card' + (withCounter && done ? ' is-done' : '')} id={`dhikr-${item.id}`}>
      <div className="spread" style={{ marginBottom: 6 }}>
        <span className={kindBadge(item.kind)}>{KIND_LABEL[item.kind]}</span>
        <span className="row">
          {item.count && <span className="badge">{item.count <= 10 ? `${item.count} مرات` : `${item.count} مرة`}</span>}
          {item.text && (
            <>
              <button className="btn btn-ghost btn-sm icon-btn" aria-label="نسخ" onClick={async () => toast((await copyText(`${item.text}\n— ${item.source}`)) ? 'نُسخ النص' : 'تعذر النسخ')}><Copy size={15} /></button>
              <button className="btn btn-ghost btn-sm icon-btn" aria-label="مشاركة كبطاقة" onClick={() => setShare(true)}><Image size={15} /></button>
            </>
          )}
          <button className="btn btn-ghost btn-sm icon-btn" aria-label={fav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={fav} onClick={() => favorites.toggle(favKind, item.id)}>
            <Star size={16} fill={fav ? 'var(--gold)' : 'none'} color={fav ? 'var(--gold)' : 'currentColor'} />
          </button>
        </span>
      </div>
      {item.note && <p className="small muted">{item.note}</p>}
      {item.quran ? <QuranRefText ranges={item.quran} size="calc(1.6rem * var(--adhkar-scale, 1))" /> : <p className="classic-text dhikr-text">{item.text}</p>}
      <p className="source">
        <strong>المصدر:</strong> {item.source}
        {item.grade && <> • <strong>الدرجة:</strong> {item.grade}</>}
      </p>
      {withCounter && (
        <div className="row" style={{ alignItems: 'stretch' }}>
          {target > 1 ? (
            <button className={'counter-btn' + (done ? ' done' : '')} style={{ flex: 1 }} onClick={() => {
              const next = n >= target ? 0 : n + 1
              onCount?.(next)
              if (next === target) vibrate('goal')
            }} aria-label={`عدّاد: ${n} من ${target}`}>
              {done ? `اكتمل (${target}) — اضغط لإعادة العد` : `${n} / ${target}`}
            </button>
          ) : (
            <button className={'counter-btn' + (done ? ' done' : '')} style={{ flex: 1 }} onClick={() => onCount?.(done ? 0 : 1)} aria-pressed={done}>{done ? 'تمّ ✓' : 'قرأته'}</button>
          )}
          {onNext && <button className="btn" onClick={onNext} aria-label="الذكر التالي"><ChevronDown size={18} /> التالي</button>}
        </div>
      )}
      <ShareCardDialog open={share} onClose={() => setShare(false)} input={share ? cardInput : null} />
    </article>
  )
}
