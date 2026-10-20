import { Link } from 'react-router-dom'
import { HOME_CARD, SADAQAH_LINE, SADAQAH_PRAYER } from '../content/dedication'
import { DedicationArt } from './Art'

export function DedicationCard() {
  return (
    <section className="dedication-card" aria-label="إهداء التطبيق">
      <DedicationArt className="dedication-art" />
      <div className="dedication-body">
        <p className="dedication-kicker">{HOME_CARD.tagline}</p>
        <p className="dedication-title">صدقة جارية</p>
        <p className="dedication-line">{SADAQAH_LINE}</p>
        <p className="dedication-prayer">{SADAQAH_PRAYER}</p>
        <Link to="/about" className="dedication-link">رسالة الوفاء</Link>
      </div>
    </section>
  )
}
