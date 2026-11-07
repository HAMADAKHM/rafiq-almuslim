// «الودجتات»: قائمة كل ودجتات الشاشة الرئيسية مع معاينة وطريقة الإضافة، و«تصميم الودجت» لمشتركي بلس
// (خلفية واحدة لكل الودجتات بألوان الثيمات، تُطبَّق فورًا على Android).
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Crown, Lock } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { usePlus } from '../../billing/PlusContext'
import { toast } from '../../hooks'
import { platformName } from '../../platform'
import { DEFAULT_WIDGET_STYLE, freeWidgetStyle, getWidgetExtras, getWidgetShape, getWidgetStyle, setLockScreenTimes, setWidgetAlpha, setWidgetShape, setWidgetStyle } from '../../platform/widget'
import { goldenPhoto } from '../../themes/golden'
import { useSettings } from '../../state/SettingsContext'
import { DEFAULT_WIDGET_PREFS, type WidgetPrefs } from '../../state/settings'
import { cityLabel } from '../../services/cities'
import { useNow } from '../../hooks'
import { WIDGET_KINDS, WidgetPreview, type WidgetKind } from './WidgetPreview'

export const WIDGET_STYLES: { id: string; name: string; bg: [string, string]; stroke: string; photo?: string }[] = [
  { id: 'g-app', name: 'تصميم التطبيق (الأصلي)', bg: ['#0c1d1c', '#1e3431'], stroke: 'rgba(227,201,143,0.6)', photo: 'bg-home' },
  { id: 'g-light', name: 'الفاتح العاجي', bg: ['#FBF5E6', '#F1E4C4'], stroke: '#C9A24A' },
  { id: 'g-night', name: 'ليلة الهلال', bg: ['#04201A', '#0F4A37'], stroke: '#E7C46E', photo: 'bg-home' },
  { id: 'g-mosque', name: 'المسجد عند الغروب', bg: ['#04201A', '#0F4A37'], stroke: '#E7C46E', photo: 'bg-mosque' },
  { id: 'g-quran', name: 'المصحف الشريف', bg: ['#04201A', '#0F4A37'], stroke: '#E7C46E', photo: 'bg-quran' },
  { id: 'g-kaaba', name: 'الكعبة المشرفة', bg: ['#04201A', '#0F4A37'], stroke: '#E7C46E', photo: 'bg-kaaba' },
  { id: 'g-madinah', name: 'المسجد النبوي', bg: ['#04201A', '#0F4A37'], stroke: '#E7C46E', photo: 'bg-madinah' },
  { id: 'g-pattern', name: 'النقش الأخضر', bg: ['#0B4A2C', '#0F5A36'], stroke: '#E7C46E' },
  { id: 'emerald', name: 'الزمردي الذهبي', bg: ['#05302A', '#1F6F61'], stroke: '#E2C27E' },
  { id: 'indigo', name: 'النيلي الذهبي', bg: ['#16134A', '#231E66'], stroke: '#F6C35A' },
  { id: 'royal', name: 'الملكي', bg: ['#070F26', '#1C3170'], stroke: '#D9B45A' },
  { id: 'night', name: 'الليلي', bg: ['#071330', '#21458F'], stroke: '#AED6FF' },
  { id: 'turquoise', name: 'الفيروزي', bg: ['#073F41', '#12898A'], stroke: '#F3DCA0' },
  { id: 'dawn', name: 'الفجر', bg: ['#5A2A22', '#C8641E'], stroke: '#FFE0A8' },
  { id: 'nature', name: 'الطبيعي', bg: ['#1C3A1B', '#4B7D3A'], stroke: '#EFE1A0' },
  { id: 'violet', name: 'البنفسجي', bg: ['#140A33', '#4D2E9A'], stroke: '#E7E9F2' },
  { id: 'rose', name: 'الوردي', bg: ['#5A2232', '#B4536E'], stroke: '#F3D2B8' },
  { id: 'evening', name: 'المساء', bg: ['#050B17', '#1D3456'], stroke: '#F6C77E' },
  { id: 'glass', name: 'زجاجي شفاف', bg: ['rgba(0,0,0,0.7)', 'rgba(16,24,32,0.5)'], stroke: 'rgba(255,255,255,0.4)' },
]

