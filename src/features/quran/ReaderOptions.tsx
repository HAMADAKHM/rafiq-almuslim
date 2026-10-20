import { useState } from 'react'
import { Palette } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { useSettings } from '../../state/SettingsContext'
import type { ReaderBg } from '../../state/settings'

const BGS: { id: ReaderBg; label: string }[] = [
  { id: 'ivory', label: 'عاجي' },
  { id: 'white', label: 'أبيض' },
  { id: 'sepia', label: 'ورقي دافئ' },
  { id: 'night', label: 'ليلي' },
]

/** خيارات القراءة: الخلفية وحجم الخط والترجمة — تُحفظ ويتذكرها التطبيق */
export function ReaderOptions() {
  const { settings, update } = useSettings()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn btn-sm icon-btn" onClick={() => setOpen(true)} aria-label="خيارات القراءة"><Palette size={16} /></button>
      <Sheet open={open} onClose={() => setOpen(false)} title="خيارات القراءة">
        <div className="stack">
          <div>
            <div className="small muted">الخلفية</div>
            <div className="row" role="radiogroup" aria-label="خلفية القراءة">
              {BGS.map((b) => (
                <button key={b.id} role="radio" aria-checked={settings.readerBg === b.id} className={`bg-swatch reader-bg-${b.id}` + (settings.readerBg === b.id ? ' selected' : '')} onClick={() => update({ readerBg: b.id })}>{b.label}</button>
              ))}
            </div>
          </div>
          <label className="field"><span>حجم خط المصحف ({settings.quranFontSize})</span>
            <input type="range" min={18} max={56} step={2} value={settings.quranFontSize} onChange={(e) => update({ quranFontSize: Number(e.target.value) })} />
          </label>
          <label className="field"><span>الترجمة تحت الآيات</span>
            <select className="select" value={settings.translation} onChange={(e) => update({ translation: e.target.value as 'none' | 'en-sahih' })}>
              <option value="none">بدون ترجمة</option>
              <option value="en-sahih">English — Saheeh International</option>
            </select>
          </label>
          <label className="field"><span>طريقة العرض الافتراضية عند فتح المصحف</span>
            <select className="select" value={settings.readerMode} onChange={(e) => update({ readerMode: e.target.value as 'flow' | 'mushaf' })}>
              <option value="flow">قراءة متتابعة (آية بآية)</option>
              <option value="mushaf">وضع المصحف (صفحات مصحف المدينة)</option>
            </select>
          </label>
        </div>
      </Sheet>
    </>
  )
}
