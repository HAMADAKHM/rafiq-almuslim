// مواقيت شهر كامل (ميلادي أو هجري) لمدينتك، وتصديرها ملف PDF للمشاركة أو الطباعة.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { useSettings } from '../../state/SettingsContext'
import { METHODS, PRAYER_LABELS, PRAYERS, prayerTimesFor } from '../../services/prayer'
import { fromHijri, HIJRI_MONTHS, hijriMonthLength, toHijri } from '../../services/calendar'
import { formatTime, dateParts } from '../../lib/dates'
import { buildPdf } from '../../services/pdf'
import { shareImage } from '../../platform'
import { toast } from '../../hooks'
import type { PrayerSettings } from '../../services/prayer'

const G_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

type Place = { lat: number; lng: number; tz: string; name: string; nameAr?: string }

/** أيام الشهر (ميلادي أو هجري) بتواريخها ومواقيتها */
export function monthRows(place: Place, prayer: PrayerSettings, kind: 'g' | 'h', y: number, m: number, hijriOffset = 0) {
  const days: Date[] = []
  if (kind === 'g') {
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
    for (let d = 1; d <= n; d++) days.push(new Date(Date.UTC(y, m - 1, d, 12)))
  } else {
    const n = hijriMonthLength(y, m, hijriOffset)
    for (let d = 1; d <= n; d++) { const g = fromHijri(y, m, d, hijriOffset); if (g) days.push(g) }
  }
  return days.map((date) => {
    const key = { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() }
    return { date, key, hijri: toHijri(date, 'UTC', hijriOffset), times: prayerTimesFor(place, key, prayer) }
  })
}

export function MonthTimes() {
  const { settings } = useSettings()
  const loc = settings.location!
  const [params] = useSearchParams()
  const ref = useRef<HTMLElement>(null)
  const t = dateParts(new Date(), loc.tz)
  const th = toHijri(new Date(), loc.tz, settings.hijriOffset)
  const [kind, setKind] = useState<'g' | 'h'>('g')
  const [ym, setYm] = useState({ y: t.y, m: t.m })
  const [hm, setHm] = useState({ y: th.year, m: th.month })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (params.get('pdf')) ref.current?.scrollIntoView({ behavior: 'smooth' }) }, [params])
  const cur = kind === 'g' ? ym : hm
  const rows = useMemo(() => monthRows(loc, settings.prayer, kind, cur.y, cur.m, settings.hijriOffset), [loc, settings.prayer, kind, cur.y, cur.m, settings.hijriOffset])
  const title = kind === 'g' ? `${G_MONTHS[cur.m - 1]} ${cur.y}` : `${HIJRI_MONTHS[cur.m - 1]} ${cur.y} هـ`
  const todayKey = `${t.y}-${t.m}-${t.d}`
  const shift = (d: number) => {
    const set = kind === 'g' ? setYm : setHm
    set(({ y, m }) => { const n = m + d; return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n } })
  }
  const dayLabel = (r: (typeof rows)[number]) => new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(r.date)
  const pdf = async () => {
    setBusy(true)
    try {
      const method = METHODS.find((x) => x.id === settings.prayer.method)?.label ?? ''
      const blob = await buildPdf([
        { type: 'title', text: `مواقيت الصلاة — ${title}` },
        { type: 'subtitle', text: `${loc.nameAr ?? loc.name} • ${method}` },
        { type: 'table', head: ['اليوم', 'الهجري', ...PRAYERS.map((p) => PRAYER_LABELS[p])], highlight: rows.findIndex((r) => `${r.key.y}-${r.key.m}-${r.key.d}` === todayKey),
          rows: rows.map((r) => [dayLabel(r), `${r.hijri.day} ${HIJRI_MONTHS[r.hijri.month - 1]}`, ...PRAYERS.map((p) => formatTime(r.times[p], loc.tz))]) },
        { type: 'note', text: 'مواقيت محسوبة وقد تختلف دقائق عن التقويم الرسمي في بلدك؛ والتاريخ الهجري وفق أم القرى وقد يختلف يومًا بحسب الرؤية.' },
      ], `مواقيت الصلاة — ${title}`)
      const r = await shareImage(blob, `mawaqit-${cur.y}-${cur.m}.pdf`, `مواقيت الصلاة — ${title}`)
      toast(r === 'failed' ? 'تعذر حفظ الملف' : r === 'downloaded' ? 'نُزّل ملف PDF' : 'أُنشئ ملف PDF')
    } catch { toast('تعذر إنشاء الملف') }
    setBusy(false)
  }
  return (
    <section ref={ref} className="card" style={{ gridColumn: '1 / -1' }} aria-label="مواقيت الشهر">
      <div className="spread" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>مواقيت الشهر</h2>
        <div className="chips" role="radiogroup" aria-label="نوع الشهر">
          <button role="radio" aria-checked={kind === 'g'} className={'chip' + (kind === 'g' ? ' active' : '')} onClick={() => setKind('g')}>ميلادي</button>
          <button role="radio" aria-checked={kind === 'h'} className={'chip' + (kind === 'h' ? ' active' : '')} onClick={() => setKind('h')}>هجري</button>
        </div>
      </div>
      <div className="spread" style={{ margin: '8px 0' }}>
        <button className="btn btn-sm" onClick={() => shift(-1)} aria-label="الشهر السابق">→</button>
        <strong>{title}</strong>
        <button className="btn btn-sm" onClick={() => shift(1)} aria-label="الشهر التالي">←</button>
      </div>
      <div className="table-scroll" style={{ maxHeight: 360, overflowY: 'auto' }}>
        <table className="prayer-table">
          <thead><tr><th>اليوم</th><th>الهجري</th>{PRAYERS.map((p) => <th key={p}>{PRAYER_LABELS[p]}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date.toISOString()} className={`${r.key.y}-${r.key.m}-${r.key.d}` === todayKey ? 'is-today' : undefined}>
                <td style={{ whiteSpace: 'nowrap' }}>{dayLabel(r)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.hijri.day} {HIJRI_MONTHS[r.hijri.month - 1]}</td>
                {PRAYERS.map((p) => <td key={p} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatTime(r.times[p], loc.tz)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-sm btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={pdf}><FileDown size={14} /> {busy ? 'جارٍ إنشاء الملف…' : 'تصدير الشهر PDF'}</button>
    </section>
  )
}
