// مزايا رفيق بلس الإضافية: الألوان والخلفيات، والتذكيرات الخاصة، والإحصاءات الشخصية (على الجهاز فقط).
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { PLUS_PALETTES } from '../../billing/palettes'
import { useSettings } from '../../state/SettingsContext'
import type { CustomReminder } from '../../state/settings'
import { MAX_CUSTOM } from '../../services/reminders'
import { computeInsights, TOTAL_AYAT, type Insights } from '../../services/insights'
import { adhkarLog, listening, memo, reading } from '../../db/repos'
import { dayKey } from '../../lib/dates'
import { useQuran } from '../../hooks'
import { ADHKAR } from '../../content/adhkar'
import { reciterById } from '../../content/reciters'
import { toArabicDigits } from '../../lib/arabic'

export function PlusThemesPage() {
  const { settings, update } = useSettings()
  return (
    <div className="page">
      <PageHead title="ألوان وخلفيات بلس" subtitle="لوحات ألوان وخلفيات زخرفية إضافية للتطبيق كله" />
      <PlusGate feature="themes" title="ألوان وخلفيات إضافية">
        <section className="card">
          <div className="palette-grid" role="radiogroup" aria-label="لوحة الألوان">
            <button className="palette-opt" role="radio" aria-checked={!settings.plusPalette} onClick={() => update({ plusPalette: '' })}>
              <span style={{ background: 'linear-gradient(135deg,#0B4A3E,#073B32)' }} />ألوان التطبيق الأصلية
            </button>
            {PLUS_PALETTES.map((p) => (
              <button key={p.id} className="palette-opt" role="radio" aria-checked={settings.plusPalette === p.id} onClick={() => update({ plusPalette: p.id })}>
                <span style={{ background: p.swatch }} />{p.label}
              </button>
            ))}
          </div>
          <p className="muted small">تعمل اللوحات مع الوضع الفاتح والداكن من الإعدادات. وإن انتهى الاشتراك تعود ألوان التطبيق الأصلية تلقائيًا.</p>
        </section>
      </PlusGate>
    </div>
  )
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const TARGETS = [
  { route: '/', label: 'الرئيسية' }, { route: '/quran', label: 'القرآن الكريم' }, { route: '/quran/18', label: 'سورة الكهف' },
  { route: '/quran/67', label: 'سورة الملك' }, { route: '/adhkar', label: 'الأذكار' }, { route: '/duas', label: 'الأدعية' },
  { route: '/tasbih', label: 'المسبحة' }, { route: '/wird', label: 'ورد اليوم' }, { route: '/stories', label: 'التفسير كالقصة' },
]
const newReminder = (): CustomReminder => ({ id: Math.random().toString(36).slice(2, 10), title: '', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], route: '/', enabled: true })

export function PlusRemindersPage() {
  const { settings, update } = useSettings()
  const list = settings.customReminders ?? []
  const set = (i: number, p: Partial<CustomReminder>) => update({ customReminders: list.map((c, k) => (k === i ? { ...c, ...p } : c)) })
  return (
    <div className="page">
      <PageHead title="تذكيراتي الخاصة" subtitle="تذكيرات تكتبها بنفسك، في الأيام والأوقات التي تختارها" />
      <PlusGate feature="reminders" title="التذكيرات الخاصة">
        {!settings.location && <p className="notice">اختر مدينتك أولًا من صفحة المواقيت لتعمل التذكيرات بتوقيتها.</p>}
        {list.map((c, i) => (
          <section className="card creminder" key={c.id} aria-label={`تذكير ${i + 1}`}>
            <label>النص<input type="text" maxLength={80} value={c.title} placeholder="مثال: قراءة سورة الكهف" onChange={(e) => set(i, { title: e.target.value })} /></label>
            <div className="row wrap gap">
              <label>الوقت<input type="time" value={c.time} onChange={(e) => set(i, { time: e.target.value })} /></label>
              <label>يفتح<select value={c.route} onChange={(e) => set(i, { route: e.target.value })}>{TARGETS.map((t) => <option key={t.route} value={t.route}>{t.label}</option>)}</select></label>
            </div>
            <div className="days" role="group" aria-label="الأيام">
              {DAYS.map((d, k) => (
                <button key={k} className={'chip' + (c.days.includes(k) ? ' active' : '')} aria-pressed={c.days.includes(k)}
                  onClick={() => set(i, { days: c.days.includes(k) ? c.days.filter((x) => x !== k) : [...c.days, k].sort() })}>{d}</button>
              ))}
            </div>
            <div className="row wrap gap">
              <label className="check"><input type="checkbox" checked={c.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} /> مفعّل</label>
              <button className="btn" onClick={() => update({ customReminders: list.filter((_, k) => k !== i) })}><Trash2 size={16} /> حذف</button>
            </div>
          </section>
        ))}
        {list.length < MAX_CUSTOM
          ? <button className="btn btn-primary" onClick={() => update({ customReminders: [...list, newReminder()] })}><Plus size={16} /> إضافة تذكير</button>
          : <p className="muted">وصلت إلى الحد الأقصى ({toArabicDigits(MAX_CUSTOM)} تذكيرات).</p>}
        <p className="muted small">تعمل مع تفعيل التنبيهات في صفحة التذكيرات، وتحترم ساعات الهدوء. على الهاتف تُجدول في نظام الإشعارات، وفي المتصفح تظهر ما دام التطبيق مفتوحًا.</p>
      </PlusGate>
    </div>
  )
}

