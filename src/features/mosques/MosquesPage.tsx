import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LocateFixed, MapPin, Navigation, ExternalLink, RotateCcw } from 'lucide-react'
import { Empty, PageHead, Spinner } from '../../components/Common'
import { useSettings } from '../../state/SettingsContext'
import { getCurrentPosition } from '../../platform'
import { directionName, directionsUrl, findMosques, formatDistance, lastMosques, type MosqueResult } from '../../services/mosques'
import { cityLabel } from '../../services/cities'

type State = { phase: 'idle' } | { phase: 'locating' } | { phase: 'loading' } | { phase: 'done'; result: MosqueResult; cached?: boolean } | { phase: 'error'; message: string }
const RADII = [1000, 3000, 5000, 10000]

export function MosquesPage() {
  const { settings } = useSettings()
  const [radius, setRadius] = useState(3000)
  const [state, setState] = useState<State>({ phase: 'idle' })
  const abort = useRef<AbortController | null>(null)
  useEffect(() => {
    // آخر نتيجة محفوظة تُعرض فورًا (مفيد دون اتصال)، مع توضيح أنها محفوظة
    lastMosques().then((r) => { if (r) setState((s) => (s.phase === 'idle' ? { phase: 'done', result: r, cached: true } : s)) }).catch(() => {})
    return () => abort.current?.abort()
  }, [])

  const search = async (center: { lat: number; lng: number; label: string }) => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setState({ phase: 'loading' })
    try {
      setState({ phase: 'done', result: await findMosques(center, radius, ctrl.signal) })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setState({ phase: 'error', message: (e as Error).message })
    }
  }
  const nearMe = async () => {
    setState({ phase: 'locating' })
    try {
      const p = await getCurrentPosition()
      await search({ lat: p.lat, lng: p.lng, label: 'موقعك الحالي' })
    } catch (e) {
      setState({ phase: 'error', message: (e as Error).message })
    }
  }
  const loc = settings.location
  const busy = state.phase === 'locating' || state.phase === 'loading'

  return (
    <>
      <PageHead title="المساجد القريبة" subtitle="المسافة والاتجاه، وفتح المسار في تطبيق الخرائط" />
      <section className="card stack">
        <div className="row">
          <button className="btn btn-primary" onClick={nearMe} disabled={busy}><LocateFixed size={16} /> ابحث حول موقعي</button>
          {loc && <button className="btn" onClick={() => search({ lat: loc.lat, lng: loc.lng, label: cityLabel(loc) })} disabled={busy}><MapPin size={16} /> حول {loc.nameAr ?? loc.name}</button>}
          <label className="row small">نطاق البحث
            <select className="select" style={{ width: 110, minHeight: 36 }} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="نطاق البحث">
              {RADII.map((r) => <option key={r} value={r}>{formatDistance(r)}</option>)}
            </select>
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>يُطلب الموقع فقط عند ضغط «ابحث حول موقعي»، ولا يُحفظ إلا على جهازك. {!loc && <>أو <Link to="/prayer">اختر مدينتك</Link> للبحث حولها دون إذن الموقع.</>}</p>
      </section>

      <div style={{ marginTop: '1rem' }} aria-live="polite">
        {state.phase === 'locating' && <Spinner label="جارٍ تحديد الموقع" />}
        {state.phase === 'loading' && <Spinner label="جارٍ البحث عن المساجد" />}
        {state.phase === 'error' && (
          <div className="alert alert-error small" role="alert">
            {state.message}
            <div className="row" style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={nearMe}><RotateCcw size={14} /> إعادة المحاولة</button></div>
          </div>
        )}
        {state.phase === 'done' && (
          <>
            <p className="small muted">
              {state.result.mosques.length} مسجدًا ضمن {formatDistance(state.result.radius)} حول {state.result.center.label}
              {state.cached && <> • نتائج محفوظة من {new Date(state.result.at).toLocaleString('ar')}</>}
            </p>
            {state.result.mosques.length === 0 ? <Empty>لم تُسجَّل مساجد في هذا النطاق على الخريطة المفتوحة. جرّب نطاقًا أوسع.</Empty> : (
              <ul className="list-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="المساجد">
                {state.result.mosques.map((m) => (
                  <li key={m.id} className="list-card mosque-row">
                    <span className="icon-chip green" aria-hidden="true"><Navigation size={20} style={{ transform: `rotate(${m.bearing}deg)` }} /></span>
                    <span className="lc-body">
                      <strong>{m.name}</strong>
                      <small>{formatDistance(m.distance)} • باتجاه {directionName(m.bearing)}</small>
                    </span>
                    <a className="btn btn-sm" href={directionsUrl(m)} target="_blank" rel="noopener noreferrer" aria-label={`المسار إلى ${m.name}`}><ExternalLink size={14} /> المسار</a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <p className="small muted" style={{ marginTop: '1rem' }}>
        البيانات من <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© مساهمي OpenStreetMap</a> (ترخيص ODbL) عبر Overpass API. يضيفها متطوعون، فقد تكون ناقصة أو غير دقيقة، ولا تتضمن أوقات فتح المساجد. المسافة خط مستقيم تقريبي، وقد يكون الموقع التقريبي للهاتف بعيدًا عن موقعك الفعلي مئات الأمتار.
      </p>
    </>
  )
}
