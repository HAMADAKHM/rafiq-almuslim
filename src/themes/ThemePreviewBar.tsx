// شريط المعاينة: يظهر أثناء معاينة ثيم في أي صفحة — تطبيقه، أو الاشتراك لتفعيله، أو الرجوع إلى الثيم الحالي.
import { Link } from 'react-router-dom'
import { Check, Crown, X } from 'lucide-react'
import { usePlus } from '../billing/PlusContext'
import { useSettings } from '../state/SettingsContext'
import { toast } from '../hooks'
import { skinById } from './skins'
import { setThemePreview, useThemePreview } from './preview'

export function ThemePreviewBar() {
  const id = useThemePreview()
  const { update } = useSettings()
  const plus = usePlus()
  const s = skinById(id)
  if (!s) return null
  const locked = !s.free && !plus.entitled
  return (
    <div className="theme-preview-bar" role="region" aria-label={`معاينة ثيم ${s.name}`}>
      <span className="tpb-text">معاينة: <b>{s.name}</b><small>تنقّل بين الصفحات لترى شكله</small></span>
      {locked
        ? <Link className="btn btn-sm btn-gold" to="/plus" onClick={() => setThemePreview(null)}><Crown size={14} /> اشترك لتفعيله</Link>
        : <button className="btn btn-sm btn-primary" onClick={() => { update({ skin: s.id }); setThemePreview(null); toast(`طُبّق ثيم «${s.name}»`) }}><Check size={14} /> تطبيق</button>}
      <button className="icon-btn" onClick={() => setThemePreview(null)} aria-label="إنهاء المعاينة"><X size={18} /></button>
    </div>
  )
}
