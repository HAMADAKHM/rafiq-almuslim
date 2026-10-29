// تخصيص الشريط السفلي: ثلاثة أقسام في الوسط يختارها المستخدم بالترتيب (الرئيسية و«المزيد» ثابتان)
import { LayoutGrid, RotateCcw } from 'lucide-react'
import { useSettings } from '../../state/SettingsContext'
import { DEFAULT_TABS, TAB_CHOICES } from '../../app/nav'
import { toast } from '../../hooks'

export function TabsSettings() {
  const { settings, update } = useSettings()
  const cur = settings.tabs && settings.tabs.length === 3 ? settings.tabs : DEFAULT_TABS
  const pick = (to: string) => {
    if (cur.includes(to)) { toast('اختر قسمًا آخر ليحلّ محله: يبقى في الشريط ثلاثة أقسام'); return }
    // يحل الاختيار الجديد محل أقدم الثلاثة
    update(() => ({ tabs: [...cur.slice(1), to] }))
  }
  return (
    <section className="card" id="tabs" aria-label="الشريط السفلي">
      <h2><LayoutGrid size={18} /> الشريط السفلي</h2>
      <p className="small muted">اختر الأقسام الثلاثة في وسط الشريط السفلي. «الرئيسية» و«المزيد» ثابتان.</p>
      <div className="chips">
        {TAB_CHOICES.map((t) => {
          const i = cur.indexOf(t.to)
          return <button key={t.to} type="button" aria-pressed={i >= 0} className={'chip' + (i >= 0 ? ' active' : '')} onClick={() => pick(t.to)}><t.icon size={14} aria-hidden="true" /> {t.short}{i >= 0 ? ` (${i + 1})` : ''}</button>
        })}
      </div>
      <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => update(() => ({ tabs: undefined }))}><RotateCcw size={14} /> الافتراضي</button>
    </section>
  )
}
