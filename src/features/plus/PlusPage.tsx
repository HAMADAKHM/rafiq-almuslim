// صفحة «رفيق بلس»: اشتراك اختياري بمزايا إضافية. لا ضغط ولا عدّ تنازلي ولا ربط بالأجر،
// ويمكن إغلاقها والاستمرار مجانًا. لا إعلانات في هذه الصفحة أبدًا.
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Gem, BookOpenText, Check, RotateCcw, ExternalLink, X, Palette, BellPlus, ChartNoAxesColumn, Clapperboard, MoonStar, BrainCircuit, UsersRound, HardDriveDownload, CloudSun, LayoutGrid, Ban, BellRing, MonitorSmartphone } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { usePlus } from '../../billing/PlusContext'
import { isEntitled } from '../../billing/entitlement'
import { SandboxPanel } from './SandboxPanel'

/** المزايا المنفّذة فعلًا فقط */
const BENEFITS = [
  { icon: MonitorSmartphone, to: '/tv-remote', title: 'التحكم بشاشة التلفاز من جوالك', text: 'اربط الجوال بشاشة رفيق المسلم على التلفاز برمز آمن، وغيّر المشاهد ومدة عدم الاستخدام وأوقف الأذان دون جهاز التحكم.' },
  { icon: BellRing, to: '/companion', title: 'رفيقي يذكّرني ورفيقي اليومي', text: 'ذكر من السنة كل مدة تختارها بلا تكرار، وموعدك مع القرآن يفتح المصحف حيث وصلت، وتنبيه قبل خروج وقت الصلاة، وبطاقة يومية وودجت «أكمل من حيث وصلت».' },
  { icon: BookOpenText, to: '/stories', title: 'التفسير كالقصة', text: '١٤ قصة من القرآن وأي سورة، مشهدًا مشهدًا: الآية بصوت القارئ ثم معناها من التفسير الميسّر، قراءةً أو استماعًا.' },
  { icon: Clapperboard, to: '/stories', title: 'وضع الفيلم وحفظ الفيديو', text: 'القصة بملء الشاشة على مشاهد متحركة (بحر، نجوم، جبال، جنات)، واحفظها فيديو بصوت القارئ وقراءة المعنى لتشاركها.' },
  { icon: MoonStar, to: '/ramadan', title: 'وضع رمضان والصيام', text: 'السحور والإفطار مع العدّ التنازلي، وجدول الشهر، وختمة رمضان، وتذكيرات عرفة وعاشوراء والأيام البيض.' },
  { icon: BrainCircuit, to: '/plus/memorize', title: 'خطة الحفظ الذكية', text: 'اختر السور وموعد الختم، فتأتيك حصة كل يوم وتنتقل إلى المراجعة المتباعدة.' },
  { icon: UsersRound, to: '/plus/family', title: 'ختمة العائلة', text: 'وزّع الأجزاء الثلاثين على أهلك، وشارك التوزيع على واتساب، وتابع الإتمام — مع إهداء لمن تحب.' },
  { icon: HardDriveDownload, to: '/plus/downloads', title: 'تنزيل الأجزاء والمصحف كاملًا', text: 'جزء عمّ أو تبارك أو المصحف كله بصوت قارئك، للاستماع في السفر والمسجد دون إنترنت.' },
  { icon: CloudSun, to: '/weather', title: 'حالة الطقس', text: 'طقس مدينتك وحتى ٨ مدن أخرى، الآن والساعات القادمة، وفي أعلى الرئيسية.' },
  { icon: LayoutGrid, to: '/plus', title: 'أربع ودجتات جديدة', text: 'الطقس والصلاة القادمة، وتقدّمي، والمسبحة بالضغط على الشاشة، وعدّاد رمضان.' },
  { icon: Palette, to: '/plus/themes', title: 'ألوان وخلفيات وتصاميم', text: 'خمس لوحات ألوان للتطبيق كله، وست خلفيات إضافية في استوديو التصاميم.' },
  { icon: BellPlus, to: '/plus/reminders', title: 'تذكيرات خاصة', text: 'حتى عشرة تذكيرات تكتبها بنفسك، بالأيام والأوقات التي تختارها.' },
  { icon: ChartNoAxesColumn, to: '/plus/insights', title: 'إحصاءاتي', text: 'أيامك المتتالية، وخريطة ١٢ أسبوعًا، ونسبة ما قرأت من القرآن — على جهازك فقط.' },
  { icon: Ban, to: '/plus', title: 'بلا إعلانات', text: 'لا يظهر أي إعلان للمشتركين.' },
]

const fmtDate = (t: number) => new Intl.DateTimeFormat('ar-u-nu-latn', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(t))

