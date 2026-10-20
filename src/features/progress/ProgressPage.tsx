import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Tabs } from '../../components/Common'
import { useLive } from '../../hooks'
import { adhkarLog, memo, reading } from '../../db/repos'
import { computeStats, dailySeries } from '../../services/stats'
import { dayKey } from '../../lib/dates'
import type { AdhkarLog, MemoLog, MemoSegment, ReadLog } from '../../db/db'
import { STATUS_LABELS } from '../../services/srs'
import { useSettings } from '../../state/SettingsContext'

export function useAllLogs() {
  const read = useLive(() => reading.all(), ['readLog'], [] as ReadLog[])
  const segs = useLive(() => memo.all(), ['memo'], [] as MemoSegment[])
  const mlogs = useLive(() => memo.logs(), ['memoLog'], [] as MemoLog[])
  const adh = useLive(() => adhkarLog.all(), ['adhkarLog'], [] as AdhkarLog[])
  return { read, segs, mlogs, adh }
}

function Bars({ series, field, label }: { series: { date: string; ayahs: number; reviews: number; adhkar: number }[]; field: 'ayahs' | 'reviews' | 'adhkar'; label: string }) {
  const max = Math.max(1, ...series.map((d) => d[field]))
  const many = series.length > 10
  return (
    <figure style={{ margin: 0 }}>
      <figcaption className="small muted">{label}</figcaption>
      <div className="bars" role="img" aria-label={label + ': ' + series.map((d) => `${d.date} ${d[field]}`).join('، ')}>
        {series.map((d) => <div key={d.date} className={'bar' + (d[field] ? '' : ' zero')} style={{ height: `${(d[field] / max) * 100}%` }} title={`${d.date}: ${d[field]}`} />)}
      </div>
      <div className="bars-labels" aria-hidden="true">
        {series.map((d, i) => <span key={d.date}>{!many || i % 5 === 0 ? d.date.slice(8) : ''}</span>)}
      </div>
    </figure>
  )
}

export function ProgressPage() {
  const { read, segs, mlogs, adh } = useAllLogs()
  const { settings, update } = useSettings()
  const [range, setRange] = useState<'week' | 'month'>('week')
  const today = dayKey()
  const stats = useMemo(() => computeStats(read, segs, mlogs, adh, today), [read, segs, mlogs, adh, today])
  const series = useMemo(() => dailySeries(read, mlogs, adh, today, range === 'week' ? 7 : 30), [read, mlogs, adh, today, range])
  const sum = (f: 'ayahs' | 'reviews' | 'adhkar') => series.reduce((n, d) => n + d[f], 0)
  const empty = !read.length && !segs.length && !adh.length

  return (
    <>
      <PageHead title="متابعة التقدم" subtitle="تعرض ما سجّلته بنفسك فقط. هذه أرقام للتحفيز، وليست حكمًا على إيمانك أو صلاحك." />
      {!settings.trackActivity && <div className="alert alert-gold small" style={{ marginBottom: '1rem' }}>متابعة رحلتي الإيمانية متوقفة: لا يُسجَّل نشاط جديد. <button className="btn btn-sm" onClick={() => update({ trackActivity: true })}>تفعيل المتابعة</button></div>}
      {empty && <div className="alert alert-info" style={{ marginBottom: '1rem' }}>لم تسجّل أي نشاط بعد. ابدأ بقراءة وردك أو بتسجيل أذكار اليوم، وستظهر إحصائياتك هنا. <Link to="/journey">ابدأ رحلتك</Link></div>}
      <div className="grid grid-3">
        <div className="card stat"><b>{stats.readingDays}</b><span className="small muted">أيام القراءة</span></div>
        <div className="card stat"><b>{stats.ayahsRead}</b><span className="small muted">آيات مقروءة (مسجّلة)</span></div>
        <div className="card stat"><b>{stats.pagesRead}</b><span className="small muted">صفحات مختلفة قُرئت</span></div>
        <div className="card stat"><b>{stats.memo.memorizedAyahs}</b><span className="small muted">آيات محفوظة</span></div>
        <div className="card stat"><b>{stats.reviewsDone}</b><span className="small muted">مراجعات منجزة</span></div>
        <div className="card stat"><b>{stats.adhkarDone}</b><span className="small muted">مرات إتمام الأذكار</span></div>
      </div>
      <section className="card" style={{ marginTop: '1rem' }}>
        <div className="spread">
          <h2>التقرير {range === 'week' ? 'الأسبوعي' : 'الشهري'}</h2>
          {stats.streak > 0 && <span className="badge badge-success">{stats.streak} يوم متتالٍ من النشاط</span>}
        </div>
        <Tabs value={range} onChange={setRange} label="الفترة" items={[{ id: 'week', label: 'آخر 7 أيام' }, { id: 'month', label: 'آخر 30 يومًا' }]} />
        <div className="grid grid-3">
          <Bars series={series} field="ayahs" label={`الآيات المقروءة (${sum('ayahs')})`} />
          <Bars series={series} field="reviews" label={`جلسات الحفظ والمراجعة (${sum('reviews')})`} />
          <Bars series={series} field="adhkar" label={`الأذكار المسجّلة (${sum('adhkar')})`} />
        </div>
      </section>
      <section className="card" style={{ marginTop: '1rem' }}>
        <h2>تقدم الحفظ</h2>
        {segs.length ? (
          <div className="row">
            {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((k) => <span key={k} className="badge">{STATUS_LABELS[k]}: {stats.memo[k]}</span>)}
            <span className="small muted">({stats.memo.totalAyahs} آية ضمن أهدافك)</span>
          </div>
        ) : <p className="muted">لا توجد أهداف حفظ. <Link to="/memorize">أضف هدفًا</Link></p>}
      </section>
    </>
  )
}
