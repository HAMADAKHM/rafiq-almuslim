import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { cityLabel, countryList, loadCities, searchCities, type City } from '../services/cities'
import { getCurrentPosition, deviceTimeZone } from '../platform'
import { suggestMethod } from '../services/prayer'
import { useSettings } from '../state/SettingsContext'
import type { SavedLocation } from '../state/settings'
import { toast } from '../hooks'
import { Spinner } from './Common'

function nearest(cities: City[], lat: number, lng: number): City {
  let best = cities[0], bd = Infinity
  for (const c of cities) {
    const d = (c.lat - lat) ** 2 + ((c.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
    if (d < bd) { bd = d; best = c }
  }
  return best
}

export function CityPicker({ onDone }: { onDone?: () => void }) {
  const { settings, update } = useSettings()
  const [cities, setCities] = useState<City[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [country, setCountry] = useState<string>(settings.location?.country ?? '')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ lat: '', lng: '', tz: deviceTimeZone(), name: '' })

  useEffect(() => { loadCities().then(setCities).catch(() => setErr('تعذر تحميل قائمة المدن.')) }, [])
  const countries = useMemo(() => (cities ? countryList(cities) : []), [cities])
  const results = useMemo(() => (cities ? searchCities(cities, q, country || undefined, 30) : []), [cities, q, country])
  const zones = useMemo(() => { try { return Intl.supportedValuesOf('timeZone') } catch { return [deviceTimeZone()] } }, [])

  const choose = (loc: SavedLocation) => {
    const changedCountry = settings.location?.country !== loc.country
    update((s) => ({ location: loc, prayer: changedCountry && !settings.location ? { ...s.prayer, method: suggestMethod(loc.country) } : s.prayer }))
    toast('تم حفظ الموقع: ' + (loc.nameAr ?? loc.name))
    onDone?.()
  }

  const useGps = async () => {
    setBusy(true); setErr(null)
    try {
      const pos = await getCurrentPosition()
      const list = cities ?? (await loadCities())
      const near = nearest(list, pos.lat, pos.lng)
      choose({ name: `My location (near ${near.name})`, nameAr: `موقعي الحالي (قرب ${near.nameAr ?? near.name})`, country: near.country, lat: +pos.lat.toFixed(4), lng: +pos.lng.toFixed(4), tz: near.tz, source: 'gps' })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const saveManual = () => {
    const lat = Number(m.lat), lng = Number(m.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || m.lat === '' || m.lng === '') {
      setErr('أدخل خط عرض بين -90 و90 وخط طول بين -180 و180.')
      return
    }
    choose({ name: m.name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`, country: country || 'XX', lat, lng, tz: m.tz, source: 'manual' })
  }

  if (!cities && !err) return <Spinner label="جارٍ تحميل المدن" />

  return (
    <div className="stack">
      <div className="row">
        <button className="btn btn-primary" onClick={useGps} disabled={busy}>
          <MapPin size={16} aria-hidden="true" /> {busy ? 'جارٍ التحديد…' : 'استخدم موقعي الحالي'}
        </button>
        <span className="small muted">اختياري — يُستخدم موقعك على جهازك فقط ولا يُرسل لأي خادم.</span>
      </div>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <div className="grid grid-2" style={{ gap: '0.75rem' }}>
        <label className="field">
          <span>الدولة</span>
          <select className="select" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="الدولة">
            <option value="">كل الدول</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>ابحث عن المدينة (بالعربية أو الإنجليزية)</span>
          <div style={{ position: 'relative' }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: نابلس، Nablus" aria-label="اسم المدينة" />
            <Search size={16} aria-hidden="true" style={{ position: 'absolute', insetInlineEnd: 12, top: 13, opacity: 0.5 }} />
          </div>
        </label>
      </div>
      <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflowY: 'auto', gap: 4 }} aria-label="نتائج المدن">
        {results.map((c) => (
          <li key={c.id}>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => choose({ name: c.name, nameAr: c.nameAr, country: c.country, lat: c.lat, lng: c.lng, tz: c.tz, source: 'city' })}>
              <span>{cityLabel(c)}{c.nameAr && <span className="muted small"> — {c.name}</span>}</span>
              <span className="small muted" dir="ltr">{c.tz}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="muted small">لا توجد نتائج. جرّب الاسم بالإنجليزية أو أدخل الإحداثيات يدويًا.</li>}
      </ul>
      <button className="btn btn-ghost btn-sm" onClick={() => setManual((v) => !v)} aria-expanded={manual} style={{ alignSelf: 'start' }}>
        {manual ? 'إخفاء الإدخال اليدوي' : 'إدخال الإحداثيات يدويًا'}
      </button>
      {manual && (
        <div className="grid grid-3" style={{ gap: '0.75rem' }}>
          <label className="field"><span>اسم المكان</span><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></label>
          <label className="field"><span>خط العرض</span><input className="input" dir="ltr" inputMode="decimal" value={m.lat} onChange={(e) => setM({ ...m, lat: e.target.value })} placeholder="32.2211" /></label>
          <label className="field"><span>خط الطول</span><input className="input" dir="ltr" inputMode="decimal" value={m.lng} onChange={(e) => setM({ ...m, lng: e.target.value })} placeholder="35.2544" /></label>
          <label className="field"><span>المنطقة الزمنية</span>
            <select className="select" dir="ltr" value={m.tz} onChange={(e) => setM({ ...m, tz: e.target.value })}>
              {zones.map((z) => <option key={z}>{z}</option>)}
            </select>
          </label>
          <div style={{ alignSelf: 'end' }}><button className="btn btn-primary" onClick={saveManual}>حفظ</button></div>
        </div>
      )}
    </div>
  )
}
