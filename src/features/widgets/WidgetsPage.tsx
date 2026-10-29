// «الودجتات»: قائمة كل ودجتات الشاشة الرئيسية مع معاينة وطريقة الإضافة، و«تصميم الودجت» لمشتركي بلس
// (خلفية واحدة لكل الودجتات بألوان الثيمات، تُطبَّق فورًا على Android).
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Crown, Lock } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { usePlus } from '../../billing/PlusContext'
import { toast } from '../../hooks'
import { platformName } from '../../platform'
import { getWidgetStyle, setWidgetStyle } from '../../platform/widget'

export const WIDGET_STYLES: { id: string; name: string; bg: [string, string]; stroke: string }[] = [
  { id: 'emerald', name: 'الزمردي (الأصلي)', bg: ['#05302A', '#1F6F61'], stroke: '#E2C27E' },
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
  { name: 'آية اليوم والورد', desc: 'آية تتجدد كل يوم، وورد الختمة.', plus: false, body: (a) => <><small>آية اليوم</small><b className="wd-q">﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾</b><small style={{ color: a }}>ورد اليوم: صفحتان</small></> },
  { name: 'أكمل من حيث وصلت', desc: 'آخر موضع قراءة فعلية، يفتح المصحف عنده.', plus: true, body: (a) => <><small>أكمل قراءتك</small><b>سورة الكهف</b><small style={{ color: a }}>صفحة 293 • الختمة 46٪</small></> },
  { name: 'الطقس والصلاة القادمة', desc: 'طقس مدينتك مع موعد الصلاة القادمة.', plus: true, body: (a) => <><small>نابلس</small><b>☀️ 24°</b><small style={{ color: a }}>المغرب بعد 1:12</small></> },
  { name: 'تقدّمي', desc: 'الأيام المتتالية وورد اليوم وأذكار الصباح والمساء.', plus: true, body: (a) => <><small>أيام متتالية</small><b style={{ color: a }}>12 🔥</b><span className="wd-row"><i>الصباح ✓</i><i>المساء</i></span></> },
  { name: 'المسبحة', desc: 'سبّح بالضغط على الودجت مباشرة.', plus: true, body: (a) => <><small>سبحان الله</small><b style={{ color: a, fontSize: '1.6rem' }}>33</b></> },
  { name: 'عدّاد رمضان', desc: 'الأيام الباقية على رمضان، والسحور والإفطار فيه.', plus: true, body: (a) => <><small>بقي على رمضان</small><b style={{ color: a }}>118 يومًا</b></> },
]

export function WidgetsPage() {
  const plus = usePlus()
  const [style, setStyle] = useState('emerald')
  const android = platformName() === 'android'
  useEffect(() => { getWidgetStyle().then(setStyle) }, [])
  const cur = WIDGET_STYLES.find((s) => s.id === style) ?? WIDGET_STYLES[0]
  const pick = async (id: string) => {
    if (id !== 'emerald' && !plus.entitled) { toast('تصميم الودجت من مزايا رفيق بلس'); return }
    setStyle(id)
    if (android) toast((await setWidgetStyle(id)) ? 'تغيّر تصميم كل الودجتات' : 'تعذر تطبيق التصميم')
    else toast('يُطبَّق التصميم على ودجتات تطبيق Android')
  }
  return (
    <>
      <PageHead title="الودجتات" subtitle="أدوات الشاشة الرئيسية — واختر تصميمها بألوان ثيمك" />
      <div className="stack">
        <section className="card" aria-labelledby="wd-design">
          <h2 id="wd-design">{plus.entitled ? <Crown size={18} /> : <Lock size={18} />} تصميم الودجت</h2>
          <p className="small muted">خلفية واحدة لكل ودجتات رفيق المسلم، تتغير فورًا على الشاشة الرئيسية.{!plus.entitled && ' التصميمات الإضافية لمشتركي بلس.'}</p>
          <div className="wd-styles" role="radiogroup" aria-label="تصميم الودجت">
            {WIDGET_STYLES.map((s) => {
              const locked = s.id !== 'emerald' && !plus.entitled
              return (
                <button key={s.id} type="button" role="radio" aria-checked={style === s.id} className={'wd-style' + (style === s.id ? ' on' : '')} onClick={() => pick(s.id)}>
                  <span className="wd-swatch" style={{ background: `linear-gradient(135deg, ${s.bg[0]}, ${s.bg[1]})`, borderColor: s.stroke }}>{style === s.id ? <Check size={14} /> : locked ? <Lock size={12} /> : null}</span>
                  <span>{s.name}</span>
                </button>
              )
            })}
          </div>
          {!plus.entitled && <Link to="/plus" className="btn btn-sm btn-gold" style={{ marginTop: 8 }}>اشترك في بلس</Link>}
        </section>
        <section className="card" aria-labelledby="wd-list">
          <h2 id="wd-list">كل الودجتات</h2>
          <div className="wd-list">
            {WIDGETS.map((w) => (
              <div key={w.name} className="wd-item">
                <div className="wd-preview" style={{ background: `linear-gradient(135deg, ${cur.bg[0]}, ${cur.bg[1]})`, borderColor: cur.stroke }}>{w.body(cur.stroke)}</div>
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
            <li>ابحث عن «رفيق المسلم بلس» واسحب الودجت الذي تريده.</li>
          </ol>
          <p className="small muted" style={{ margin: 0 }}>الودجتات متاحة في Android. ودجتات iPhone تحتاج نسخة iOS (لم تُبنَ بعد).</p>
        </section>
      </div>
    </>
  )
}
