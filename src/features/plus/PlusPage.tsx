// صفحة «رفيق بلس»: اشتراك اختياري بمزايا إضافية. لا ضغط ولا عدّ تنازلي ولا ربط بالأجر،
// ويمكن إغلاقها والاستمرار مجانًا. لا إعلانات في هذه الصفحة أبدًا.
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Gem, BookOpenText, Check, RotateCcw, ExternalLink, X, Palette, BellPlus, ChartNoAxesColumn } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { usePlus } from '../../billing/PlusContext'
import { isEntitled } from '../../billing/entitlement'
import { SandboxPanel } from './SandboxPanel'

/** المزايا المنفّذة فعلًا فقط */
const BENEFITS = [
  { icon: BookOpenText, to: '/stories', title: 'التفسير كالقصة', text: 'قصص القرآن وسوره مشهدًا مشهدًا: الآية بصوت القارئ ثم تفسيرها الميسّر، قراءةً أو استماعًا.' },
  { icon: Palette, to: '/plus/themes', title: 'ألوان وخلفيات إضافية', text: 'خمس لوحات ألوان بخلفيات زخرفية هادئة للتطبيق كله، في الوضع الفاتح والداكن.' },
  { icon: BellPlus, to: '/plus/reminders', title: 'تذكيرات خاصة', text: 'حتى عشرة تذكيرات تكتبها بنفسك، بالأيام والأوقات التي تختارها، وتفتح الصفحة التي تريد.' },
  { icon: ChartNoAxesColumn, to: '/plus/insights', title: 'إحصاءاتي', text: 'متتالية الأيام، وخريطة نشاط ١٢ أسبوعًا، ونسبة ما قرأت من القرآن، والأذكار، وأوقات القراءة — على جهازك فقط.' },
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

      {p.previewUnlocked && <p className="notice" role="note">نسخة تجريبية: كل مزايا رفيق بلس مفتوحة الآن للتجربة دون اشتراك. تُقفل لاحقًا وتُفتح عند الاشتراك.</p>}
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
            <p className="muted">{p.ready ? 'الاشتراك غير متاح حاليًا على هذا الجهاز أو دون اتصال بالمتجر. التطبيق المجاني يعمل كما هو.' : 'جارٍ جلب السعر من المتجر…'}</p>
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
