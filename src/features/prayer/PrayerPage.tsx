import { useMemo, useState } from 'react'
import { Bell, BellOff, MapPin, Sunrise, Sun, CloudSun, Sunset, Moon, MoonStar, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHead } from '../../components/Common'
import { MosqueScene, type SceneTone } from '../../components/Art'
import { kv } from '../../db/repos'
import { useLive } from '../../hooks'
import { dayKey, shiftDayKey } from '../../lib/dates'
import type { PrayerName } from '../../services/prayer'
import type { PrayerKey } from '../../state/settings'
import { platformName } from '../../platform'
import { compassName, distanceToKaabaKm, qiblaBearing } from '../../services/qibla'

/** بطاقة القبلة المختصرة: الاتجاه المحسوب بالدرجات من الشمال الجغرافي والمسافة إلى الكعبة */
function QiblaCard({ lat, lng, place }: { lat: number; lng: number; place: string }) {
  const deg = qiblaBearing(lat, lng)
  return (
    <Link to="/qibla" className="card qibla-card" aria-label={`اتجاه القبلة ${Math.round(deg)} درجة`}>
      <div>
        <div className="small muted">اتجاه القبلة من {place}</div>
        <div className="qc-deg">{Math.round(deg)}°</div>
        <div className="small">{compassName(deg)} • {Math.round(distanceToKaabaKm(lat, lng)).toLocaleString('ar')} كم إلى الكعبة</div>
        <div className="small muted" style={{ marginTop: 4 }}>محسوب من الإحداثيات (من الشمال الجغرافي). افتح البوصلة للتوجيه.</div>
      </div>
      <svg className="qc-dial" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
        {[0, 90, 180, 270].map((a) => <line key={a} x1="50" y1="8" x2="50" y2="14" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" transform={`rotate(${a} 50 50)`} />)}
        <text x="50" y="24" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">ش</text>
        <g transform={`rotate(${deg} 50 50)`}>
          <path d="M50 16 L56 50 L50 46 L44 50 Z" fill="#C6A15B" />
          <rect x="45" y="12" width="10" height="9" rx="1.5" fill="#26352F" stroke="#C6A15B" strokeWidth="1" />
        </g>
        <circle cx="50" cy="50" r="3" fill="#C6A15B" />
      </svg>
    </Link>
  )
}
import { CityPicker } from '../../components/CityPicker'
import { useNow } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { METHODS, nextPrayer, PRAYER_LABELS, PRAYERS, upcomingDays, todayTimes } from '../../services/prayer'
import { formatCountdown, formatGregorian, formatHijri, formatTime } from '../../lib/dates'
import { cityLabel } from '../../services/cities'

const ICONS: Record<PrayerName, typeof Sun> = { fajr: MoonStar, sunrise: Sunrise, dhuhr: Sun, asr: CloudSun, maghrib: Sunset, isha: Moon }
const TONE: Record<PrayerName, SceneTone> = { fajr: 'dawn', sunrise: 'dawn', dhuhr: 'day', asr: 'day', maghrib: 'sunset', isha: 'night' }
const prayedKey = (d: string) => `prayed:${d}`

/** متابعة الصلوات اليومية (اختيارية، محلية فقط) */
function usePrayed(day: string) {
  return useLive(() => kv.get<PrayerKey[]>(prayedKey(day), []), ['kv:' + prayedKey(day)], [] as PrayerKey[], [day])
}

function WeekSummary({ today }: { today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, i - 6))
  const all = useLive(() => Promise.all(days.map((d) => kv.get<PrayerKey[]>(prayedKey(d), []))), days.map((d) => 'kv:' + prayedKey(d)), [] as PrayerKey[][], [today])
  const total = all.reduce((a, x) => a + x.length, 0)
  return <p className="small muted" style={{ margin: '0.5rem 0 0' }}>آخر 7 أيام: {total} من 35 صلاة مسجّلة. هذا السجل لك وحدك ويُحفظ على جهازك.</p>
}

export function PrayerPage() {
  const { settings, update } = useSettings()
  const loc = settings.location
  const [picking, setPicking] = useState(false)
  const now = useNow(1000)

  const days = useMemo(() => (loc ? upcomingDays(loc, settings.prayer, 7) : []), [loc, settings.prayer, now.getDate()]) // eslint-disable-line react-hooks/exhaustive-deps
  const next = loc ? nextPrayer(loc, settings.prayer, now) : null
  const today = loc ? todayTimes(loc, settings.prayer, now) : null
  const method = METHODS.find((m) => m.id === settings.prayer.method)
  const today_ = dayKey(now, loc?.tz)
  const prayed = usePrayed(today_)
  const n = settings.notifications
  const togglePrayed = (p: PrayerKey) => kv.set(prayedKey(today_), prayed.includes(p) ? prayed.filter((x) => x !== p) : [...prayed, p])

  return (
    <>
      <PageHead title="مواقيت الصلاة" subtitle={loc ? undefined : 'اختر مدينتك لعرض المواقيت'} />
      {loc && next && (
        <section className="prayer-hero">
          <MosqueScene tone={TONE[next.name]} className="prayer-hero-art" />
          <div className="prayer-hero-text">
            <div className="ph-city"><MapPin size={16} /> {cityLabel(loc)}</div>
            <div className="ph-method">طريقة الحساب: {method?.label}</div>
            <div className="ph-date">{formatGregorian(now, loc.tz)}</div>
            <div className="ph-hijri">{formatHijri(now, loc.tz, settings.hijriOffset)}</div>
            <button className="btn btn-sm ph-change" onClick={() => setPicking((p) => !p)}><MapPin size={14} /> {picking ? 'إغلاق' : 'تغيير المدينة'}</button>
          </div>
        </section>
      )}

      {(!loc || picking) && (
        <section className="card" style={{ margin: '1rem 0' }}>
          <h2>اختيار المدينة</h2>
          <CityPicker onDone={() => setPicking(false)} />
        </section>
      )}

      {loc && next && today && (
        <div className="grid grid-2 prayer-grid">
          <section className="card next-prayer-card" aria-live="polite">
            <div className="spread" style={{ alignItems: 'start' }}>
              <div>
                <div className="muted small">الصلاة القادمة</div>
                <div className="np-name">{PRAYER_LABELS[next.name]}</div>
                <div className="np-time">{formatTime(next.time, loc.tz)}</div>
              </div>
              <Link to="/reminders" className="icon-chip green" aria-label="التنبيهات">{n.enabled ? <Bell size={20} /> : <BellOff size={20} />}</Link>
            </div>
            <div className="np-left">باقي على الأذان <span className="countdown" aria-label="الوقت المتبقي">{formatCountdown(next.time.getTime() - now.getTime())}</span></div>
            <p className="small muted" style={{ margin: '0.4rem 0 0' }}>الوقت الآن في {loc.nameAr ?? loc.name}: {formatTime(now, loc.tz)} <span dir="ltr">({loc.tz})</span></p>
          </section>

          <section className="card">
            <div className="spread"><h2 style={{ margin: 0 }}>مواقيت اليوم</h2>
              <label className="check small"><input type="checkbox" className="switch-input" role="switch" checked={settings.trackPrayers} onChange={(e) => update({ trackPrayers: e.target.checked })} aria-label="متابعة أداء الصلوات" /> متابعة الصلوات</label>
            </div>
            <ul className="prayer-rows">
              {PRAYERS.map((p) => {
                const Icon = ICONS[p]
                const isNext = next.name === p && next.time.getTime() === today[p].getTime()
                const notif = p !== 'sunrise' && n.enabled && n.perPrayer[p as PrayerKey]
                return (
                  <li key={p} className={'prayer-row' + (isNext ? ' next' : '') + (p === 'sunrise' ? ' sunrise' : '')}>
                    <span className="pr-icon"><Icon size={18} aria-hidden="true" /></span>
                    <span className="pr-name">{PRAYER_LABELS[p]}</span>
                    <span className="pr-time">{formatTime(today[p], loc.tz)}</span>
                    <span className="pr-end">
                      {settings.trackPrayers && p !== 'sunrise' && <button className={'prayed-btn' + (prayed.includes(p as PrayerKey) ? ' on' : '')} onClick={() => togglePrayed(p as PrayerKey)} aria-pressed={prayed.includes(p as PrayerKey)} aria-label={`صلّيت ${PRAYER_LABELS[p]}`}><CircleCheck size={18} /></button>}
                      {p !== 'sunrise' && (
                        <button className={'bell-btn' + (notif ? ' on' : '')} aria-pressed={n.perPrayer[p as PrayerKey]} aria-label={`تنبيه ${PRAYER_LABELS[p]}`}
                          title={n.enabled ? undefined : 'التذكيرات العامة متوقفة — فعّلها من إعدادات التذكير'}
                          onClick={() => update((st) => ({ notifications: { ...st.notifications, perPrayer: { ...st.notifications.perPrayer, [p]: !st.notifications.perPrayer[p as PrayerKey] } } }))}>
                          {n.perPrayer[p as PrayerKey] ? <Bell size={16} /> : <BellOff size={16} />}
                        </button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            {settings.trackPrayers && <WeekSummary today={today_} />}
            {!n.enabled && <p className="small muted" style={{ margin: '0.5rem 0 0' }}>أجراس الصلوات تحدد أي صلاة يُنبَّه لها، والتذكيرات نفسها متوقفة الآن. <Link to="/reminders">تفعيل التذكيرات</Link></p>}
          </section>

          <QiblaCard lat={loc.lat} lng={loc.lng} place={loc.nameAr ?? loc.name} />

          {platformName() === 'android' && (
            <section className="card" style={{ gridColumn: '1 / -1' }}>
              <h2>ودجت المواقيت</h2>
              <p className="small" style={{ margin: 0 }}>لإضافة الصلاة القادمة ومواقيت اليوم إلى الشاشة الرئيسية: اضغط مطولًا على مكان فارغ في الشاشة الرئيسية ← «الأدوات» (Widgets) ← رفيق المسلم. يتحدث الودجت عند دخول كل وقت وعند فتح التطبيق.</p>
            </section>
          )}

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
