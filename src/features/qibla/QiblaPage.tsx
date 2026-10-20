import { useEffect, useRef, useState } from 'react'
import { Compass } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { CityPicker } from '../../components/CityPicker'
import { useSettings } from '../../state/SettingsContext'
import { compassName, distanceToKaabaKm, qiblaBearing } from '../../services/qibla'
import { compassAvailable, watchHeading } from '../../platform'
import { cityLabel } from '../../services/cities'

function Dial({ bearing, heading }: { bearing: number; heading: number | null }) {
  // إن توفر اتجاه الجهاز ندير القرص بحيث يشير السهم للقبلة فعليًا؛ وإلا نعرض الاتجاه بالنسبة للشمال.
  const rotation = heading == null ? 0 : -heading
  return (
    <div className="compass">
      <svg viewBox="0 0 200 200" role="img" aria-label={`اتجاه القبلة ${bearing.toFixed(1)} درجة من الشمال`}>
        <g transform={`rotate(${rotation} 100 100)`}>
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--border)" strokeWidth="2" />
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="100" y1="10" x2="100" y2={i % 18 === 0 ? 22 : i % 2 === 0 ? 17 : 14} stroke="var(--text-muted)" strokeWidth={i % 18 === 0 ? 2 : 1} transform={`rotate(${i * 5} 100 100)`} />
          ))}
          <text x="100" y="38" textAnchor="middle" fontSize="13" fill="var(--danger)" fontWeight="700">ش</text>
          <text x="166" y="105" textAnchor="middle" fontSize="12" fill="var(--text-muted)">شرق</text>
          <text x="100" y="172" textAnchor="middle" fontSize="12" fill="var(--text-muted)">ج</text>
          <text x="34" y="105" textAnchor="middle" fontSize="12" fill="var(--text-muted)">غرب</text>
          <g transform={`rotate(${bearing} 100 100)`}>
            <line x1="100" y1="100" x2="100" y2="30" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
            <rect x="92" y="18" width="16" height="16" rx="2" fill="var(--text)" stroke="var(--gold)" strokeWidth="2" />
          </g>
          <circle cx="100" cy="100" r="6" fill="var(--gold)" />
        </g>
        {heading != null && <polygon points="100,2 94,14 106,14" fill="var(--gold)" />}
      </svg>
    </div>
  )
}

export function QiblaPage() {
  const { settings } = useSettings()
  const loc = settings.location
  const [heading, setHeading] = useState<number | null>(null)
  const [weak, setWeak] = useState<null | 'accuracy' | 'relative'>(null)
  const [sensorMsg, setSensorMsg] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => () => stopRef.current?.(), [])

  const start = async () => {
    setSensorMsg(null)
    if (!compassAvailable()) { setSensorMsg('هذا الجهاز أو المتصفح لا يوفر مستشعر اتجاه (البوصلة). استخدم الزاوية المعروضة مع بوصلة خارجية أو الشمس.'); return }
    try {
      let got = false
      stopRef.current = await watchHeading((r) => {
        if (r.heading == null) { if (!r.absolute) setWeak('relative'); return }
        got = true
        setHeading(r.heading)
        setWeak(r.accuracy != null && (r.accuracy < 0 || r.accuracy > 25) ? 'accuracy' : null)
      })
      setActive(true)
      setTimeout(() => { if (!got) setSensorMsg('لم تصل قراءات من مستشعر الاتجاه. على الكمبيوتر غالبًا لا يوجد مستشعر؛ جرّب على الهاتف.') }, 2500)
    } catch (e) {
      setSensorMsg((e as Error).message)
    }
  }

  if (!loc) {
    return (
      <>
        <PageHead title="اتجاه القبلة" subtitle="اختر موقعك لحساب اتجاه القبلة" />
        <section className="card"><CityPicker /></section>
      </>
    )
  }

  const bearing = qiblaBearing(loc.lat, loc.lng)
  const dist = distanceToKaabaKm(loc.lat, loc.lng)
  const aligned = heading != null && Math.abs(((bearing - heading + 540) % 360) - 180) < 4

  return (
    <>
      <PageHead title="اتجاه القبلة" subtitle={cityLabel(loc)} />
      <div className="grid grid-2">
        <section className="card" style={{ textAlign: 'center' }}>
          <Dial bearing={bearing} heading={heading} />
          <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>{bearing.toFixed(1)}°</p>
          <p className="muted">من الشمال الجغرافي باتجاه عقارب الساعة — نحو {compassName(bearing)}</p>
          {aligned && !weak && <p className="badge badge-success" role="status">أنت متجه نحو القبلة</p>}
          {weak && heading != null && <p className="alert alert-gold small" role="alert">دقة البوصلة ضعيفة حاليًا؛ لا تعتمد على السهم قبل المعايرة. حرّك الهاتف على شكل الرقم 8 بعيدًا عن المعادن.</p>}
          {weak === 'relative' && heading == null && <p className="alert alert-gold small" role="alert">المستشعر لا يعطي اتجاهًا مطلقًا نحو الشمال على هذا الجهاز، لذلك لا نعرض بوصلة حية. استخدم الزاوية المكتوبة.</p>}
          <div className="row" style={{ justifyContent: 'center' }}>
            {!active && <button className="btn btn-primary" onClick={start}><Compass size={16} /> تفعيل البوصلة</button>}
          </div>
          {sensorMsg && <p className="alert alert-gold small" role="alert" style={{ marginTop: 10 }}>{sensorMsg}</p>}
        </section>
        <section className="card">
          <h2>تفاصيل</h2>
          <ul>
            <li>المسافة إلى الكعبة المشرفة: <strong>{Math.round(dist).toLocaleString('ar-u-nu-latn')} كم</strong></li>
            <li>إحداثياتك: <span dir="ltr">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span></li>
            <li>إحداثيات الكعبة: <span dir="ltr">21.4225, 39.8262</span></li>
          </ul>
          <h3>تعليمات المعايرة</h3>
          <ol className="small">
            <li>أمسك الهاتف أفقيًا بعيدًا عن المعادن والأجهزة الكهربائية والمغناطيس.</li>
            <li>حرّك الهاتف في الهواء على شكل الرقم 8 عدة مرات لمعايرة المستشعر.</li>
            <li>أدر جسمك حتى يشير السهم الأخضر إلى الأعلى (المثلث الذهبي).</li>
          </ol>
          <h3>بدون بوصلة</h3>
          <p className="small">الزاوية أعلاه محسوبة رياضيًا من إحداثياتك (اتجاه الدائرة العظمى). استخدم أي بوصلة: اتجه نحو الشمال ثم استدر يمينًا بمقدار {bearing.toFixed(0)}°.</p>
          <p className="small muted">ملاحظة: البوصلات المغناطيسية تشير إلى الشمال المغناطيسي الذي قد يختلف عن الجغرافي ببضع درجات حسب المنطقة.</p>
        </section>
      </div>
    </>
  )
}
