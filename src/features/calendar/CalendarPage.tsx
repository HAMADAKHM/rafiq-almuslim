import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { useSettings } from '../../state/SettingsContext'
import { HIJRI_MONTHS, monthDays, toHijri, upcomingOccasions } from '../../services/calendar'
import { dateParts } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'
import { AdSlot } from '../../ads/AdSlot'

const WEEKDAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

export function CalendarPage() {
  const { settings } = useSettings()
  const tz = settings.location?.tz
  const todayParts = dateParts(new Date(), tz)
  const [ym, setYm] = useState({ y: todayParts.y, m: todayParts.m })
  const [selected, setSelected] = useState<string>(`${todayParts.y}-${String(todayParts.m).padStart(2, '0')}-${String(todayParts.d).padStart(2, '0')}`)
  const days = useMemo(() => monthDays(ym.y, ym.m, settings.hijriOffset), [ym, settings.hijriOffset])
  const upcoming = useMemo(() => upcomingOccasions(new Date(Date.UTC(todayParts.y, todayParts.m - 1, todayParts.d, 12)), settings.hijriOffset, 5), [todayParts.y, todayParts.m, todayParts.d, settings.hijriOffset])
  const todayH = toHijri(new Date(), tz, settings.hijriOffset)
  const sel = days.find((d) => d.key === selected)
  const shift = (d: number) => setYm(({ y, m }) => { const t = m + d; return t < 1 ? { y: y - 1, m: 12 } : t > 12 ? { y: y + 1, m: 1 } : { y, m: t } })
  const hijriSpan = [...new Set(days.map((d) => `${HIJRI_MONTHS[d.hijri.month - 1]} ${d.hijri.year}`))].join(' – ')
  const lead = days[0].weekday

  return (
    <>
      <PageHead title="التقويم الإسلامي" subtitle={`اليوم: ${toArabicDigits(todayH.day)} ${HIJRI_MONTHS[todayH.month - 1]} ${toArabicDigits(todayH.year)} هـ`} />
      <div className="alert alert-gold small" style={{ marginBottom: '1rem' }}>
        التواريخ محسوبة وفق تقويم أم القرى، وقد تختلف بداية الشهر يومًا في بلدك بحسب رؤية الهلال. يمكنك ضبط الفرق من <Link to="/settings#prayer">الإعدادات</Link> (الفرق الحالي: {settings.hijriOffset} يوم).
      </div>
      <div className="grid grid-2">
        <section className="card">
          <div className="spread">
            <button className="btn btn-sm icon-btn" onClick={() => shift(-1)} aria-label="الشهر السابق"><ChevronRight size={16} /></button>
            <div style={{ textAlign: 'center' }}>
              <strong>{new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(ym.y, ym.m - 1, 15))}</strong>
              <div className="small muted">{hijriSpan} هـ</div>
            </div>
            <button className="btn btn-sm icon-btn" onClick={() => shift(1)} aria-label="الشهر التالي"><ChevronLeft size={16} /></button>
          </div>
          <div className="cal-grid" role="grid" aria-label="أيام الشهر">
            {WEEKDAYS.map((w) => <div key={w} className="cal-head" role="columnheader">{w}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={'e' + i} />)}
            {days.map((d) => {
              const isToday = d.key === `${todayParts.y}-${String(todayParts.m).padStart(2, '0')}-${String(todayParts.d).padStart(2, '0')}`
              const big = d.occasions.find((o) => o.kind === 'eid') ? 'eid' : d.occasions.some((o) => o.kind === 'fast' && !o.title.startsWith('يوم')) ? 'fast' : ''
              return (
                <button key={d.key} role="gridcell" className={`cal-day ${big} ${isToday ? 'today' : ''} ${selected === d.key ? 'sel' : ''}`} onClick={() => setSelected(d.key)} aria-label={`${d.gDay} — ${d.hijri.day} ${HIJRI_MONTHS[d.hijri.month - 1]}${d.occasions.length ? ' — ' + d.occasions.map((o) => o.title).join('، ') : ''}`}>
                  <span className="g">{d.gDay}</span>
                  <span className="h">{toArabicDigits(d.hijri.day)}</span>
                </button>
              )
            })}
          </div>
          <div className="row small muted" style={{ marginTop: 8 }}>
            <span><span className="dot eid" /> عيد</span><span><span className="dot fast" /> صيام مستحب (عاشوراء، عرفة، الأيام البيض)</span>
          </div>
        </section>
        <section className="card">
          {sel && (
            <>
              <h2>{new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(sel.date)}</h2>
              <p className="muted">{toArabicDigits(sel.hijri.day)} {HIJRI_MONTHS[sel.hijri.month - 1]} {toArabicDigits(sel.hijri.year)} هـ</p>
              {sel.occasions.length ? (
                <ul>{sel.occasions.map((o) => <li key={o.title}><strong>{o.title}</strong>{o.note && ` — ${o.note}`}{o.source && <div className="source">{o.source}</div>}</li>)}</ul>
              ) : <p className="small muted">لا مناسبة مسجلة لهذا اليوم.</p>}
            </>
          )}
          <hr className="divider" />
          <h3>المناسبات القادمة</h3>
          <ul className="small">
            {upcoming.map((u) => (
              <li key={u.date.toISOString() + u.occasion.title}>
                <strong>{u.occasion.title}</strong> — {toArabicDigits(u.hijri.day)} {HIJRI_MONTHS[u.hijri.month - 1]} ({new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(u.date)} تقريبًا)
              </li>
            ))}
          </ul>
          <p className="small muted">يمكنك تفعيل تذكير مسبق بالمناسبات من <Link to="/reminders">إعدادات التذكير</Link>.</p>
        </section>
      </div>
      <AdSlot placement="calendar" />
    </>
  )
}
