// مزايا رفيق بلس الإضافية: الألوان والخلفيات، والتذكيرات الخاصة، والإحصاءات الشخصية (على الجهاز فقط).
import { useEffect, useMemo, useState } from 'react'
import { Crown, Lock, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { PLUS_PALETTES } from '../../billing/palettes'
import { usePlus } from '../../billing/PlusContext'
import { activeSkin, SKINS, type ArtSkinId, type IdentityId, type Skin } from '../../themes/skins'
import { SkinScene } from '../../themes/SkinScene'
import { IdentityScene } from '../../themes/IdentityScene'
import { setThemePreview, useThemePreview } from '../../themes/preview'
import { AppIconPicker } from '../../themes/AppIconPicker'
import { ScenePreview } from '../../tv/SceneCanvas'
import { Link } from 'react-router-dom'
import { toast } from '../../hooks'
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
import { companionSummary, loadActualDays, loadDoneDays } from '../../services/companionStore'

const BASE = SKINS.filter((s) => s.identity && s.id.startsWith('e-'))
const DESIGNS = SKINS.filter((s) => s.identity && s.id.startsWith('t-'))

export function PlusThemesPage() {
  const { settings, update } = useSettings()
  const plus = usePlus()
  const previewing = useThemePreview()
  const [hover, setHover] = useState<string | null>(null)
  const current = activeSkin(settings.skin, plus.entitled)
  const reset = () => { setThemePreview(null); update({ skin: '' }); toast('عاد التطبيق إلى ثيمه الأصلي') }
  const card = (s: Skin) => {
    const locked = !s.free && !plus.entitled
    const on = current?.id === s.id
    return (
      <button key={s.id} type="button" className={'skin-card' + (previewing === s.id ? ' previewing' : '')} aria-pressed={on} data-skin-id={s.id} aria-label={`معاينة ثيم ${s.name}`}
        onClick={() => setThemePreview(s.id)} onMouseEnter={() => setHover(s.id)} onFocus={() => setHover(s.id)}>
        {!s.free ? <span className="skin-badge">{locked ? <Lock size={11} /> : <Crown size={11} />} بلس</span> : <span className="skin-badge free">مجاني</span>}
        {s.live && <span className="skin-badge live">● حيّ</span>}
        <span className={'skin-frame ' + s.mode}>
          {s.identity ? <IdentityScene id={s.id as IdentityId} /> : s.live ? <ScenePreview id={s.live} live={hover === s.id} /> : <SkinScene id={s.id as ArtSkinId} />}
          {s.swatch ? (
            <span className="skin-mock" style={{ ['--m-bg' as string]: s.swatch[1], ['--m-pri' as string]: s.swatch[2], ['--m-text' as string]: s.swatch[3] }}>
              <span className="mk-bar" /><span className="mk-card"><i /><i /><i /></span><span className="mk-card short"><i /><i /></span><span className="mk-btn" />
            </span>
          ) : <span className="skin-sample" />}
        </span>
        <span className="skin-meta"><strong>{s.name}{on ? ' ✓' : ''}</strong><small>{on ? 'الثيم الحالي' : locked ? 'معاينة متاحة — التفعيل مع بلس' : s.tagline}</small></span>
      </button>
    )
  }
  return (
    <div className="page">
      <PageHead title="الثيمات والمظهر" subtitle="هوية بصرية كاملة لكل صفحات التطبيق — اضغط أي ثيم لمعاينته في التطبيق كله قبل تطبيقه" />
      <section className="card theme-current">
        <span className="tc-dot" style={{ background: current?.swatch?.[2] ?? 'var(--primary)' }} />
        <div style={{ flex: 1 }}><strong>الثيم الحالي: {current?.name ?? 'الأصلي'}</strong><p className="small muted" style={{ margin: 0 }}>يتغير مظهر الرئيسية والقرآن والأذكار والمواقيت والإعدادات والقوائم معًا، والنصوص كما هي.</p></div>
        {current && <button className="btn btn-sm" onClick={reset}><RotateCcw size={14} /> الأصلي</button>}
      </section>
      <section className="card" aria-labelledby="base-h">
        <h2 id="base-h">الثيمات الأساسية</h2>
        <p className="small muted">ستة أنظمة ألوان تطبَّق على التطبيق كله. العاجي والأبيض النقي والداكن مجانية، والزمرد الملكي ومنتصف الليل والطبيعة لمشتركي بلس.</p>
        <div className="skin-grid" data-group="base">{BASE.map(card)}</div>
      </section>
      <section className="card" aria-labelledby="ident-h">
        <h2 id="ident-h">التصاميم التسعة</h2>
        <p className="small muted">الكلاسيكي الراقي مجاني، والثمانية الباقية لمشتركي بلس. كل تصميم يغيّر الرئيسية والقرآن والقوائم معًا.</p>
        <div className="skin-grid">{DESIGNS.slice(0, 9).map(card)}</div>
        <h3 style={{ marginTop: '1rem' }}>ثيمات أخرى</h3>
        <div className="skin-grid">{DESIGNS.slice(9).map(card)}</div>
      </section>
      <AppIconPicker />
      <section className="card" aria-labelledby="skins-h">
        <h2 id="skins-h">ثيمات غامرة</h2>
        <p className="small muted">مشاهد حيّة أو فنية خلف التطبيق كله، مع ألوانها وخطها وشكل بطاقاتها.</p>
        {([['live', 'ثيمات حيّة — مشاهد سينمائية تتحرك باستمرار'], ['art', 'ثيمات فنية مرسومة']] as const).map(([kind, heading]) => (
          <div key={kind}>
            <h3 className="skin-section-title">{heading}</h3>
            <div className="skin-grid">{SKINS.filter((s) => !s.identity && (kind === 'live') === !!s.live).map(card)}</div>
          </div>
        ))}
        <label className="check small" style={{ marginTop: 10 }}><input type="checkbox" className="switch-input" checked={settings.skinStill} onChange={(e) => update({ skinStill: e.target.checked })} /> خلفية ثابتة بلا حركة (لتوفير البطارية)</label>
      </section>
      <section className="card">
        <h2>الودجتات</h2>
        <p className="small muted">اختر تصميم ودجتات الشاشة الرئيسية بألوان ثيمك.</p>
        <Link className="btn btn-sm" to="/widgets">الودجتات وتصميمها</Link>
      </section>
      <PlusGate feature="themes" title="لوحات ألوان إضافية">
        <section className="card">
          <h2>لوحات ألوان</h2>
          <p className="small muted">تلوين بسيط دون خلفية. إن اخترت ثيمًا فله ألوانه الخاصة.</p>
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
  const [span, setSpan] = useState<84 | 182 | 364>(84)
  const [cs, setCs] = useState<ReturnType<typeof companionSummary> | null>(null)
  useEffect(() => {
    const today = dayKey(new Date(), settings.location?.tz)
    Promise.all([loadActualDays(), reading.all(), loadDoneDays()]).then(([a, read, done]) => {
      const readDays: Record<string, number[]> = {}
      for (const r of read) (readDays[r.date] ??= []).push(...r.pages)
      setCs(companionSummary(a, readDays, done, today))
    }).catch(() => {})
  }, [settings.location?.tz])
  useEffect(() => {
    if (!data) return
    Promise.all([reading.all(), listening.all(), adhkarLog.all(), memo.logs()]).then(([read, listen, adhkar, m]) =>
      setIns(computeInsights({ read, listen, adhkar, memo: m }, dayKey(new Date(), settings.location?.tz), data.meta.surahs.map((s) => s.count), undefined, span)))
  }, [data, settings.location?.tz, span])
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
            {cs && (
              <section className="card">
                <h2>القراءة الفعلية والأذكار</h2>
                <table className="compare-table small">
                  <thead><tr><th></th><th>آخر ٧ أيام</th><th>آخر ٣٠ يومًا</th></tr></thead>
                  <tbody>
                    <tr><th>أيام قرأت فيها فعلًا</th><td>{toArabicDigits(cs.week.readingDays)}</td><td>{toArabicDigits(cs.month.readingDays)}</td></tr>
                    <tr><th>صفحات مختلفة</th><td>{toArabicDigits(cs.week.pages)}</td><td>{toArabicDigits(cs.month.pages)}</td></tr>
                    <tr><th>أذكار «رفيقي يذكّرني» المكتملة</th><td>{toArabicDigits(cs.week.adhkar)}</td><td>{toArabicDigits(cs.month.adhkar)}</td></tr>
                  </tbody>
                </table>
                <p className="small muted" style={{ margin: 0 }}>تُحتسب القراءة إذا بقيت على الصفحة ٢٠ ثانية أو سجّلت قراءتك؛ ولا يُحتسب فتح التطبيق أو وصول إشعار.</p>
              </section>
            )}
            <section className="card">
              <div className="spread" style={{ flexWrap: 'wrap', gap: 6 }}>
                <h2 style={{ margin: 0 }}>سجل النشاط</h2>
                <div className="chips" role="radiogroup" aria-label="مدة السجل">
                  {([[84, '١٢ أسبوعًا'], [182, '٦ أشهر'], [364, 'سنة كاملة']] as const).map(([d, l]) => <button key={d} role="radio" aria-checked={span === d} className={'chip' + (span === d ? ' active' : '')} onClick={() => setSpan(d)}>{l}</button>)}
                </div>
              </div>
              <p className="small muted" style={{ margin: '4px 0' }}>{toArabicDigits(ins.heat.filter((h) => h.level > 0).length)} يومًا فيه نشاط من {toArabicDigits(ins.heat.length)}</p>
              <div className={'heat' + (span > 84 ? ' heat-long' : '')} aria-label="خريطة النشاط">{ins.heat.map((h) => <i key={h.date} className={'l' + h.level} title={h.date} />)}</div>
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