const WIDGETS: { name: string; desc: string; plus: boolean; body: (accent: string) => ReactNode }[] = [
  { name: 'مواقيت الصلاة', desc: 'الصلاة القادمة والعدّ التنازلي ومواقيت اليوم.', plus: false, body: (a) => <><small>الصلاة القادمة</small><b style={{ color: a }}>العصر 2:28</b><span className="wd-row">{['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'].map((x) => <i key={x}>{x}</i>)}</span></> },
  { name: 'بطاقة الصلاة القادمة', desc: 'كقسم الصلاة في الرئيسية: الوقت والعدّ التنازلي ولوحة المسجد والصلوات الخمس بأيقوناتها.', plus: false, body: () => <><small>الصلاة القادمة</small><b>الفجر <span style={{ color: '#F6C35A' }}>4:31 ص</span></b><small style={{ color: '#F6C35A' }}>05:54:05</small><span className="wd-row">{['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'].map((x, i) => <i key={x} style={i === 0 ? { background: '#F6C35A', color: '#1B1640', borderRadius: 8, padding: '0 4px' } : undefined}>{x}</i>)}</span></> },
  { name: 'آية اليوم والورد', desc: 'آية تتجدد كل يوم، وورد الختمة.', plus: false, body: (a) => <><small>آية اليوم</small><b className="wd-q">﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾</b><small style={{ color: a }}>ورد اليوم: صفحتان</small></> },
  { name: 'الأذكار', desc: 'الذكر مباشرة مع عدّاد التكرار، وزرّا «+١» و«التالي»؛ أذكار الصباح والمساء والنوم.', plus: false, body: (a) => <><small>أذكار الصباح ١/٢٠</small><b className="wd-q">أصبحنا وأصبح الملك لله…</b><small style={{ color: a }}>٠ / ١ • +١ • التالي</small></> },
  { name: 'دعاء اليوم', desc: 'دعاء من القرآن والسنة بمصدره، بخلفية تتبدل كل يوم، مع النسخ والمشاركة و«دعاء آخر».', plus: false, body: (a) => <><small>دعاء اليوم</small><b className="wd-q">﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً﴾</b><small style={{ color: a }}>نسخ • مشاركة</small></> },
  { name: 'الكل في واحد', desc: 'الصلاة القادمة وعدّها، ومواقيت اليوم، وآية اليوم، وذكر اليوم، واختصارات الأقسام — ويتكيف مع الحجم.', plus: false, body: (a) => <><small>الصلاة القادمة</small><b style={{ color: a }}>العصر 2:23</b><span className="wd-row">{['القرآن', 'الأذكار', 'القبلة', 'المسبحة'].map((x) => <i key={x}>{x}</i>)}</span></> },
  { name: 'أكمل من حيث وصلت', desc: 'آخر موضع قراءة فعلية، يفتح المصحف عنده.', plus: true, body: (a) => <><small>أكمل قراءتك</small><b>سورة الكهف</b><small style={{ color: a }}>صفحة 293 • الختمة 46٪</small></> },
  { name: 'الطقس والصلاة القادمة', desc: 'طقس مدينتك مع موعد الصلاة القادمة.', plus: true, body: (a) => <><small>نابلس</small><b>☀️ 24°</b><small style={{ color: a }}>المغرب بعد 1:12</small></> },
  { name: 'تقدّمي', desc: 'الأيام المتتالية وورد اليوم وأذكار الصباح والمساء.', plus: true, body: (a) => <><small>أيام متتالية</small><b style={{ color: a }}>12 🔥</b><span className="wd-row"><i>الصباح ✓</i><i>المساء</i></span></> },
  { name: 'المسبحة', desc: 'سبّح بالضغط على الودجت مباشرة.', plus: true, body: (a) => <><small>سبحان الله</small><b style={{ color: a, fontSize: '1.6rem' }}>33</b></> },
  { name: 'عدّاد رمضان', desc: 'الأيام الباقية على رمضان، والسحور والإفطار فيه.', plus: true, body: (a) => <><small>بقي على رمضان</small><b style={{ color: a }}>118 يومًا</b></> },
]

