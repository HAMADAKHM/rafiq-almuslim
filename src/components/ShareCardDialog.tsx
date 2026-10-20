import { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { Sheet } from './Sheet'
import { renderCard, type CardInput } from '../services/shareCard'
import { shareImage } from '../platform'
import { toast } from '../hooks'

/** معاينة بطاقة المشاركة قبل إرسالها، مع اختيار المظهر */
export function ShareCardDialog({ open, onClose, input }: { open: boolean; onClose: () => void; input: Omit<CardInput, 'theme'> | null }) {
  const [theme, setTheme] = useState<CardInput['theme']>('emerald')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !input) return
    let alive = true
    let made: string | null = null
    setError(null)
    renderCard({ ...input, theme }, 1080)
      .then((b) => { if (!alive) return; made = URL.createObjectURL(b); setBlob(b); setUrl(made) })
      .catch((e: Error) => alive && setError(e.message))
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [open, input, theme])

  return (
    <Sheet open={open} onClose={onClose} title="بطاقة للمشاركة">
      <div className="row" role="radiogroup" aria-label="مظهر البطاقة" style={{ marginBottom: 8 }}>
        {([['emerald', 'زمردي'], ['ivory', 'عاجي'], ['night', 'ليلي']] as const).map(([id, label]) => (
          <button key={id} role="radio" aria-checked={theme === id} className={'btn btn-sm' + (theme === id ? ' btn-primary' : '')} onClick={() => setTheme(id)}>{label}</button>
        ))}
      </div>
      {error && <p className="alert alert-error small">{error}</p>}
      {url ? <img src={url} alt={`معاينة البطاقة: ${input?.reference ?? ''}`} className="card-preview" /> : !error && <div className="spinner" />}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" disabled={!blob} onClick={async () => {
          const r = await shareImage(blob!, 'rafiq-almuslim.png', input?.heading ?? 'رفيق المسلم')
          toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظت الصورة' : 'تعذرت المشاركة في هذه البيئة')
        }}><Share2 size={16} /> مشاركة الصورة</button>
        <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
      </div>
    </Sheet>
  )
}
