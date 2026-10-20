import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import {
  House, CalendarCheck, BookOpen, Brain, Headphones, Clock, Compass, Sparkles, HandHeart, GraduationCap,
  ChartColumn, Route, Search, Settings, Heart, Menu, X, WifiOff, CircleDot, CalendarDays, Bell,
} from 'lucide-react'
import { t, type StringKey } from '../i18n/strings'
import { useSettings } from '../state/SettingsContext'
import { FOOTER_LINE } from '../content/dedication'
import { MiniPlayer } from '../components/MiniPlayer'
import { useOnline, useToastMessage } from '../hooks'
import { startReminderLoop } from '../services/notifications'
import iconUrl from '../assets/icon.svg'

const NAV: { group: StringKey; items: { to: string; key: StringKey; icon: typeof House }[] }[] = [
  { group: 'groupDaily', items: [
    { to: '/', key: 'home', icon: House },
    { to: '/wird', key: 'wird', icon: CalendarCheck },
  ] },
  { group: 'groupQuran', items: [
    { to: '/quran', key: 'quran', icon: BookOpen },
    { to: '/memorize', key: 'memorize', icon: Brain },
    { to: '/listen', key: 'listen', icon: Headphones },
    { to: '/learn', key: 'learn', icon: GraduationCap },
  ] },
  { group: 'groupWorship', items: [
    { to: '/prayer', key: 'prayer', icon: Clock },
    { to: '/qibla', key: 'qibla', icon: Compass },
    { to: '/adhkar', key: 'adhkar', icon: Sparkles },
    { to: '/duas', key: 'duas', icon: HandHeart },
    { to: '/tasbih', key: 'tasbih', icon: CircleDot },
    { to: '/calendar', key: 'calendar', icon: CalendarDays },
  ] },
  { group: 'groupMore', items: [
    { to: '/progress', key: 'progress', icon: ChartColumn },
    { to: '/journey', key: 'journey', icon: Route },
    { to: '/search', key: 'search', icon: Search },
    { to: '/reminders', key: 'reminders', icon: Bell },
    { to: '/settings', key: 'settings', icon: Settings },
    { to: '/about', key: 'about', icon: Heart },
  ] },
]

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="رفيق المسلم — الصفحة الرئيسية">
      <img src={iconUrl} alt="" />
      <span>
        <strong>رفيق المسلم</strong>
        <small>Islamic Companion</small>
      </span>
    </Link>
  )
}

export function Layout() {
  const { settings } = useSettings()
  const lang = settings.lang
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const online = useOnline()
  const toastMsg = useToastMessage()
  const mainRef = useRef<HTMLElement>(null)
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => { setOpen(false); window.scrollTo?.(0, 0) }, [loc.pathname])
  useEffect(() => startReminderLoop(() => settingsRef.current), [])

  const isReader = /^\/(quran\/\d+|mushaf)/.test(loc.pathname)

  return (
    <div className="app">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      {open && <div className="backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={'sidebar' + (open ? ' open' : '')} aria-label="القائمة الرئيسية">
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
        <header className="topbar">
          <Brand />
          <button className="btn btn-ghost icon-btn" onClick={() => setOpen((o) => !o)} aria-label={t('menu', lang)} aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </header>
        {!online && (
          <div className="alert alert-gold small" role="status" style={{ borderRadius: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
            <WifiOff size={16} aria-hidden="true" /> أنت غير متصل بالإنترنت. القرآن والأذكار وبياناتك متاحة؛ التلاوات والتفسير غير المحمّلين يحتاجان اتصالًا.
          </div>
        )}
        <main id="main" ref={mainRef} className="content" tabIndex={-1}>
          <Outlet />
        </main>
        {settings.showFooterDedication && !isReader && (
          <footer className="footer">
            <Link to="/about">{FOOTER_LINE}</Link>
          </footer>
        )}
      </div>
      <MiniPlayer />
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  )
}
