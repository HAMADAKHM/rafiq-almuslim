import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Crown, Search, X, LayoutDashboard } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { DedicationCard } from '../../components/DedicationCard'
import { NAV } from '../../app/nav'
import { t } from '../../i18n/strings'
import { useSettings } from '../../state/SettingsContext'
import { usePlus } from '../../billing/PlusContext'
import { AdSlot } from '../../ads/AdSlot'
import { appIconDataUrl } from '../../themes/appIconSvg'
import { searchSkeleton } from '../../lib/arabic'

/** ألوان مربعات الأيقونات (على طريقة قوائم تطبيقات الأذكار): لون ثابت لكل قسم */
const COLORS = ['#3b82f6', '#ef5350', '#f59e0b', '#22a861', '#8b5cf6', '#14a3b8', '#ec4899', '#6366f1', '#f97316', '#0ea5a4']
/** وصف قصير تحت اسم القسم */
const HINT: Record<string, string> = {
  '/prayer': 'المواقيت والأذان ومواقيت الشهر', '/qibla': 'اتجاه القبلة', '/calendar': 'الهجري والمناسبات', '/date-tools': 'هجري ↔ ميلادي ورمضان والعيدان',
  '/reminders': 'الأذكار المسموعة والتنبيهات', '/settings': 'المدينة والمظهر والبيانات', '/plus/themes': 'الثيمات والأيقونات', '/widgets': 'أدوات الشاشة الرئيسية وتصميمها',
  '/wird': 'خطة الختمة وورد اليوم', '/memorize': 'الحفظ والمراجعة', '/listen': 'التلاوات والقراء', '/adhkar': 'الصباح والمساء وكل الأذكار', '/duas': 'أدعية من القرآن والسنة',
  '/kids-adhkar': 'أذكار قصيرة للأطفال', '/beloved': 'أدعية لكل عزيز', '/booklet': 'كتيّب PDF تهديه', '/companion': 'ذكر مسموع كل مدة', '/tv-remote': 'شاشة المواقيت على التلفاز',
  '/plus/features': 'كل المزايا في صفحة واحدة', '/progress': 'تقدّمك في القراءة والأذكار', '/assistant': 'اسأل عن آية أو ذكر',
}

/** «المزيد»: كل أقسام التطبيق في قوائم مجمّعة واضحة، مع بحث سريع */
export function MorePage() {
  const { settings } = useSettings()
  const plus = usePlus()
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const k = searchSkeleton(q.trim())
    const order = ['groupDaily', 'groupWorship', 'groupQuran', 'groupPlus', 'groupMore']
    return [...NAV].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group)).map((g) => ({
      ...g,
      items: g.items.filter((i) => i.to !== '/' && (!k || searchSkeleton(`${t(i.key, settings.lang)} ${HINT[i.to] ?? ''}`).includes(k))),
    })).filter((g) => g.items.length)
  }, [q, settings.lang])
  let n = 0
  return (
    <>
      <PageHead title="كل الأقسام" subtitle="كل ما في رفيق المسلم في مكان واحد" />
      <div className="stack more-page" style={{ gap: '1.1rem' }}>
        <label className="more-search">
          <Search size={18} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن قسم" aria-label="ابحث عن قسم" />
          {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="مسح"><X size={16} /></button>}
        </label>
        {!q && (
          <>
            <Link to="/about" className="more-app">
              <img src={appIconDataUrl('default')} alt="" width={52} height={52} />
              <span><strong>رفيق المسلم بلس</strong><small>صدقة جارية — عن التطبيق ومصادره</small></span>
              <ChevronLeft size={18} aria-hidden="true" />
            </Link>
            <Link to="/widgets" className="more-promo">
              <span className="mp-art" aria-hidden="true"><LayoutDashboard size={30} /></span>
              <span className="mp-text"><strong>ودجت على ذوقك</strong><small>صمّم ودجتات الشاشة الرئيسية بألوان ثيمك</small></span>
              <span className="btn btn-sm btn-primary">ابدأ التصميم</span>
            </Link>
            <Link to="/plus/features" className="more-plus">
              <span className="mpl-icon"><Crown size={24} aria-hidden="true" /></span>
              <span><strong>{plus.realEntitled ? 'اشتراكك في بلس فعّال' : 'رفيق المسلم بلس'}</strong><small>{plus.realEntitled ? 'تصفح كل مزاياك' : 'مزايا إضافية — اشترك وادعم استمرار التطبيق'}</small></span>
              <ChevronLeft size={20} aria-hidden="true" />
            </Link>
          </>
        )}
        {groups.map((g) => (
          <section key={g.group} aria-label={t(g.group, settings.lang)}>
            <h2 className="more-group-title">{t(g.group, settings.lang)}</h2>
            <div className="more-list">
              {g.items.map(({ to, key, icon: Icon }) => {
                const color = COLORS[n++ % COLORS.length]
                return (
                  <Link key={to} to={to} className="more-row">
                    <span className="mr-icon" style={{ background: color }}><Icon size={20} aria-hidden="true" /></span>
                    <span className="mr-body"><span className="mr-title">{t(key, settings.lang)}</span>{HINT[to] && <small>{HINT[to]}</small>}</span>
                    <ChevronLeft size={18} className="mr-chev" aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
        {!groups.length && <p className="muted" style={{ textAlign: 'center' }}>لا يوجد قسم بهذا الاسم.</p>}
        {!q && <DedicationCard />}
      </div>
      <AdSlot placement="more" />
    </>
  )
}
