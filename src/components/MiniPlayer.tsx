import { Pause, Play, SkipBack, SkipForward, Square, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../hooks'
import { player } from '../services/audio'
import { reciterById } from '../content/reciters'

export function MiniPlayer() {
  const s = usePlayer()
  if (s.status === 'idle') return null
  const rec = reciterById(s.reciterId)
  return (
    <div className="mini-player" role="region" aria-label="مشغل التلاوة">
      <div className="info">
        <Link to={`/quran/${s.surah}?ayah=${s.ayah}`} style={{ textDecoration: 'none' }}>
          <strong>سورة {s.surahName}</strong> — {s.playingBasmala ? 'البسملة' : `الآية ${s.ayah}`}
        </Link>
        <div className="muted small">{rec.name}{s.status === 'loading' ? ' • جارٍ التحميل…' : ''}</div>
        {s.status === 'error' && <div className="small" style={{ color: 'var(--danger)' }} role="alert">{s.error}</div>}
      </div>
      <div className="row">
        <button className="btn btn-ghost icon-btn" onClick={() => player.prev()} aria-label="الآية السابقة"><SkipForward size={18} /></button>
        {s.status === 'error' ? (
          <button className="btn btn-primary icon-btn" onClick={() => player.retry()} aria-label="إعادة المحاولة"><RotateCcw size={18} /></button>
        ) : (
          <button className="btn btn-primary icon-btn" onClick={() => player.toggle()} aria-label={s.status === 'playing' ? 'إيقاف مؤقت' : 'تشغيل'}>
            {s.status === 'playing' ? <Pause size={18} /> : <Play size={18} />}
          </button>
        )}
        <button className="btn btn-ghost icon-btn" onClick={() => player.next()} aria-label="الآية التالية"><SkipBack size={18} /></button>
        <button className="btn btn-ghost icon-btn" onClick={() => player.stop()} aria-label="إيقاف"><Square size={16} /></button>
      </div>
    </div>
  )
}
