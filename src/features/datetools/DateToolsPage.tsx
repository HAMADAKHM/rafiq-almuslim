// تحويل التاريخ بين الهجري والميلادي، ومواعيد رمضان والعيدين للسنوات العشر القادمة.
// الحساب وفق تقويم أم القرى مع فرق الأيام المضبوط في الإعدادات — وقد تختلف المواعيد يومًا بحسب الرؤية.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { useSettings } from '../../state/SettingsContext'
import { fromHijri, HIJRI_MONTHS, toHijri, upcomingYearlyDates } from '../../services/calendar'
import { dateParts } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'

const gFmt = (d: Date) => new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
const gShort = (d: Date | null) => (d ? new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d) : '—')

export function DateToolsPage() {
  const { settings } = useSettings()
  const off = settings.hijriOffset
  const t = dateParts(new Date(), settings.location?.tz)
  const todayH = toHijri(new Date(), settings.location?.tz, off)
  const [g, setG] = useState(`${t.y}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`)
  const [h, setH] = useState({ y: todayH.year, m: todayH.month, d: todayH.day })
  const gToH = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(g)
    if (!m) return null
    const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
    return { date, hijri: toHijri(date, 'UTC', off) }
  }, [g, off])
  const hToG = useMemo(() => fromHijri(h.y, h.m, h.d, off), [h, off])
  const years = useMemo(() => upcomingYearlyDates(new Date(Date.UTC(t.y, t.m - 1, t.d, 12)), 10, off), [t.y, t.m, t.d, off])

  return (
    <>
      <PageHead title="تحويل التاريخ" subtitle="من الميلادي إلى الهجري والعكس، ومواعيد رمضان والعيدين" />
      <div className="stack">
        <section className="card stack" style={{ gap: 8 }} aria-label="من الميلادي إلى الهجري">
          <h2 style={{ margin: 0 }}><ArrowLeftRight size={18} /> من الميلادي إلى الهجري</h2>
          <input className="input" type="date" value={g} onChange={(e) => setG(e.target.value)} aria-label="التاريخ الميلادي" style={{ maxWidth: 220 }} />
          {gToH && <p className="convert-result" role="status">{gFmt(gToH.date)} = <strong>{toArabicDigits(gToH.hijri.day)} {HIJRI_MONTHS[gToH.hijri.month - 1]} {toArabicDigits(gToH.hijri.year)} هـ</strong></p>}
        </section>
        <section className="card stack" style={{ gap: 8 }} aria-label="من الهجري إلى الميلادي">
          <h2 style={{ margin: 0 }}><ArrowLeftRight size={18} /> من الهجري إلى الميلادي</h2>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="field" style={{ width: 90 }}><span>اليوم</span>
              <select className="select" value={h.d} onChange={(e) => setH({ ...h, d: +e.target.value })}>{Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
            </label>
            <label className="field" style={{ width: 150 }}><span>الشهر</span>
              <select className="select" value={h.m} onChange={(e) => setH({ ...h, m: +e.target.value })}>{HIJRI_MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
            </label>
            <label className="field" style={{ width: 110 }}><span>السنة</span>
              <input className="input" type="number" inputMode="numeric" min={1} max={1600} value={h.y} onChange={(e) => setH({ ...h, y: Math.max(1, Math.min(1600, +e.target.value || 1)) })} />
            </label>
          </div>
          <p className="convert-result" role="status">{hToG ? <>{toArabicDigits(h.d)} {HIJRI_MONTHS[h.m - 1]} {toArabicDigits(h.y)} هـ = <strong>{gFmt(hToG)}</strong></> : 'هذا اليوم غير موجود في هذا الشهر بحسب الحساب (الشهر 29 يومًا).'}</p>
        </section>
        <section className="card" aria-label="رمضان والعيدان">
          <h2>رمضان والعيدان في السنوات القادمة</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>السنة</th><th>بداية رمضان</th><th>عيد الفطر</th><th>يوم عرفة</th><th>عيد الأضحى</th></tr></thead>
              <tbody>
                {years.map((r) => (
                  <tr key={r.hijriYear}><td>{toArabicDigits(r.hijriYear)} هـ</td><td>{gShort(r.ramadan)}</td><td>{gShort(r.fitr)}</td><td>{gShort(r.arafah)}</td><td>{gShort(r.adha)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">مواعيد محسوبة وفق تقويم أم القرى، وقد تختلف يومًا أو يومين بحسب رؤية الهلال والجهة المعتمدة في بلدك. فرق الأيام الحالي: {off} (يُضبط من <Link to="/settings#prayer">الإعدادات</Link>).</p>
        </section>
      </div>
    </>
  )
}
