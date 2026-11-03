import { Suspense, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { WifiOff, ChevronRight, Search } from 'lucide-react'
import { t } from '../i18n/strings'
import { useSettings } from '../state/SettingsContext'
import { ThemePreviewBar } from '../themes/ThemePreviewBar'
import { FOOTER_LINE } from '../content/dedication'
import { MiniPlayer } from '../components/MiniPlayer'
import { useLive, useOnline, useToastMessage } from '../hooks'
import { activeKidId, kidPathAllowed } from '../services/kids'
import { useGolden } from '../themes/useGolden'
import { goldenPhoto, heroFor, landmarkFor } from '../themes/golden'
import { startReminderLoop } from '../services/notifications'
import { LogoMark } from '../components/Art'
import { NAV, tabsFor } from './nav'
import { Splash } from './Splash'
import { TvUpdateCheck } from './TvUpdateCheck'
import { Spinner } from '../components/Common'
import { AdhanAlarm } from '../components/AdhanAlarm'
import { AdhkarAlarm } from '../components/AdhkarAlert'

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="رفيق المسلم — الصفحة الرئيسية">
      <span className="brand-mark"><LogoMark size={26} /></span>
      <span>
        <strong>رفيق المسلم</strong>
        <small>Islamic Companion</small>
      </span>
    </Link>
  )
}

function useKidGuard(pathname: string, navigate: (to: string, o?: { replace?: boolean }) => void) {
  const kidId = useLive(() => activeKidId(), ['kv:kids:active'], null)
  useEffect(() => { if (kidId && !kidPathAllowed(pathname)) navigate('/kids', { replace: true }) }, [kidId, pathname, navigate])
  return !!kidId
}

export function Layout() {
  const { settings } = useSettings()
  const lang = settings.lang
  const loc = useLocation()
  const navigate = useNavigate()
  const online = useOnline()
  const toastMsg = useToastMessage()
  const mainRef = useRef<HTMLElement>(null)
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => { window.scrollTo?.(0, 0) }, [loc.pathname])
  useEffect(() => startReminderLoop(() => settingsRef.current), [])

  // صفحات القراءة لها رأسها وشريطها السفلي الخاصان (يحتويان المشغل)
  const isReader = /^\/(quran\/\d+\/?$|mushaf|read\/?$)/.test(loc.pathname)
  const isHome = loc.pathname === '/'
  const kidMode = useKidGuard(loc.pathname, navigate)
  const golden = useGolden()
  // التصميم الذهبي: رأس بصورة حقيقية لكل صفحة؛ صفحة المواقيت تعرض معلم دولة المستخدم إن توفرت صورته
  const land = landmarkFor(settings.location?.country, settings.location?.name)
  const heroImg = goldenPhoto(loc.pathname.startsWith('/prayer') && land ? land.photo : heroFor(loc.pathname))

  return (
    <div className={'app' + (isReader ? ' reading' : '') + (/^\/read\/?$/.test(loc.pathname) ? ' reading2' : '') + (isHome ? ' at-home' : '') + (kidMode ? ' kid-mode' : '') + (golden ? ' golden' : '')}>
      <Splash />
      <TvUpdateCheck />
      <AdhanAlarm />
      <AdhkarAlarm />
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <aside className="sidebar" aria-label="القائمة الرئيسية">
        <Brand />
        <nav>
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="nav-group">{t(g.group, lang)}</div>
              {g.items.map(({ to, key, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{t(key, lang)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <p className="small muted" style={{ padding: '1rem 0.75rem 0' }}>{t('tagline', lang)}</p>
      </aside>

      <div className="main">
        {golden && !isHome && !isReader && <div className="gd-page-hero" style={{ backgroundImage: `url("${heroImg}")` }} aria-hidden="true" />}
        <header className="topbar">
          <button className="btn btn-ghost icon-btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="رجوع"><ChevronRight /></button>
          <div className="topbar-center"><div id="topbar-title" className="topbar-title" /><Brand /></div>
          <Link className="btn btn-ghost icon-btn" to="/search" aria-label={t('search', lang)}><Search size={20} /></Link>
        </header>
        {!online && (
          <div className="alert alert-gold small" role="status" style={{ borderRadius: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
            <WifiOff size={16} aria-hidden="true" /> أنت غير متصل بالإنترنت. القرآن والأذكار وبياناتك متاحة؛ التلاوات والتفسير غير المحمّلين يحتاجان اتصالًا.
          </div>
        )}
        <main id="main" ref={mainRef} className="content" tabIndex={-1}>
          <Suspense fallback={<Spinner label="جارٍ فتح الصفحة" />}>
            <Outlet />
          </Suspense>
        </main>
        {settings.showFooterDedication && !isReader && (
          <footer className="footer">
            <Link to="/about">{FOOTER_LINE}</Link>
          </footer>
        )}
      </div>
      {!isReader && <MiniPlayer />}
      {!isReader && (
        <nav className="tabbar" aria-label="التنقل السفلي">
          {tabsFor(settings.tabs).map(({ to, icon: Icon, short, match }) => {
            const active = match.test(loc.pathname)
            return (
              <Link key={to} to={to} className={'tab-item' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined}>
                <Icon size={22} aria-hidden="true" strokeWidth={active ? 2.4 : 1.8} />
                <span>{short}</span>
              </Link>
            )
          })}
        </nav>
      )}
      <ThemePreviewBar />
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  )
}
