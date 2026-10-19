import { useMemo, useState } from 'react'
import { Bell, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHead } from '../../components/Common'
import { CityPicker } from '../../components/CityPicker'
import { useNow } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { METHODS, nextPrayer, PRAYER_LABELS, PRAYERS, upcomingDays, todayTimes } from '../../services/prayer'
import { formatCountdown, formatGregorian, formatHijri, formatTime } from '../../lib/dates'
import { cityLabel } from '../../services/cities'

export function PrayerPage() {
  const { settings } = useSettings()
  const loc = settings.location
  const [picking, setPicking] = useState(false)
  const now = useNow(1000)

  const days = useMemo(() => (loc ? upcomingDays(loc, settings.prayer, 7) : []), [loc, settings.prayer, now.getDate()]) // eslint-disable-line react-hooks/exhaustive-deps
  const next = loc ? nextPrayer(loc, settings.prayer, now) : null
  const today = loc ? todayTimes(loc, settings.prayer, now) : null
  const method = METHODS.find((m) => m.id === settings.prayer.method)

  return (
    <>
      <PageHead title="مواقيت الصلاة" subtitle={loc ? cityLabel(loc) : 'اختر مدينتك لعرض المواقيت'}
        actions={loc && <button className="btn" onClick={() => setPicking((p) => !p)}><MapPin size={16} /> {picking ? 'إغلاق' : 'تغيير المدينة'}</button>} />

      {(!loc || picking) && (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2>اختيار المدينة</h2>
          <CityPicker onDone={() => setPicking(false)} />
        </section>
      )}

      {loc && next && today && (
        <div className="grid grid-2">
          <section className="card" aria-live="polite">
            <div className="muted small">الصلاة القادمة</div>
            <h2 style={{ fontSize: '1.6rem', margin: '0.2rem 0' }}>{PRAYER_LABELS[next.name]} — {formatTime(next.time, loc.tz)}</h2>
            <div className="countdown" aria-label="الوقت المتبقي">{formatCountdown(next.time.getTime() - now.getTime())}</div>
            <p className="small muted" style={{ marginTop: 8 }}>{formatGregorian(now, loc.tz)} • {formatHijri(now, loc.tz, settings.hijriOffset)}</p>
            <p className="small muted">الوقت الحالي في {loc.nameAr ?? loc.name}: {formatTime(now, loc.tz)} <span dir="ltr">({loc.tz})</span></p>
          </section>

          <section className="card">
            <h2>مواقيت اليوم</h2>
            <table className="prayer-table">
              <tbody>
                {PRAYERS.map((p) => (
                  <tr key={p} className={next.name === p && next.time.getTime() === today[p].getTime() ? 'next' : ''}>
                    <td>{PRAYER_LABELS[p]}</td>
                    <td style={{ textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{formatTime(today[p], loc.tz)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <h2>الأيام القادمة</h2>
            <div className="table-scroll">
              <table className="prayer-table">
                <thead>
                  <tr><th>اليوم</th>{PRAYERS.map((p) => <th key={p}>{PRAYER_LABELS[p]}</th>)}</tr>
                </thead>
                <tbody>
                  {days.map(({ key, times }) => (
                    <tr key={`${key.y}-${key.m}-${key.d}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.UTC(key.y, key.m - 1, key.d, 12))}</td>
                      {PRAYERS.map((p) => <td key={p} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatTime(times[p], loc.tz)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <h2>طريقة الحساب</h2>
            <p>
              <strong>{method?.label}</strong> <span className="muted">({method?.detail})</span> • العصر: {settings.prayer.madhab === 'hanafi' ? 'الحنفي (ظل المثلين)' : 'الجمهور (ظل المثل)'}
            </p>
            <div className="alert alert-gold small">
              المواقيت محسوبة فلكيًا بمكتبة adhan وفق الإعدادات أعلاه، وقد تختلف دقائق عن التقويم الرسمي في بلدك.
              قارنها بتقويم وزارة الأوقاف أو المسجد المحلي، وعدّل طريقة الحساب أو أضف تعديلًا بالدقائق لكل صلاة من الإعدادات.
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <Link to="/settings#prayer" className="btn">تعديل طريقة الحساب</Link>
              <Link to="/settings#notifications" className="btn"><Bell size={16} /> التنبيهات</Link>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
