import { Link } from 'react-router-dom'
import { HOME_CARD } from '../content/dedication'

export function DedicationCard() {
  return (
    <section className="card dedication-card" aria-label="إهداء التطبيق">
      <div className="ornament" aria-hidden="true">✦ ✦ ✦</div>
      <h2 style={{ justifyContent: 'center', margin: '0.25rem 0' }}>{HOME_CARD.app}</h2>
      <p className="muted small" style={{ margin: 0 }}>{HOME_CARD.tagline}</p>
      <p style={{ margin: '0.6rem 0 0' }}>{HOME_CARD.line1}</p>
      <p className="name" style={{ margin: 0 }}>{HOME_CARD.name}</p>
      <p className="small muted" style={{ margin: '0.25rem 0 0.5rem' }}>{HOME_CARD.prayer}</p>
      <Link to="/about" className="small">رسالة الوفاء</Link>
    </section>
  )
}
