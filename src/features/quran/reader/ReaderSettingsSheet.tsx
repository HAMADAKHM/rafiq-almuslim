import { Sheet } from '../../../components/Sheet'
import { useQuran } from '../../../hooks'
import { useSettings } from '../../../state/SettingsContext'
import { QURAN_FONTS, type ReaderBg, type ReaderMode } from '../../../state/settings'

const SIZES = [{ label: 'A', size: 24 }, { label: 'A', size: 30 }, { label: 'A', size: 36 }, { label: 'A', size: 44 }]
const BGS: { id: ReaderBg; label: string }[] = [
  { id: 'cream', label: 'فاتحة' },
  { id: 'ivory', label: 'عاجية' },
  { id: 'white', label: 'بيضاء' },
  { id: 'sepia', label: 'ورقية' },
  { id: 'green', label: 'خضراء' },
  { id: 'night', label: 'داكنة' },
]
const MODES: { id: ReaderMode; label: string; hint: string }[] = [
  { id: 'flow', label: 'متتابعة', hint: 'السورة كاملة متصلة' },
  { id: 'mushaf', label: 'صفحات المصحف', hint: '604 صفحات' },
  { id: 'focus', label: 'التركيز', hint: 'آية واحدة في الشاشة' },
]

/** إعدادات القراءة: كل خيار يُطبَّق فورًا ويُحفظ ويتذكره التطبيق في المرة القادمة */
export function ReaderSettingsSheet({ open, onClose, onModeChange }: { open: boolean; onClose: () => void; onModeChange?: (m: ReaderMode) => void }) {
  const { settings, update } = useSettings()
  const { data } = useQuran()
  const sample = data?.verses[0][0] ?? ''
  return (
    <Sheet open={open} onClose={onClose} title="إعدادات القراءة">
      <div className="rs-section">
        <div className="rs-label">طريقة العرض</div>
        <div className="seg" role="radiogroup" aria-label="طريقة العرض">
          {MODES.map((m) => (
            <button key={m.id} role="radio" aria-checked={settings.readerMode === m.id} className="seg-btn" onClick={() => { update({ readerMode: m.id }); onModeChange?.(m.id) }}>
              <strong>{m.label}</strong><small>{m.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="rs-section">
        <div className="rs-label">حجم الخط</div>
        <div className="size-row" role="radiogroup" aria-label="حجم الخط">
          {SIZES.map((s, i) => (
            <button key={s.size} role="radio" aria-checked={settings.quranFontSize === s.size} aria-label={['صغير', 'متوسط', 'كبير', 'كبير جدًا'][i]} className="size-btn" style={{ fontSize: 14 + i * 4 }} onClick={() => update({ quranFontSize: s.size })}>{s.label}</button>
          ))}
        </div>
        <input type="range" min={18} max={56} step={2} value={settings.quranFontSize} onChange={(e) => update({ quranFontSize: Number(e.target.value) })} aria-label="حجم الخط بدقة" style={{ width: '100%', marginTop: 6 }} />
      </div>

      <div className="rs-section">
        <div className="rs-label">نوع الخط</div>
        <div className="font-row" role="radiogroup" aria-label="نوع الخط">
          {QURAN_FONTS.map((f) => (
            <button key={f.id} role="radio" aria-checked={settings.quranFont === f.id} className="font-btn" onClick={() => update({ quranFont: f.id })}>
              <span className="font-sample" style={{ fontFamily: f.family }}>{sample}</span>
              <small>{f.label}</small>
            </button>
          ))}
        </div>
        <p className="small muted" style={{ margin: '4px 0 0' }}>كل الخطوط تعرض النص نفسه من المصحف المعتمد دون تغيير.</p>
      </div>

      <div className="rs-section">
        <div className="rs-label">خلفية القراءة</div>
        <div className="swatch-row" role="radiogroup" aria-label="خلفية القراءة">
          {BGS.map((b) => (
            <button key={b.id} role="radio" aria-checked={settings.readerBg === b.id} className={`swatch reader-bg-${b.id}`} onClick={() => update({ readerBg: b.id })}>
              <span className="swatch-chip" /><small>{b.label}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="rs-section">
        <label className="toggle-row"><span>إطار المصحف الزخرفي</span>
          <input type="checkbox" role="switch" checked={settings.readerFrame === 'classic'} onChange={(e) => update({ readerFrame: e.target.checked ? 'classic' : 'plain' })} />
        </label>
        <label className="toggle-row"><span>الترجمة الإنجليزية تحت الآيات</span>
          <input type="checkbox" role="switch" checked={settings.translation !== 'none'} onChange={(e) => update({ translation: e.target.checked ? 'en-sahih' : 'none' })} />
        </label>
        <label className="toggle-row"><span>إبقاء الشاشة مضاءة أثناء القراءة</span>
          <input type="checkbox" role="switch" checked={settings.keepAwake} onChange={(e) => update({ keepAwake: e.target.checked })} />
        </label>
      </div>
    </Sheet>
  )
}
