// «مزايا رفيق المسلم بلس»: كل ميزة منفّذة فعلًا في بطاقة تفتحها، مصنفة، مع بحث فوري،
// وتمييز المجاني عن بلس، والاشتراك واستعادة المشتريات والشروط والخصوصية. لا تُذكر ميزة غير منفّذة.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Crown, Search, Sun, Moon, Bed, HandHeart, ScrollText, PenLine, Users, Baby, BookMarked, Palette, CircleDot, HeartHandshake,
  ChartNoAxesColumn, BellRing, Volume2, BellPlus, Mic, Clock, FileDown, Compass, Landmark, CalendarDays, ArrowLeftRight, MoonStar, CloudSun,
  BookOpen, Headphones, BookOpenText, BrainCircuit, UsersRound, HardDriveDownload, Sparkles, LayoutGrid, MonitorSmartphone, ImagePlus, Image, Utensils, X,
} from 'lucide-react'
import { usePlus } from '../../billing/PlusContext'
import { searchSkeleton } from '../../lib/arabic'

type Tier = 'free' | 'plus'
interface Feature { title: string; text: string; to: string; icon: typeof Crown; tier: Tier; color: string }

const C = { green: '#2e9e6b', teal: '#1d8a99', gold: '#c99a2e', rose: '#d65a6f', blue: '#3a7bd5', violet: '#8a5cd6', orange: '#e0813a' }

