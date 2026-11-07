// معاينة الودجتات في «استوديو الودجت»: تحاكي تصميم ودجتات Android نفسها (الخلفية والشكل والشفافية والفاتح
// والعناصر الظاهرة وحجم الخط) بالبيانات الحقيقية للتطبيق: مواقيت مدينتك، وآية اليوم، وأذكار التطبيق ودعاء اليوم.
import type { CSSProperties } from 'react'
import { useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { DEFAULT_WIDGET_PREFS } from '../../state/settings'
import { PRAYER_LABELS, nextPrayer, todayTimes } from '../../services/prayer'
import { formatGregorian, formatHijri, formatTime, dayKey } from '../../lib/dates'
import { ayahOfDay, dhikrOfDay, duaOfDay } from '../../services/daily'
import { ADHKAR } from '../../content/adhkar'
import { cityLabel } from '../../services/cities'
import { toArabicDigits } from '../../lib/arabic'

export type WidgetKind = 'prayer' | 'quran' | 'adhkar' | 'tasbih' | 'dua' | 'all'
export const WIDGET_KINDS: { id: WidgetKind; name: string }[] = [
  { id: 'prayer', name: 'مواقيت الصلاة' }, { id: 'quran', name: 'القرآن' }, { id: 'adhkar', name: 'الأذكار' },
  { id: 'tasbih', name: 'المسبحة' }, { id: 'dua', name: 'دعاء اليوم' }, { id: 'all', name: 'الكل في واحد' },
]
const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const TASBIH: Record<string, string> = { seq: 'سبحان الله', subhan: 'سبحان الله', hamd: 'الحمد لله', akbar: 'الله أكبر', tahlil: 'لا إله إلا الله', istighfar: 'أستغفر الله', salawat: 'اللهم صلِّ على محمد', hawqala: 'لا حول ولا قوة إلا بالله' }

export function WidgetPreview({ kind, bg, clip, alpha, light, size, now }: {
  kind: WidgetKind; bg: string; clip?: string; alpha: number; light: boolean; size: 'S' | 'M' | 'L'; now: Date
}) {
  const { settings } = useSettings()
  const { data } = useQuran()
  const p = { ...DEFAULT_WIDGET_PREFS, ...settings.widgetPrefs }
  const loc = settings.location
  const tz = loc?.tz
  const f = p.font / 100
  const ink = light ? '#1B2F2A' : '#FFFFFF'
  const gold = light ? '#8A6A1F' : '#E3C98F'
  const muted = light ? '#4B5A52' : '#CFC6AE'
  const box: CSSProperties = { position: 'relative', width: '100%', maxWidth: size === 'S' ? 220 : 360, minHeight: size === 'S' ? 96 : size === 'M' ? 170 : 300, borderRadius: 22, padding: '12px 14px', color: ink, overflow: 'hidden', clipPath: clip, textShadow: light ? 'none' : '0 1px 3px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: 6 }
  const back: CSSProperties = { position: 'absolute', inset: 0, background: bg, opacity: alpha / 100, borderRadius: 22, border: `1.5px solid ${light ? '#C9A24A' : 'rgba(227,201,143,.6)'}`, zIndex: 0 }
  const z: CSSProperties = { position: 'relative', zIndex: 1 }
  const pill = (t: string, goldPill = false) => <span style={{ ...z, padding: '3px 12px', borderRadius: 16, fontSize: 12 * f, background: goldPill ? 'linear-gradient(180deg,#F4E3B8,#D5B36F)' : 'rgba(227,201,143,.2)', color: goldPill ? '#10221F' : muted, border: goldPill ? 0 : '1px solid rgba(227,201,143,.6)', textShadow: 'none', fontWeight: goldPill ? 700 : 500 }}>{t}</span>
  const np = loc ? nextPrayer(loc, settings.prayer, now) : null
  const times = loc ? todayTimes(loc, settings.prayer, now) : null
  const left = np ? Math.max(0, Math.floor((np.time.getTime() - now.getTime()) / 1000)) : 0
  const cd = `${String(Math.floor(left / 3600)).padStart(2, '0')}:${String(Math.floor((left % 3600) / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
  const meta = [p.city && loc ? cityLabel(loc) : null, p.hijri ? formatHijri(now, tz, settings.hijriOffset) : null, p.greg ? formatGregorian(now, tz) : null].filter(Boolean).join(' • ')
  const day = dayKey(now, tz)
  const ref = ayahOfDay(day)
  const ayah = data?.verses[ref.surah - 1]?.[ref.ayah - 1]
  const ayahRef = data ? `سورة ${data.meta.surahs[ref.surah - 1].name} • الآية ${toArabicDigits(ref.ayah)}` : ''
  const cells = times && np && (
    <div style={{ ...z, display: 'flex', gap: 4 }}>
      {FIVE.map((k) => { const on = np.name === k; return (
        <span key={k} style={{ flex: 1, textAlign: 'center', borderRadius: 12, padding: '3px 0', background: on ? 'linear-gradient(180deg,#F4E3B8,#D5B36F)' : 'rgba(227,201,143,.1)', border: on ? 0 : '0.6px solid rgba(227,201,143,.3)', color: on || light ? '#10221F' : '#fff', textShadow: on ? 'none' : undefined }}>
          <small style={{ display: 'block', fontSize: 10 * f }}>{PRAYER_LABELS[k]}</small><b style={{ fontSize: 12 * f }}>{formatTime(times[k], tz).replace(/\s*[صم]$/, '')}</b>
        </span>
      ) })}
    </div>
  )
  const nextBlock = np && loc ? (
    <div style={{ ...z, display: 'flex', alignItems: 'center' }}>
      <div style={{ flex: 1 }}><small style={{ color: gold, fontSize: 11 * f }}>الصلاة القادمة</small><div style={{ fontSize: (size === 'S' ? 18 : 21) * f, fontWeight: 700, whiteSpace: 'nowrap' }}>{PRAYER_LABELS[np.name]} {formatTime(np.time, tz)}</div></div>
      {p.countdown && <b dir="ltr" style={{ color: gold, fontSize: 18 * f, fontVariantNumeric: 'tabular-nums' }}>{cd}</b>}
    </div>
  ) : <div style={z}>اختر مدينتك في التطبيق</div>
  const morning = ADHKAR.find((c) => c.id === (p.adhkar === 'auto' ? 'morning' : p.adhkar)) ?? ADHKAR[0]
  const dk = morning.items.find((i) => i.text) ?? morning.items[0]
  const dua = duaOfDay(day)
  const lines = (n: number): CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden' })
  const textN = size === 'S' ? 2 : size === 'M' ? 4 : 8
  let body
  if (kind === 'prayer') body = <>{nextBlock}{meta && <small style={{ ...z, color: muted }}>{meta}</small>}{size !== 'S' && cells}</>
  else if (kind === 'quran') body = <><small style={{ ...z, color: gold }}>آية اليوم</small><div style={{ ...z, ...lines(textN), flex: 1, textAlign: 'center', fontFamily: "'Amiri Quran','Amiri',serif", fontSize: 17 * f, lineHeight: 1.8 }}>﴿{ayah ?? '…'}﴾</div><small style={{ ...z, color: gold, textAlign: 'center' }}>{ayahRef}</small>{size !== 'S' && <div style={{ ...z, display: 'flex', gap: 8, justifyContent: 'center' }}>{pill('آية أخرى')}{pill('تابع القراءة', true)}</div>}</>
  else if (kind === 'adhkar') body = <><div style={{ ...z, display: 'flex' }}><b style={{ flex: 1, color: gold, fontSize: 13 * f }}>{morning.title} ١/{toArabicDigits(morning.items.length)}</b>{size !== 'S' && pill('تبديل')}</div><div style={{ ...z, ...lines(textN), flex: 1, textAlign: 'center', fontSize: 15 * f, lineHeight: 1.7 }}>{dk.text}</div>{size !== 'S' && <small style={{ ...z, color: muted, textAlign: 'center', ...lines(1) }}>{dk.source}</small>}<div style={{ ...z, display: 'flex', alignItems: 'center' }}>{pill('التالي')}<b style={{ flex: 1, textAlign: 'center', color: gold, fontSize: 18 * f }}>٠ / {toArabicDigits(dk.count ?? 1)}</b>{pill('+١', true)}</div></>
  else if (kind === 'tasbih') body = <div style={{ ...z, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><b style={{ color: gold, fontSize: 16 * f }}>{TASBIH[p.tasbih] ?? 'سبحان الله'}</b><b style={{ fontSize: 34 * f }}>٠ / {p.tasbih === 'seq' ? '٣٣' : '١٠٠'}</b><small style={{ color: muted }}>المجموع ٠</small>{pill('تصفير')}</div>
  else if (kind === 'dua') body = <><b style={{ ...z, color: gold, fontSize: 13 * f }}>دعاء اليوم</b><div style={{ ...z, ...lines(textN), flex: 1, textAlign: 'center', fontSize: 15 * f, lineHeight: 1.7 }}>{dua.text}</div><small style={{ ...z, color: muted, textAlign: 'center', ...lines(1) }}>{dua.source}</small>{size !== 'S' && <div style={{ ...z, display: 'flex', gap: 8, justifyContent: 'center' }}>{pill('نسخ')}{pill('مشاركة', true)}{pill('دعاء آخر')}</div>}</>
  else body = <>{nextBlock}{meta && <small style={{ ...z, color: muted }}>{meta}</small>}{size !== 'S' && cells}{size === 'L' && ayah && <><div style={{ ...z, ...lines(3), textAlign: 'center', fontFamily: "'Amiri Quran','Amiri',serif", fontSize: 15 * f, lineHeight: 1.8 }}>﴿{ayah}﴾</div><small style={{ ...z, color: gold, textAlign: 'center' }}>{ayahRef}</small><small style={{ ...z, textAlign: 'center', ...lines(2) }}>ذكر اليوم: {dhikrOfDay(day).item.text}</small></>}{size !== 'S' && <div style={{ ...z, display: 'flex', gap: 6 }}>{['القرآن', 'الأذكار', 'القبلة', 'المسبحة'].map((t) => <span key={t} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{pill(t)}</span>)}</div>}</>
  return <div className="wd-live" style={box} aria-label={`معاينة ودجت ${WIDGET_KINDS.find((k) => k.id === kind)?.name}`}><div style={back} />{body}</div>
}