export function PlusInsightsPage() {
  const { settings } = useSettings()
  const { data } = useQuran()
  const [ins, setIns] = useState<Insights | null>(null)
  useEffect(() => {
    if (!data) return
    Promise.all([reading.all(), listening.all(), adhkarLog.all(), memo.logs()]).then(([read, listen, adhkar, m]) =>
      setIns(computeInsights({ read, listen, adhkar, memo: m }, dayKey(new Date(), settings.location?.tz), data.meta.surahs.map((s) => s.count))))
  }, [data, settings.location?.tz])
  const catTitle = useMemo(() => Object.fromEntries(ADHKAR.map((c) => [c.id, c.title])), [])
  const maxTime = Math.max(1, ...(ins?.readingTimes.map((t) => t.count) ?? [1]))
  return (
    <div className="page">
      <PageHead title="إحصاءاتي" subtitle="تُحسب على جهازك فقط من سجلك، ولا تُرسل إلى أي جهة" />
      <PlusGate feature="insights" title="الإحصاءات الشخصية">
        {!ins ? <p className="muted">جارٍ الحساب…</p> : (
          <>
            {settings.trackActivity === false && <p className="notice">تسجيل النشاط متوقف من الإعدادات، فلن تُضاف أيام جديدة.</p>}
            <div className="stat-row">
              <div className="card"><strong>{toArabicDigits(ins.currentStreak)}</strong>أيام متتالية الآن</div>
              <div className="card"><strong>{toArabicDigits(ins.longestStreak)}</strong>أطول متتالية</div>
              <div className="card"><strong>{toArabicDigits(ins.activeDays)}</strong>يومًا فيه نشاط</div>
              <div className="card"><strong>{toArabicDigits(Math.round((ins.uniqueAyat / TOTAL_AYAT) * 1000) / 10)}٪</strong>من آيات القرآن قرأتها ({toArabicDigits(ins.uniqueAyat)} آية)</div>
              <div className="card"><strong>{toArabicDigits(ins.surahsCompleted)}</strong>سورة قرأتها كاملة</div>
              <div className="card"><strong>{toArabicDigits(ins.listenedAyat)}</strong>آية استمعت إليها</div>
            </div>
            <section className="card">
              <h2>آخر ١٢ أسبوعًا</h2>
              <div className="heat" aria-label="خريطة النشاط">{ins.heat.map((h) => <i key={h.date} className={'l' + h.level} title={h.date} />)}</div>
            </section>
            <section className="card">
              <h2>الأذكار في آخر ٣٠ يومًا</h2>
              {ins.adhkar30.length === 0 ? <p className="muted">لم تُسجَّل أذكار مكتملة بعد.</p> : (
                <div className="hbars">{ins.adhkar30.map((a) => <div key={a.category}><span>{catTitle[a.category] ?? a.category}</span><b style={{ width: `${(a.days / 30) * 100}%` }} /><span>{toArabicDigits(a.days)} يومًا</span></div>)}</div>
              )}
            </section>
            <section className="card">
              <h2>متى تقرأ غالبًا</h2>
              <div className="hbars">{ins.readingTimes.map((t) => <div key={t.label}><span>{t.label}</span><b style={{ width: `${(t.count / maxTime) * 100}%` }} /><span>{toArabicDigits(t.count)}</span></div>)}</div>
            </section>
            {ins.topReciters.length > 0 && (
              <section className="card">
                <h2>أكثر من استمعت إليهم</h2>
                <ul>{ins.topReciters.map((r) => <li key={r.reciter}>{reciterById(r.reciter).name} — {toArabicDigits(r.ayat)} آية</li>)}</ul>
              </section>
            )}
            <p className="muted small">مراجعات الحفظ في آخر ٣٠ يومًا: {toArabicDigits(ins.memoReviews30)}. الأرقام للمساعدة على الاستمرار فقط، والله أعلم بالقبول.</p>
          </>
        )}
      </PlusGate>
    </div>
  )
}