export const FEATURE_GROUPS: { title: string; items: Feature[] }[] = [
  { title: 'الأذكار والعبادات', items: [
    { title: 'أذكار الصباح والمساء', text: 'بمصادرها وعددها، مع العداد والاستماع بصوت بشري.', to: '/adhkar/morning', icon: Sun, tier: 'free', color: C.orange },
    { title: 'أذكار النوم والاستيقاظ', text: 'قبل النوم وعند الاستيقاظ، بمصادرها الصحيحة.', to: '/adhkar/sleep', icon: Bed, tier: 'free', color: C.violet },
    { title: 'أذكار ما بعد الصلاة', text: 'الاستغفار والتسبيح وآية الكرسي دبر كل صلاة.', to: '/adhkar/after-prayer', icon: Moon, tier: 'free', color: C.teal },
    { title: 'أذكار البيت والطعام والسفر', text: 'الدخول والخروج، وقبل الطعام وبعده، والسفر.', to: '/adhkar/food', icon: Utensils, tier: 'free', color: C.green },
    { title: 'الأدعية الشاملة', text: 'أقسام الأدعية من القرآن والسنة: الكرب، والرزق، والوالدين، والاستغفار…', to: '/duas', icon: HandHeart, tier: 'free', color: C.green },
    { title: 'الأحاديث', text: 'مكتبة أحاديث موثّقة بمصادرها ودرجتها.', to: '/hadith', icon: ScrollText, tier: 'free', color: C.blue },
    { title: 'أذكاري ودعائي', text: 'احفظ أذكارك وأدعيتك الخاصة في صفحة واحدة.', to: '/my-adhkar', icon: PenLine, tier: 'free', color: C.gold },
    { title: 'أذكار الصغار', text: 'أذكار قصيرة بخط كبير وعداد ملوّن للأطفال.', to: '/kids-adhkar', icon: Baby, tier: 'free', color: C.rose },
    { title: 'المسبحة', text: 'عداد تسبيح بالاهتزاز وأهداف يومية.', to: '/tasbih', icon: CircleDot, tier: 'free', color: C.teal },
    { title: 'دعاء لفقيدي', text: 'أدعية للميت تُكتب باسم من تحب.', to: '/for-the-deceased', icon: HeartHandshake, tier: 'free', color: C.violet },
    { title: 'أذكار الأحبة', text: 'ملف لكل عزيز: الوالدين، والأبناء، والزوج، والمريض، والمتوفى — أدعيته في مكان واحد، وملف PDF للمشاركة.', to: '/beloved', icon: Users, tier: 'plus', color: C.rose },
    { title: 'كتيّب الأذكار', text: 'اختر أقسام الأذكار واكتب الإهداء، فيُنشأ كتيّب PDF تشاركه وتهديه.', to: '/booklet', icon: BookMarked, tier: 'plus', color: C.orange },
    { title: 'سجل متابعة العبادات', text: 'متتاليتك، وخريطة حتى سنة كاملة، والقراءة والأذكار — على جهازك فقط.', to: '/plus/insights', icon: ChartNoAxesColumn, tier: 'plus', color: C.blue },
  ] },
  { title: 'التذكيرات والأصوات', items: [
    { title: 'الأذكار المسموعة في الإشعار', text: 'عند موعد الصباح والمساء والنوم والاستيقاظ وبعد الصلاة يُسمع الذكر نفسه: حصن المسلم، أو صوت الهاتف، أو تسجيلك.', to: '/reminders', icon: Volume2, tier: 'free', color: C.green },
    { title: 'تسجيلات الأذكار', text: 'استمع إلى الأذكار بصوت بشري، وأضف تسجيلك لأي ذكر.', to: '/adhkar-audio', icon: Mic, tier: 'free', color: C.rose },
    { title: 'رفيقي يذكّرني', text: 'ذكر مسموع كل مدة تختارها بلا تكرار، وموعدك مع القرآن، وقرب خروج وقت الصلاة.', to: '/companion', icon: BellRing, tier: 'plus', color: C.gold },
    { title: 'تذكيرات خاصة', text: 'حتى عشرة تذكيرات تكتبها بأيامك وأوقاتك.', to: '/plus/reminders', icon: BellPlus, tier: 'plus', color: C.orange },
  ] },
  { title: 'الصلاة والتقويم', items: [
    { title: 'مواقيت الصلاة والأذان', text: 'لمدينتك بطريقة الحساب المناسبة، وجدول الشهر، وتصديره PDF.', to: '/prayer', icon: Clock, tier: 'free', color: C.teal },
    { title: 'مواقيت الشهر في ملف PDF', text: 'جدول شهر كامل لمدينتك تشاركه أو تطبعه.', to: '/prayer?pdf=1', icon: FileDown, tier: 'free', color: C.blue },
    { title: 'القبلة والمساجد', text: 'اتجاه القبلة، وأقرب المساجد إليك.', to: '/qibla', icon: Compass, tier: 'free', color: C.green },
    { title: 'المساجد القريبة', text: 'على الخريطة مع المسافة والمفضلة.', to: '/mosques', icon: Landmark, tier: 'free', color: C.gold },
    { title: 'التقويم الهجري والمناسبات', text: 'الهجري والميلادي معًا، والمناسبات الإسلامية.', to: '/calendar', icon: CalendarDays, tier: 'free', color: C.rose },
    { title: 'تحويل التاريخ', text: 'من الهجري إلى الميلادي والعكس، ومواعيد رمضان والعيدين لعشر سنوات.', to: '/date-tools', icon: ArrowLeftRight, tier: 'free', color: C.violet },
    { title: 'وضع رمضان', text: 'السحور والإفطار، وجدول الشهر، وختمة رمضان.', to: '/ramadan', icon: MoonStar, tier: 'plus', color: C.gold },
    { title: 'الطقس', text: 'طقس مدينتك وحتى ثماني مدن أخرى.', to: '/weather', icon: CloudSun, tier: 'plus', color: C.blue },
  ] },
  { title: 'القرآن الكريم', items: [
    { title: 'القرآن والمصحف', text: 'القراءة المتتابعة والمصحف بالصفحات، والتفسير، والبحث.', to: '/quran', icon: BookOpen, tier: 'free', color: C.green },
    { title: 'الاستماع', text: 'تلاوات قرّاء متعددين، وتنزيل سورة.', to: '/listen', icon: Headphones, tier: 'free', color: C.teal },
    { title: 'التفسير كالقصة', text: 'قصص القرآن مشهدًا مشهدًا بصوت القارئ والتفسير الميسّر، ووضع الفيلم.', to: '/stories', icon: BookOpenText, tier: 'plus', color: C.orange },
    { title: 'خطة الحفظ الذكية', text: 'حصة يومية ومراجعة متباعدة حتى تختم.', to: '/plus/memorize', icon: BrainCircuit, tier: 'plus', color: C.violet },
    { title: 'ختمة العائلة', text: 'وزّع الأجزاء على أهلك وتابعوا معًا.', to: '/plus/family', icon: UsersRound, tier: 'plus', color: C.rose },
    { title: 'تنزيل المصحف كاملًا', text: 'الأجزاء أو المصحف كله بصوت قارئك للاستماع دون إنترنت.', to: '/plus/downloads', icon: HardDriveDownload, tier: 'plus', color: C.blue },
  ] },
  { title: 'التخصيص والتصميم', items: [
    { title: 'بطاقات الآيات والأذكار', text: 'صمّم بطاقة أو فيديو لآية أو ذكر وشاركه.', to: '/studio', icon: Image, tier: 'free', color: C.gold },
    { title: 'الثيمات الغامرة', text: 'ستة عشر ثيمًا فنيًا وحيًا للتطبيق كله (ثلاثة منها مجانية).', to: '/plus/themes', icon: Palette, tier: 'plus', color: C.violet },
    { title: 'تخصيص شريط التنقل', text: 'اختر الأقسام التي تظهر في الشريط السفلي.', to: '/settings#tabs', icon: LayoutGrid, tier: 'free', color: C.teal },
    { title: 'ودجتات الشاشة الرئيسية', text: 'المواقيت وآية اليوم مجانًا، والطقس وتقدّمي والمسبحة ورمضان مع بلس.', to: '/plus', icon: Sparkles, tier: 'plus', color: C.green },
    { title: 'التحكم بشاشة التلفاز', text: 'غيّر مشاهد شاشة المواقيت على التلفاز من جوالك.', to: '/tv-remote', icon: MonitorSmartphone, tier: 'plus', color: C.blue },
    { title: 'خلفيات التلفاز من صورك', text: 'أرسل صورك من الجوال لتكون خلفية شاشة التلفاز.', to: '/tv-remote', icon: ImagePlus, tier: 'plus', color: C.rose },
  ] },
]