const SHAPES: { id: string; name: string; clip: string }[] = [
  { id: 'round', name: 'مستطيل بإطار ذهبي', clip: 'inset(0 round 14px)' },
  { id: 'dome', name: 'قبة', clip: 'polygon(0 22%, 34% 22%, 42% 10%, 50% 0, 58% 10%, 66% 22%, 100% 22%, 100% 100%, 0 100%)' },
  { id: 'frame', name: 'إطار مزخرف', clip: 'polygon(6% 16%, 36% 16%, 44% 7%, 50% 0, 56% 7%, 64% 16%, 94% 16%, 100% 26%, 100% 80%, 94% 88%, 60% 88%, 50% 100%, 40% 88%, 6% 88%, 0 80%, 0 26%)' },
]
const swatchBg = (s: (typeof WIDGET_STYLES)[number]) => s.id === 'g-app'
  ? `linear-gradient(135deg, rgba(30,52,49,0.8), rgba(12,29,28,0.9)), url("${goldenPhoto('bg-home')}") center / cover`
  : s.id === 'g-light'
  ? 'linear-gradient(180deg, #FBF5E6, #F1E4C4)'
  : s.photo
  ? `linear-gradient(rgba(4,32,22,0.45), rgba(4,32,22,0.7)), url("${goldenPhoto(s.photo)}") center / cover`
  : `linear-gradient(135deg, ${s.bg[0]}, ${s.bg[1]})`

