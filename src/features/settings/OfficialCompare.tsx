import { useMemo, useState } from 'react'
import { PRAYERS, PRAYER_LABELS, adjustmentsFromDiffs, compareOfficial, todayTimes, type PrayerName } from '../../services/prayer'
import { formatTime } from '../../lib/dates'
import { toast } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'

/** مقارنة المواقيت المحسوبة بتقويم رسمي يُدخله المستخدم بنفسه (لا نجلب أي تقويم ولا نفترضه) */
export function OfficialCompare() {
  const { settings, update } = useSettings()
  const [official, setOfficial] = useState<Partial<Record<PrayerName, string>>>({})
  const loc = settings.location
  const times = useMemo(() => (loc ? todayTimes(loc, settings.prayer) : null), [loc, settings.prayer])
  if (!loc || !times) return <p className="small muted">اختر مدينتك أولًا لمقارنة مواقيتها بالتقويم الرسمي.</p>
  const diffs = compareOfficial(times, official, loc.tz)
  const any = Object.keys(diffs).length > 0
  const apply = () => {
    const { adjustments, tooLarge } = adjustmentsFromDiffs(settings.prayer.adjustments, diffs)
    update((s) => ({ prayer: { ...s.prayer, adjustments } }))
    setOfficial({})
    toast(tooLarge.length ? `طُبّقت الفروق، عدا ${tooLarge.map((p) => PRAYER_LABELS[p]).join('، ')} (الفرق أكبر من 30 دقيقة: راجع طريقة الحساب أو المدينة)` : 'طُبّقت الفروق — المواقيت تطابق التقويم الرسمي لهذا اليوم')
  }
  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <p className="small muted" style={{ margin: 0 }}>أدخل مواقيت اليوم من التقويم المعتمد في مدينتك (وزارة الأوقاف أو دار الإفتاء أو مسجدك)، لتظهر الفروق ثم تطبّقها تعديلاتٍ بالدقائق. يكفي إدخال بعض الصلوات.</p>
      <table className="compare-table small">
        <thead><tr><th>الصلاة</th><th>في التطبيق</th><th>التقويم الرسمي</th><th>الفرق</th></tr></thead>
        <tbody>
          {PRAYERS.map((p) => (
            <tr key={p}>
              <td>{PRAYER_LABELS[p]}</td>
              <td>{formatTime(times[p], loc.tz)}</td>
              <td><input className="input" type="time" style={{ minHeight: 32 }} value={official[p] ?? ''} onChange={(e) => setOfficial((o) => ({ ...o, [p]: e.target.value }))} aria-label={`التوقيت الرسمي: ${PRAYER_LABELS[p]}`} /></td>
              <td aria-label={`الفرق: ${PRAYER_LABELS[p]}`}>{diffs[p] == null ? '—' : diffs[p] === 0 ? 'مطابق' : `${diffs[p]! > 0 ? '+' : ''}${diffs[p]} د`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row"><button className="btn btn-primary btn-sm" disabled={!any || Object.values(diffs).every((d) => d === 0)} onClick={apply}>تطبيق الفروق كتعديلات</button></div>
    </div>
  )
}
