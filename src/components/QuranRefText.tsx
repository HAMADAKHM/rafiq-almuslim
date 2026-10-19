import { Link } from 'react-router-dom'
import { useQuran } from '../hooks'
import { toArabicDigits } from '../lib/arabic'
import type { QuranRange } from '../content/types'

/** يعرض آيات من المصحف المعتمد بمرجعها (لا يُكتب نص قرآني يدويًا في المحتوى). */
export function QuranRefText({ ranges, size }: { ranges: QuranRange[]; size?: string }) {
  const { data, error } = useQuran()
  if (error) return <p className="alert alert-error">{error}</p>
  if (!data) return <div className="spinner" aria-label="جارٍ التحميل" />
  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      {ranges.map((r) => {
        const s = data.meta.surahs[r.surah - 1]
        const ayahs = data.verses[r.surah - 1].slice(r.from - 1, r.to)
        return (
          <div key={`${r.surah}:${r.from}`}>
            {ranges.length > 1 && <div className="small muted">سورة {s.name}</div>}
            <p className="quran-text" style={size ? { fontSize: size } : undefined}>
              {ayahs.map((a, i) => (
                <span key={i}>{a} <span className="ayah-num">{toArabicDigits(r.from + i)}</span> </span>
              ))}
            </p>
            <Link className="small" to={`/quran/${r.surah}?ayah=${r.from}`}>
              {s.name} {r.from === r.to ? r.from : `${r.from}–${r.to}`}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