export function FeaturesPage() {
  const p = usePlus()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const k = searchSkeleton(q.trim())
    if (!k) return FEATURE_GROUPS
    return FEATURE_GROUPS.map((g) => ({ ...g, items: g.items.filter((f) => searchSkeleton(`${f.title} ${f.text} ${g.title}`).includes(k)) })).filter((g) => g.items.length)
  }, [q])
  const count = FEATURE_GROUPS.reduce((a, g) => a + g.items.length, 0)
  const plusCount = FEATURE_GROUPS.reduce((a, g) => a + g.items.filter((f) => f.tier === 'plus').length, 0)

  return (
    <div className="features-page">
      <header className="fx-hero">
        <button className="fx-close icon-btn" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label="إغلاق"><X size={20} /></button>
        <span className="fx-crown"><Crown size={34} aria-hidden="true" /></span>
        <h1>رفيق المسلم بلس</h1>
        <p className="fx-sub">مزايا إضافية تعينك على ذكر الله كل يوم</p>
        <p className="fx-note">اشتراكك يساعد على تطوير التطبيق واستمراره — والقرآن والأذكار والمواقيت مجانية دائمًا للجميع.</p>
        <div className="fx-stats"><span><b>{count}</b> ميزة</span><span><b>{plusCount}</b> مع بلس</span><span><b>{count - plusCount}</b> مجانية</span></div>
      </header>

      <section className="fx-offer" aria-label="الاشتراك">
        {p.realEntitled ? <p className="fx-active"><Crown size={16} /> اشتراكك في رفيق بلس فعّال — جزاك الله خيرًا</p>
          : p.previewUnlocked ? <p className="fx-active"><Crown size={16} /> كل مزايا بلس مفتوحة الآن للجميع مؤقتًا دون اشتراك</p>
          : (
            <div className="fx-plans">
              <Link to="/plus" className="fx-plan"><span>اشتراك شهري</span><b>{p.offer?.priceString ?? '9.99 ₪'}</b></Link>
            </div>
          )}
        <div className="fx-links">
          <button className="chip" onClick={p.restore} disabled={p.busy != null}>استعادة الاشتراك</button>
          <a className="chip" href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer">إدارة الاشتراكات</a>
          <Link className="chip" to="/terms">الشروط</Link>
          <Link className="chip" to="/settings#privacy">الخصوصية</Link>
        </div>
      </section>

      {groups.map((g) => (
        <section key={g.title} className="fx-group" aria-label={g.title}>
          <h2>{g.title}</h2>
          <div className="fx-list">
            {g.items.map((f) => (
              <Link key={f.title} to={f.to} className="fx-card">
                <span className="fx-icon" style={{ color: f.color, background: `${f.color}1f` }}><f.icon size={24} aria-hidden="true" /></span>
                <span className="fx-body">
                  <span className="fx-title">{f.title}<span className={'fx-badge ' + f.tier}>{f.tier === 'plus' ? 'بلس' : 'مجاني'}</span></span>
                  <span className="fx-text">{f.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="muted" style={{ textAlign: 'center' }}>لا توجد ميزة بهذا الاسم.</p>}

      <div className="fx-search">
        <Search size={18} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن ميزة" aria-label="ابحث عن ميزة" />
        {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="مسح البحث"><X size={16} /></button>}
      </div>
    </div>
  )
}