export function WidgetsPage() {
  const plus = usePlus()
  const { settings, update } = useSettings()
  const wp: WidgetPrefs = { ...DEFAULT_WIDGET_PREFS, ...settings.widgetPrefs }
  const setWp = (patch: Partial<WidgetPrefs>) => update({ widgetPrefs: { ...wp, ...patch } })
  const [kind, setKind] = useState<WidgetKind>('prayer')
  const [size, setSize] = useState<'S' | 'M' | 'L'>('M')
  const now = useNow(1000)
  const [style, setStyle] = useState(DEFAULT_WIDGET_STYLE)
  const [shape, setShape] = useState('round')
  const android = platformName() === 'android'
  const [alpha, setAlpha] = useState(100)
  const [lock, setLock] = useState(false)
  useEffect(() => { getWidgetStyle().then(setStyle); getWidgetShape().then(setShape); getWidgetExtras().then((x) => { setAlpha(x.alpha); setLock(x.lock) }) }, [])
  const pickAlpha = async (a: number) => {
    if (!plus.entitled) { toast('الودجت الشفاف من مزايا رفيق بلس'); return }
    setAlpha(a)
    if (android) toast((await setWidgetAlpha(a)) ? (a === 0 ? 'صارت الودجتات شفافة تمامًا' : `شفافية الخلفية ${100 - a}٪`) : 'تعذر التطبيق')
    else toast('يُطبَّق على ودجتات تطبيق Android')
  }
  const toggleLock = async (on: boolean) => {
    if (!plus.entitled) { toast('المواقيت على شاشة القفل من مزايا رفيق بلس'); return }
    setLock(on)
    if (android) toast((await setLockScreenTimes(on)) ? (on ? 'تظهر المواقيت الآن على شاشة القفل' : 'أُوقف عرض المواقيت على شاشة القفل') : 'تعذر التطبيق')
    else toast('متاح في تطبيق Android')
  }
  const pickShape = async (id: string) => {
    setShape(id)
    if (android) toast((await setWidgetShape(id)) ? 'تغيّر شكل كل الودجتات' : 'تعذر تطبيق الشكل')
    else toast('يُطبَّق الشكل على ودجتات تطبيق Android')
  }
  const cur = WIDGET_STYLES.find((s) => s.id === style) ?? WIDGET_STYLES[0]
  const pick = async (id: string) => {
    if (!freeWidgetStyle(id) && !plus.entitled) { toast('تصميم الودجت من مزايا رفيق بلس'); return }
    setStyle(id)
    if (android) toast((await setWidgetStyle(id)) ? 'تغيّر تصميم كل الودجتات' : 'تعذر تطبيق التصميم')
    else toast('يُطبَّق التصميم على ودجتات تطبيق Android')
  }
  return (
    <>
      <PageHead title="استوديو الودجت" subtitle="صمّم ودجتات رفيق المسلم وعاينها قبل إضافتها للشاشة الرئيسية" />
      <div className="stack">
        <section className="card wd-studio" aria-labelledby="wd-studio">
          <h2 id="wd-studio">المعاينة</h2>
          <div className="chips" role="tablist" aria-label="نوع الودجت">
            {WIDGET_KINDS.map((k) => <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={'chip' + (kind === k.id ? ' active' : '')} onClick={() => setKind(k.id)}>{k.name}</button>)}
          </div>
          <div className="chips" role="radiogroup" aria-label="حجم المعاينة" style={{ marginTop: 6 }}>
            {([['S', 'صغير'], ['M', 'متوسط'], ['L', 'كبير']] as const).map(([id, n]) => <button key={id} type="button" role="radio" aria-checked={size === id} className={'chip' + (size === id ? ' active' : '')} onClick={() => setSize(id)}>{n}</button>)}
          </div>
          <div className="wd-stage">
            <WidgetPreview kind={kind} size={size} now={now} alpha={plus.entitled ? alpha : 100} light={style === 'g-light'} bg={swatchBg(cur)} clip={cur.photo || cur.id === 'g-pattern' ? SHAPES.find((x) => x.id === shape)?.clip : undefined} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>المعاينة بالبيانات الحقيقية: مواقيت مدينتك وآية اليوم وأذكار التطبيق. التصميم والشكل والشفافية من الأقسام التالية، وتنطبق على كل الودجتات.</p>
        </section>
        <section className="card" aria-labelledby="wd-els">
          <h2 id="wd-els">العناصر والخط</h2>
          <div className="stack" style={{ gap: 8 }}>
            {([['city', 'اسم المدينة'], ['hijri', 'التاريخ الهجري'], ['greg', 'التاريخ الميلادي'], ['countdown', 'العدّ التنازلي']] as const).map(([k, n]) => (
              <label key={k} className="check switch"><input type="checkbox" className="switch-input" checked={wp[k]} onChange={(e) => setWp({ [k]: e.target.checked })} /> {n}</label>
            ))}
            <label className="field"><span>حجم الخط في الودجت: {wp.font}٪</span>
              <input type="range" min={85} max={130} step={5} value={wp.font} onChange={(e) => setWp({ font: Number(e.target.value) })} aria-label="حجم الخط في الودجت" /></label>
            <label className="field"><span>أذكار ودجت الأذكار</span>
              <select className="select" value={wp.adhkar} onChange={(e) => setWp({ adhkar: e.target.value as WidgetPrefs['adhkar'] })}>
                <option value="auto">تلقائي بحسب الوقت</option><option value="morning">أذكار الصباح</option><option value="evening">أذكار المساء</option><option value="sleep">أذكار النوم</option>
              </select></label>
            <label className="field"><span>ذكر ودجت المسبحة</span>
              <select className="select" value={wp.tasbih} onChange={(e) => setWp({ tasbih: e.target.value })}>
                <option value="seq">التسبيح بعد الصلاة (٣٣ × ٣)</option><option value="subhan">سبحان الله</option><option value="hamd">الحمد لله</option><option value="akbar">الله أكبر</option><option value="tahlil">لا إله إلا الله</option><option value="istighfar">أستغفر الله</option><option value="salawat">الصلاة على النبي ﷺ</option><option value="hawqala">لا حول ولا قوة إلا بالله</option>
              </select></label>
            <label className="check switch"><input type="checkbox" className="switch-input" checked={wp.vibrate} onChange={(e) => setWp({ vibrate: e.target.checked })} /> اهتزاز خفيف عند الضغط (المسبحة والأذكار)</label>
            <div className="spread"><span className="small">المدينة: <strong>{settings.location ? cityLabel(settings.location) : 'لم تُختر'}</strong></span><Link className="btn btn-sm" to="/prayer">تغيير المدينة</Link></div>
          </div>
        </section>
        <section className="card" aria-labelledby="wd-design">
          <h2 id="wd-design">{plus.entitled ? <Crown size={18} /> : <Lock size={18} />} تصميم الودجت</h2>
          <p className="small muted">خلفية واحدة لكل ودجتات رفيق المسلم، تتغير فورًا على الشاشة الرئيسية.{!plus.entitled && ' التصميمات الإضافية لمشتركي بلس.'}</p>
          <div className="wd-styles" role="radiogroup" aria-label="تصميم الودجت">
            {WIDGET_STYLES.map((s) => {
              const locked = !freeWidgetStyle(s.id) && !plus.entitled
              return (
                <button key={s.id} type="button" role="radio" aria-checked={style === s.id} className={'wd-style' + (style === s.id ? ' on' : '')} onClick={() => pick(s.id)}>
                  <span className="wd-swatch" style={{ background: swatchBg(s), borderColor: s.stroke }}>{style === s.id ? <Check size={14} /> : locked ? <Lock size={12} /> : null}</span>
                  <span>{s.name}</span>
                </button>
              )
            })}
          </div>
          {!plus.entitled && <Link to="/plus" className="btn btn-sm btn-gold" style={{ marginTop: 8 }}>اشترك في بلس</Link>}
          <h3 style={{ margin: '1rem 0 0.4rem' }}>شكل الودجت</h3>
          <p className="small muted" style={{ marginTop: 0 }}>لصور التصميم الذهبي: إطار ذهبي مزدوج بالشكل الذي تختاره.</p>
          <div className="wd-styles" role="radiogroup" aria-label="شكل الودجت">
            {SHAPES.map((sh) => (
              <button key={sh.id} type="button" role="radio" aria-checked={shape === sh.id} className={'wd-style' + (shape === sh.id ? ' on' : '')} onClick={() => pickShape(sh.id)}>
                <span className="wd-swatch" style={{ background: swatchBg(WIDGET_STYLES[0]), clipPath: sh.clip, borderColor: '#E7C46E' }}>{shape === sh.id ? <Check size={14} /> : null}</span>
                <span>{sh.name}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="card" aria-labelledby="wd-clear">
          <h2 id="wd-clear">{plus.entitled ? <Crown size={18} /> : <Lock size={18} />} ودجت شفاف</h2>
          <p className="small muted">اجعل خلفية الودجت شفافة لتظهر خلفية جوالك من خلفه، والكتابة واضحة كما هي.{!plus.entitled && ' من مزايا بلس.'}</p>
          <div className="wd-styles" role="radiogroup" aria-label="شفافية الودجت">
            {[[100, 'معتمة'], [75, '75٪'], [50, 'نصف شفافة'], [25, '25٪'], [0, 'شفافة تمامًا']].map(([a, label]) => (
              <button key={a} type="button" role="radio" aria-checked={alpha === a} className={'wd-style' + (alpha === a ? ' on' : '')} onClick={() => pickAlpha(a as number)}>
                <span className="wd-swatch" style={{ background: `linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, #fff 25%, #fff 75%, #ddd 75%)`, backgroundSize: '12px 12px', backgroundPosition: '0 0, 6px 6px', position: 'relative', overflow: 'hidden' }}>
                  <i style={{ position: 'absolute', inset: 0, background: `rgba(12,29,28,${(a as number) / 100})` }} />
                  {alpha === a ? <Check size={14} style={{ position: 'relative', color: (a as number) >= 50 ? '#fff' : '#073B32' }} /> : !plus.entitled ? <Lock size={12} style={{ position: 'relative' }} /> : null}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="card" aria-labelledby="wd-lock">
          <div className="spread">
            <h2 id="wd-lock" style={{ margin: 0 }}>{plus.entitled ? <Crown size={18} /> : <Lock size={18} />} المواقيت على شاشة القفل</h2>
            <label className="check switch"><input type="checkbox" className="switch-input" checked={lock} onChange={(e) => toggleLock(e.target.checked)} aria-label="المواقيت على شاشة القفل" /> {lock ? 'مفعّل' : 'متوقف'}</label>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>تظهر الصلاة القادمة ووقتها وعدّ تنازلي حي على شاشة القفل، وتحتها مواقيت اليوم، وتتحدث وحدها عند كل صلاة، بلا صوت ولا اهتزاز.{!plus.entitled && ' من مزايا بلس.'} نظام Android لا يسمح بوضع ودجتات التطبيقات على شاشة قفل الجوال، إلا في أجهزة قليلة تدعمها، وفيها تظهر ودجتات «مواقيت الصلاة» و«بطاقة الصلاة» و«آية اليوم» ضمن خيارات شاشة القفل.</p>
        </section>
        <section className="card" aria-labelledby="wd-list">
          <h2 id="wd-list">كل الودجتات</h2>
          <div className="wd-list">
            {WIDGETS.map((w) => (
              <div key={w.name} className="wd-item">
                <div className="wd-preview" style={{ background: swatchBg(cur), borderColor: cur.stroke, clipPath: cur.photo || cur.id === 'g-pattern' ? SHAPES.find((x) => x.id === shape)?.clip : undefined }}>{w.body(cur.stroke)}</div>
                <div className="wd-meta"><strong>{w.name} <span className={'fx-badge ' + (w.plus ? 'plus' : 'free')}>{w.plus ? 'بلس' : 'مجاني'}</span></strong><p className="small muted">{w.desc}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <h2>طريقة الإضافة</h2>
          <ol className="small" style={{ paddingInlineStart: '1.2rem', lineHeight: 1.9 }}>
            <li>اضغط مطولًا على مكان فارغ في الشاشة الرئيسية لهاتفك.</li>
            <li>اختر «الأدوات» أو «Widgets».</li>
            <li>ابحث عن «رفيق المسلم» واسحب الودجت الذي تريده.</li>
          </ol>
          <h2 style={{ marginTop: '1rem' }}>تعديل الودجت بعد وضعه</h2>
          <ol className="small" style={{ paddingInlineStart: '1.2rem', lineHeight: 1.9 }}>
            <li><strong>الخلفية والشكل:</strong> اضغط على الودجت مطولًا ← «إعداد» (أو أيقونة القلم)، واختر خلفية وشكلًا لهذا الودجت وحده.</li>
            <li><strong>الحجم:</strong> اضغط عليه مطولًا ثم اسحب المقابض حول حدوده لتكبيره أو تصغيره.</li>
          </ol>
          <p className="small muted" style={{ margin: 0 }}>الودجتات متاحة في Android. «إعداد» بعد الوضع في Android 12 فأحدث، وفي الأقدم تظهر شاشة التصميم عند إضافة الودجت. ودجتات iPhone تحتاج نسخة iOS (لم تُبنَ بعد).</p>
        </section>
      </div>
    </>
  )
}
