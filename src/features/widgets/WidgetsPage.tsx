// «استوديو الودجت»: معرض التصاميم المعتمدة لكل ودجت، والعناصر والخط، والشفافية وشاشة القفل (بلس)، وطريقة الإضافة.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Crown, Lock } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { usePlus } from '../../billing/PlusContext'
import { toast } from '../../hooks'
import { platformName } from '../../platform'
import { getWidgetExtras, setLockScreenTimes, setWidgetAlpha } from '../../platform/widget'
import { useSettings } from '../../state/SettingsContext'
import { DEFAULT_WIDGET_PREFS, type WidgetPrefs } from '../../state/settings'
import { cityLabel } from '../../services/cities'

/** التصاميم المعتمدة (لوحة تصاميم صاحب التطبيق): صورة كل ودجت كما في اللوحة */
export const WIDGET_DESIGNS: { id: string; name: string; size: string; desc: string }[] = [
  { id: 'prayer', name: 'مواقيت الصلاة', size: 'صغير', desc: 'الصلاة القادمة بوقتها الكبير والعدّ التنازلي، وصف الصلوات الخمس، على صورة المسجد والهلال.' },
  { id: 'quran', name: 'آية اليوم', size: 'متوسط', desc: 'ورق عاجي بإطار ذهبي مزخرف: «قال تعالى» والآية ومرجعها، و«متابعة القراءة».' },
  { id: 'adhkar', name: 'الأذكار', size: 'متوسط', desc: 'الذكر مباشرة مع عدّاد التكرار وشريط التقدم الذهبي، وأزرار السابق والعدّ والتالي.' },
  { id: 'tasbih', name: 'المسبحة', size: 'صغير', desc: 'حلقة المسبحة والعدد في وسطها، اضغط للتسبيح، وزر التصفير الذهبي.' },
  { id: 'dua', name: 'دعاء اليوم', size: 'متوسط', desc: 'دعاء من القرآن والسنة بمصدره على صورة الغروب، مع المشاركة والنسخ و«دعاء آخر».' },
  { id: 'all', name: 'الكل في واحد', size: 'كبير', desc: 'آية اليوم، والصلاة القادمة وعدّها، وذكر اليوم، واختصارات القرآن والأذكار والصلاة والقبلة.' },
  { id: 'greet', name: 'البطاقات العصرية', size: 'متوسط', desc: 'تحية بحسب الوقت (صباح الخير / مساء الخير) وعبارة طيبة تتجدد كل يوم على صورة طبيعية.' },
  { id: 'prayer-large', name: 'الصلاة القادمة', size: 'كبير', desc: 'وقت الصلاة القادمة بالذهبي واسمها والعدّ التنازلي، والتاريخان الميلادي والهجري.' },
  { id: 'daily-adhkar', name: 'الأذكار اليومية', size: 'صغير', desc: 'أذكار الصباح والمساء: «تم» أو «لم تبدأ بعد» بحسب ما أتممته اليوم.' },
]

const EXTRA_WIDGETS: { name: string; desc: string }[] = [
  { name: 'أكمل من حيث وصلت', desc: 'آخر موضع قراءة فعلية، يفتح المصحف عنده.' },
  { name: 'الطقس والصلاة القادمة', desc: 'طقس مدينتك مع موعد الصلاة القادمة.' },
  { name: 'تقدّمي', desc: 'الأيام المتتالية وورد اليوم وأذكار الصباح والمساء.' },
  { name: 'عدّاد رمضان', desc: 'الأيام الباقية على رمضان، والسحور والإفطار فيه.' },
]

export function WidgetsPage() {
  const plus = usePlus()
  const { settings, update } = useSettings()
  const wp: WidgetPrefs = { ...DEFAULT_WIDGET_PREFS, ...settings.widgetPrefs }
  const setWp = (patch: Partial<WidgetPrefs>) => update({ widgetPrefs: { ...wp, ...patch } })
  const android = platformName() === 'android'
  const [alpha, setAlpha] = useState(100)
  const [lock, setLock] = useState(false)
  useEffect(() => { getWidgetExtras().then((x) => { setAlpha(x.alpha); setLock(x.lock) }) }, [])
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
  return (
    <>
      <PageHead title="استوديو الودجت" subtitle="صمّم ودجتات رفيق المسلم وعاينها قبل إضافتها للشاشة الرئيسية" />
      <div className="stack">
        <section className="card" aria-labelledby="wd-gallery">
          <h2 id="wd-gallery">تصاميم الودجتات</h2>
          <p className="small muted">كل ودجت بتصميمه المعتمد، والكتابة فيه حية بمواقيت مدينتك وآية اليوم وأذكار التطبيق. الصورة توضيحية من لوحة التصاميم.</p>
          <div className="wd-gallery">
            {WIDGET_DESIGNS.map((d) => (
              <figure key={d.id} className="wd-item">
                <img src={`/widgets/w-${d.id}.jpg`} alt={'ودجت ' + d.name} loading="lazy" />
                <figcaption><strong>{d.name} <span className="fx-badge free">{d.size}</span></strong><span className="small muted">{d.desc}</span></figcaption>
              </figure>
            ))}
          </div>
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
          <h2 id="wd-list">{plus.entitled ? <Crown size={18} /> : <Lock size={18} />} ودجتات بلس الإضافية</h2>
          <div className="wd-list">
            {EXTRA_WIDGETS.map((w) => (
              <div key={w.name} className="wd-extra"><strong>{w.name} <span className="fx-badge plus">بلس</span></strong><p className="small muted">{w.desc}</p></div>
            ))}
          </div>
          {!plus.entitled && <Link to="/plus" className="btn btn-sm btn-gold" style={{ marginTop: 8 }}>اشترك في بلس</Link>}
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
            <li><strong>الإعداد:</strong> اضغط على الودجت مطولًا ← «إعداد» (أو أيقونة القلم).</li>
            <li><strong>الحجم:</strong> اضغط عليه مطولًا ثم اسحب المقابض حول حدوده لتكبيره أو تصغيره.</li>
          </ol>
          <p className="small muted" style={{ margin: 0 }}>الودجتات متاحة في Android. «إعداد» بعد الوضع في Android 12 فأحدث، وفي الأقدم تظهر شاشة التصميم عند إضافة الودجت. ودجتات iPhone تحتاج نسخة iOS (لم تُبنَ بعد).</p>
        </section>
      </div>
    </>
  )
}
