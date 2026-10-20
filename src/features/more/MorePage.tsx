import { Link } from 'react-router-dom'
import { PageHead } from '../../components/Common'
import { DedicationCard } from '../../components/DedicationCard'
import { NAV } from '../../app/nav'
import { t } from '../../i18n/strings'
import { useSettings } from '../../state/SettingsContext'

/** «المزيد»: كل أقسام التطبيق في شبكة واحدة (بديل القائمة الجانبية على الجوال) */
export function MorePage() {
  const { settings } = useSettings()
  return (
    <>
      <PageHead title="كل الأقسام" subtitle="كل ما في رفيق المسلم في مكان واحد" />
      <div className="stack" style={{ gap: '1.25rem' }}>
        {NAV.map((g) => (
          <section key={g.group} aria-label={t(g.group, settings.lang)}>
            <h2 className="section-title">{t(g.group, settings.lang)}</h2>
            <div className="tile-grid">
              {g.items.filter((i) => i.to !== '/').map(({ to, key, icon: Icon }) => (
                <Link key={to} to={to} className="tile">
                  <span className="tile-icon"><Icon size={22} aria-hidden="true" /></span>
                  <span>{t(key, settings.lang)}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <DedicationCard />
      </div>
    </>
  )
}
