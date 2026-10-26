// حالة الطقس (رفيق بلس): مدينتك ومدن أخرى تختارها، من MET Norway، مع الساعات القادمة.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Droplets, Wind } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { usePlus } from '../../billing/PlusContext'
import { useSettings } from '../../state/SettingsContext'
import { getWeather, WEATHER_SOURCE, type WeatherNow } from '../../services/weather'
import { loadCities, searchCities, type City } from '../../services/cities'
import { kv } from '../../db/repos'
import { toArabicDigits } from '../../lib/arabic'

interface Place { name: string; nameAr?: string; country: string; lat: number; lng: number; tz?: string }
const LIST_KEY = 'weather:cities'
const MAX_PLACES = 8
const deg = (n: number) => `${toArabicDigits(n)}°`

function useWeather(p: Place | null) {
  const [w, setW] = useState<WeatherNow | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (!p) return
    let alive = true
    setErr(null)
    getWeather(p.lat, p.lng).then((x) => alive && setW(x)).catch((e: Error) => alive && setErr(e.message))
    return () => { alive = false }
  }, [p?.lat, p?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return { w, err }
}

function hourLabel(at: number, tz?: string) {
  return new Intl.DateTimeFormat('ar-u-nu-arab', { timeZone: tz, hour: 'numeric' }).format(new Date(at))
}

function PlaceCard({ place, big, onRemove }: { place: Place; big?: boolean; onRemove?: () => void }) {
  const { w, err } = useWeather(place)
  return (
    <section className={'card weather-card' + (big ? ' big' : '')} aria-label={`الطقس في ${place.nameAr ?? place.name}`}>
      <div className="weather-head">
        <h2>{place.nameAr ?? place.name}</h2>
        {onRemove && <button className="icon-btn" onClick={onRemove} aria-label={`حذف ${place.nameAr ?? place.name}`}><Trash2 size={16} /></button>}
      </div>
      {err && !w && <p className="muted">{err}</p>}
      {!w && !err && <p className="muted">جارٍ جلب الطقس…</p>}
      {w && (
        <>
          <div className="weather-now">
            <span className="weather-icon" aria-hidden="true">{w.icon}</span>
            <strong>{deg(w.temp)}</strong>
            <div><b>{w.label}</b><small className="muted">العظمى {deg(w.high)} • الصغرى {deg(w.low)}</small></div>
          </div>
          {big && (
            <>
              <div className="weather-meta">
                {w.humidity != null && <span><Droplets size={14} /> الرطوبة {toArabicDigits(Math.round(w.humidity))}٪</span>}
                {w.wind != null && <span><Wind size={14} /> الرياح {toArabicDigits(Math.round(w.wind * 3.6))} كم/س</span>}
              </div>
              <div className="weather-hours">
                {w.hours.map((h) => <div key={h.at}><small>{hourLabel(h.at, place.tz)}</small><span aria-label={h.label}>{h.icon}</span><b>{deg(h.temp)}</b></div>)}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

export function WeatherPage() {
  const { settings } = useSettings()
  const [list, setList] = useState<Place[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [q, setQ] = useState('')
  useEffect(() => { kv.get<Place[]>(LIST_KEY, []).then(setList) }, [])
  useEffect(() => { if (q.trim().length >= 2 && !cities.length) loadCities().then(setCities).catch(() => {}) }, [q, cities.length])
  const results = useMemo(() => (q.trim().length >= 2 ? searchCities(cities, q, undefined, 6) : []), [cities, q])
  const save = (l: Place[]) => { setList(l); kv.set(LIST_KEY, l) }
  const home = settings.location
  return (
    <div className="page">
      <PageHead title="حالة الطقس" subtitle="مدينتك ومدن أخرى تتابعها" />
      <PlusGate feature="weather" title="حالة الطقس">
        {home ? <PlaceCard place={home} big /> : <p className="notice">اختر مدينتك من <Link to="/prayer">صفحة المواقيت</Link> ليظهر طقسها هنا.</p>}
        <section className="card" aria-label="إضافة مدينة">
          <h2>مدن أخرى</h2>
          {list.length < MAX_PLACES ? (
            <>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اكتب اسم مدينة" aria-label="بحث عن مدينة" />
              <div className="chips" style={{ marginTop: '0.5rem' }}>
                {results.map((c) => (
                  <button key={c.id} className="chip" onClick={() => { save([...list, { name: c.name, nameAr: c.nameAr, country: c.country, lat: c.lat, lng: c.lng, tz: (c as City & { tz?: string }).tz }]); setQ('') }}>
                    <Plus size={14} /> {c.nameAr ?? c.name}
                  </button>
                ))}
              </div>
            </>
          ) : <p className="muted">وصلت إلى الحد الأقصى ({toArabicDigits(MAX_PLACES)} مدن).</p>}
        </section>
        <div className="weather-grid">
          {list.map((p, i) => <PlaceCard key={`${p.lat},${p.lng}`} place={p} onRemove={() => save(list.filter((_, k) => k !== i))} />)}
        </div>
        <p className="muted small">{WEATHER_SOURCE} — يُحدَّث كل 30 دقيقة، ولا يُرسل إلا إحداثيات المدينة.</p>
      </PlusGate>
    </div>
  )
}

/** شارة صغيرة في الرئيسية لمن لديه رفيق بلس (لا تظهر لغيره) */
export function WeatherChip() {
  const { entitled } = usePlus()
  const { settings } = useSettings()
  const loc = entitled ? settings.location : null
  const { w } = useWeather(loc)
  if (!loc || !w) return null
  return <Link to="/weather" className="weather-chip" aria-label={`الطقس: ${w.label} ${w.temp} درجة`}>{w.icon} {deg(w.temp)} {w.label}</Link>
}
