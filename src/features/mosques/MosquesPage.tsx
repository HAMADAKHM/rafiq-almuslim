import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LocateFixed, MapPin, Navigation, ExternalLink, RotateCcw, Star, Search } from 'lucide-react'
import { Empty, PageHead, Spinner } from '../../components/Common'
import { useSettings } from '../../state/SettingsContext'
import { getCurrentPosition } from '../../platform'
import { useLive } from '../../hooks'
import { FAV_KEY, bearingDeg, directionName, directionsUrl, distanceM, findMosques, formatDistance, lastMosques, loadFavMosques, radarPoint, saveFavMosques, toggleFav, type FavMosque, type Mosque, type MosqueResult } from '../../services/mosques'
import { cityLabel, loadCities, searchCities, type City } from '../../services/cities'

/** رادار مصغّر: موقعك في المركز والشمال للأعلى، وكل نقطة مسجد بحسب المسافة والاتجاه (ليس خريطة) */
function Radar({ mosques, radius }: { mosques: Mosque[]; radius: number }) {
  return (
    <svg viewBox="-110 -110 220 220" className="mosque-radar" role="img" aria-label={`رادار المساجد: ${mosques.length} مسجدًا حولك ضمن ${formatDistance(radius)}، والشمال للأعلى`}>
      {[1, 2 / 3, 1 / 3].map((r) => <circle key={r} r={r * 100} fill="none" stroke="currentColor" strokeOpacity={0.18} />)}
      <line x1={-100} y1={0} x2={100} y2={0} stroke="currentColor" strokeOpacity={0.12} />
      <line x1={0} y1={-100} x2={0} y2={100} stroke="currentColor" strokeOpacity={0.12} />
      <text x={0} y={-103} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>ش</text>
      {mosques.map((m) => { const p = radarPoint(m, radius); return <circle key={m.id} cx={p.x * 100} cy={p.y * 100} r={4.5} className="radar-dot" /> })}
      <circle r={6} className="radar-me" />
    </svg>
  )
}

function CitySearch({ disabled, onPick }: { disabled: boolean; onPick: (c: City) => void }) {
  const [q, setQ] = useState('')
  const [cities, setCities] = useState<City[] | null>(null)
  useEffect(() => { if (q.trim().length >= 2 && !cities) loadCities().then(setCities).catch(() => {}) }, [q, cities])
  const hits = useMemo(() => (cities && q.trim().length >= 2 ? searchCities(cities, q, undefined, 6) : []), [cities, q])
  return (
    <div className="stack" style={{ gap: 4 }}>
      <label className="row small" style={{ flexWrap: 'nowrap' }}><Search size={16} aria-hidden="true" />
        <input className="input" value={q} disabled={disabled} onChange={(e) => setQ(e.target.value)} placeholder="أو ابحث في مدينة أخرى" aria-label="البحث عن المساجد في مدينة" />
      </label>
      {hits.length > 0 && <div className="row">{hits.map((c) => <button key={c.id} className="btn btn-sm" onClick={() => { setQ(''); onPick(c) }}>{cityLabel(c)}</button>)}</div>}
    </div>
  )
}

type State = { phase: 'idle' } | { phase: 'locating' } | { phase: 'loading' } | { phase: 'done'; result: MosqueResult; cached?: boolean } | { phase: 'error'; message: string }
const RADII = [1000, 3000, 5000, 10000]

export function MosquesPage() {
  const { settings } = useSettings()
  const [radius, setRadius] = useState(3000)
  const [state, setState] = useState<State>({ phase: 'idle' })
  const abort = useRef<AbortController | null>(null)
  const favs = useLive(() => loadFavMosques(), ['kv:' + FAV_KEY], [] as FavMosque[])
  const isFav = (id: string) => favs.some((f) => f.id === id)
  const fav = (m: FavMosque) => saveFavMosques(toggleFav(favs, m))
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
        <CitySearch disabled={busy} onPick={(c) => search({ lat: c.lat, lng: c.lng, label: cityLabel(c) })} />
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
            {state.result.mosques.length > 0 && <Radar mosques={state.result.mosques} radius={state.result.radius} />}
            {state.result.mosques.length === 0 ? <Empty>لم تُسجَّل مساجد في هذا النطاق على الخريطة المفتوحة. جرّب نطاقًا أوسع.</Empty> : (
              <ul className="list-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="المساجد">
                {state.result.mosques.map((m) => (
                  <li key={m.id} className="list-card mosque-row">
                    <span className="icon-chip green" aria-hidden="true"><Navigation size={20} style={{ transform: `rotate(${m.bearing}deg)` }} /></span>
                    <span className="lc-body">
                      <strong>{m.name}</strong>
                      <small>{formatDistance(m.distance)} • باتجاه {directionName(m.bearing)}</small>
                    </span>
                    <button className={'btn btn-sm btn-ghost icon-btn' + (isFav(m.id) ? ' fav-on' : '')} aria-pressed={isFav(m.id)} aria-label={`${isFav(m.id) ? 'إزالة' : 'إضافة'} ${m.name} ${isFav(m.id) ? 'من' : 'إلى'} المفضلة`} onClick={() => fav(m)}><Star size={16} fill={isFav(m.id) ? 'currentColor' : 'none'} /></button>
                    <a className="btn btn-sm" href={directionsUrl(m)} target="_blank" rel="noopener noreferrer" aria-label={`المسار إلى ${m.name}`}><ExternalLink size={14} /> المسار</a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {favs.length > 0 && (
        <section className="card stack" style={{ marginTop: '1rem' }}>
          <h2 style={{ margin: 0 }}>مساجدي المفضلة</h2>
          <ul className="list-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="مساجدي المفضلة">
            {favs.map((f) => {
              const c = state.phase === 'done' ? state.result.center : null
              return (
                <li key={f.id} className="list-card mosque-row">
                  <span className="lc-body"><strong>{f.name}</strong>{c && <small>{formatDistance(distanceM(c, f))} • باتجاه {directionName(bearingDeg(c, f))} من {c.label}</small>}</span>
                  <button className="btn btn-sm btn-ghost icon-btn fav-on" aria-label={`إزالة ${f.name} من المفضلة`} onClick={() => fav(f)}><Star size={16} fill="currentColor" /></button>
                  <a className="btn btn-sm" href={directionsUrl(f)} target="_blank" rel="noopener noreferrer" aria-label={`المسار إلى ${f.name}`}><ExternalLink size={14} /> المسار</a>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <p className="small muted" style={{ marginTop: '1rem' }}>
        البيانات من <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© مساهمي OpenStreetMap</a> (ترخيص ODbL) عبر Overpass API. يضيفها متطوعون، فقد تكون ناقصة أو غير دقيقة، ولا تتضمن أوقات فتح المساجد. المسافة خط مستقيم تقريبي، وقد يكون الموقع التقريبي للهاتف بعيدًا عن موقعك الفعلي مئات الأمتار.
      </p>
    </>
  )
}
