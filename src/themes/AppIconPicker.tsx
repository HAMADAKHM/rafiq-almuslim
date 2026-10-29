// اختيار أيقونة التطبيق (رفيق بلس): الأصلية للجميع، والبديلة للمشتركين. تتغير أيقونة الشاشة الرئيسية على Android.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import { usePlus } from '../billing/PlusContext'
import { toast } from '../hooks'
import { appIconSupported, getAppIcon, setAppIcon } from '../platform/appIcon'
import { APP_ICON_IDS, APP_ICONS, appIconUrl, type AppIconId } from './appIcons'

export function AppIconPicker() {
  const plus = usePlus()
  const [cur, setCur] = useState<AppIconId>('default')
  const [busy, setBusy] = useState(false)
  useEffect(() => { getAppIcon().then(setCur) }, [])
  const pick = async (id: AppIconId) => {
    if (id !== 'default' && !plus.entitled) { toast('الأيقونات البديلة من مزايا رفيق بلس'); return }
    if (!appIconSupported()) { toast('تغيير أيقونة الشاشة الرئيسية متاح في تطبيق Android'); return }
    setBusy(true)
    if (await setAppIcon(id)) { setCur(id); toast('تغيّرت الأيقونة — قد تحتاج الشاشة الرئيسية ثوانيَ لتحديثها') } else toast('تعذر تغيير الأيقونة على هذا الجهاز')
    setBusy(false)
  }
  return (
    <section className="card" aria-labelledby="icon-h">
      <h2 id="icon-h">أيقونة التطبيق</h2>
      <p className="small muted">الرمز نفسه بألوان كل ثيم. تتغير أيقونة «رفيق المسلم» في الشاشة الرئيسية لهاتفك (Android).{!plus.entitled && ' الأيقونات البديلة لمشتركي بلس.'}</p>
      <div className="icon-grid" role="radiogroup" aria-label="أيقونة التطبيق">
        {APP_ICON_IDS.map((id) => {
          const locked = id !== 'default' && !plus.entitled
          return (
            <button key={id} type="button" role="radio" aria-checked={cur === id} disabled={busy} className={'icon-opt' + (cur === id ? ' on' : '')} onClick={() => pick(id)} aria-label={`أيقونة ${APP_ICONS[id].name}`}>
              <img src={appIconUrl(id)} alt="" width={64} height={64} />
              <span>{APP_ICONS[id].name}</span>
              {cur === id ? <i className="icon-state"><Check size={12} /></i> : locked ? <i className="icon-state lock"><Lock size={11} /></i> : null}
            </button>
          )
        })}
      </div>
      {!plus.entitled && <Link className="btn btn-sm btn-gold" style={{ marginTop: 8 }} to="/plus">اشترك في بلس لتفعيلها</Link>}
      <p className="small muted" style={{ marginBottom: 0 }}>الثيم يغيّر شكل التطبيق من الداخل، والأيقونة تغيّر شكله في الشاشة الرئيسية — كل منهما مستقل. على iPhone يحتاج تغيير الأيقونة نسخة iOS (لم تُبنَ بعد).</p>
    </section>
  )
}