export function PlusPage() {
  const p = usePlus()
  const nav = useNavigate()
  const e = p.entitlement
  const active = p.entitled
  const subscribed = p.realEntitled
  const close = () => (window.history.length > 1 ? nav(-1) : nav('/'))

  return (
    <div className="page plus-page">
      <PageHead title="رفيق بلس" subtitle="عضوية اختيارية بمزايا إضافية" actions={<button className="icon-btn" onClick={close} aria-label="إغلاق والاستمرار مجانًا"><X size={20} /></button>} />

      {p.previewUnlocked && <p className="notice" role="note">نسخة معاينة خاصة بصاحب التطبيق: كل مزايا رفيق بلس مفتوحة للمراجعة دون اشتراك. ليست للنشر، والنسخ العامة تبقى مقفلة.</p>}
      {p.provider.test && <p className="notice" role="note">وضع تجريبي: لا يوجد أي دفع حقيقي. «الشهر» هنا 5 دقائق لتجربة التجديد والإلغاء والانتهاء.</p>}

      <section className="card plus-status" aria-label="حالة الاشتراك">
        <Gem size={26} aria-hidden="true" />
        {subscribed ? (
          <div>
            <h3>اشتراكك في رفيق بلس فعّال</h3>
            {e.expiresAt && <p className="muted">{e.willRenew ? `يتجدد تلقائيًا في ${fmtDate(e.expiresAt)}` : `أُلغي التجديد، وينتهي في ${fmtDate(e.expiresAt)}`}</p>}
          </div>
        ) : (
          <div>
            <h3>{p.ready ? 'غير مشترك' : 'جارٍ التحقق من الاشتراك…'}</h3>
            <p className="muted">كل ميزات التطبيق الحالية مجانية وتبقى مجانية.</p>
          </div>
        )}
      </section>

      <section className="card" aria-label="مزايا رفيق بلس">
        <h2>المزايا</h2>
        <ul className="plus-benefits">
          {BENEFITS.map((b) => (
            <li key={b.title}><b.icon size={22} aria-hidden="true" /><div><b>{active ? <Link to={b.to}>{b.title}</Link> : b.title}</b><p className="muted">{b.text}</p></div></li>
          ))}
        </ul>
        <p className="muted small">تُضاف مزايا أخرى لاحقًا، ولا تُذكر هنا إلا بعد توفرها فعلًا.</p>
      </section>

      <section className="card" aria-label="المجاني دائمًا">
        <h2>مجاني دائمًا للجميع</h2>
        <p>قراءة القرآن الكريم والتنقل فيه، والتلاوة والاستماع، والأذكار والأدعية، ومواقيت الصلاة وتنبيهاتها، وكل ما في التطبيق الآن.</p>
      </section>

      {!subscribed && (
        <section className="card plus-offer" aria-label="الاشتراك">
          {p.offer ? (
            <>
              <p className="plus-price"><b>{p.offer.priceString}</b> شهريًا</p>
              <p className="muted small">
                {p.offer.renewing ? 'اشتراك شهري يتجدد تلقائيًا حتى تلغيه، ' : ''}
                ويمكنك إلغاء التجديد في أي وقت من إعدادات المتجر. يُدفع عبر {p.provider.test ? 'متجر الاختبار' : 'حسابك في المتجر'}، والتطبيق لا يرى بيانات بطاقتك.
              </p>
              <button className="btn btn-gold btn-block" onClick={p.purchase} disabled={p.busy != null}>{p.busy === 'purchase' ? 'جارٍ فتح المتجر…' : `اشترك بـ ${p.offer.priceString} شهريًا`}</button>
            </>
          ) : (
            <p className="muted">{p.provider.id === 'none' ? 'الاشتراك لم يُفتح بعد في هذه النسخة، ولا تُفتح مزايا بلس قبله. التطبيق المجاني يعمل كما هو.' : p.ready ? 'الاشتراك غير متاح حاليًا على هذا الجهاز أو دون اتصال بالمتجر. التطبيق المجاني يعمل كما هو.' : 'جارٍ جلب السعر من المتجر…'}</p>
          )}
        </section>
      )}

      <div className="plus-actions">
        <button className="btn" onClick={p.restore} disabled={p.busy != null}><RotateCcw size={16} /> {p.busy === 'restore' ? 'جارٍ الاستعادة…' : 'استعادة المشتريات'}</button>
        {e.manageUrl && <a className="btn" href={e.manageUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> إدارة الاشتراك أو إلغاؤه</a>}
        <button className="btn" onClick={close}>متابعة استخدام التطبيق مجانًا</button>
      </div>

      {p.message && <p className={'plus-msg ' + p.message.kind} role="status">{p.message.kind === 'ok' && <Check size={16} />} {p.message.text}</p>}

      <p className="muted small plus-note">
        الاشتراك مقابل مزايا إضافية في التطبيق فقط. ليس تبرعًا، ولا علاقة له بأجر الصدقة الجارية عن روح المرحوم الحاج قصي بديع خلفه «أبو محمد»،
        والتطبيق بمزاياه الأساسية متاح للجميع دون مقابل.
      </p>

      {p.provider.test && <SandboxPanel />}
      {!isEntitled(e, Date.now()) && p.verifiedAt && <p className="muted small">آخر تحقق من المتجر: {fmtDate(p.verifiedAt)}</p>}
    </div>
  )
}
