import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellOff, Moon } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { useSettings } from '../../state/SettingsContext'
import { PRAYER_LABELS } from '../../services/prayer'
import { buildSchedule } from '../../services/reminders'
import { isNative, notificationPermission, notificationsSupported, platformName, requestNotificationPermission, showNotification, type NotifPermission } from '../../platform'
import { rescheduleNative } from '../../services/notifications'
import { toast } from '../../hooks'
import { formatTime } from '../../lib/dates'
import type { NotificationSettings } from '../../state/settings'
import { AdhanVoiceSection } from './AdhanVoiceSection'
import { TimedVoiceSection } from './TimedVoiceSection'

type TimedKey = 'ayahOfDay' | 'dhikrOfDay' | 'wird' | 'memorize' | 'occasions' | 'dailySummary'
const TIMED: { key: TimedKey; label: string; hint: string; def: string }[] = [
  { key: 'ayahOfDay', label: 'آية اليوم', hint: '', def: '08:00' },
  { key: 'dhikrOfDay', label: 'ذكر أو دعاء اليوم', hint: '', def: '13:00' },
  { key: 'wird', label: 'ورد القرآن', hint: '', def: '20:00' },
  { key: 'memorize', label: 'الحفظ والمراجعة', hint: '', def: '19:00' },
  { key: 'occasions', label: 'المناسبات الإسلامية', hint: 'مساء اليوم السابق للمناسبة', def: '20:30' },
  { key: 'dailySummary', label: 'ملخص يومي', hint: 'اختياري', def: '21:30' },
]

export function RemindersPage() {
  const { settings, update } = useSettings()
  const n = settings.notifications
  const [perm, setPerm] = useState<NotifPermission>('default')
  useEffect(() => { notificationPermission().then(setPerm).catch(() => setPerm('unsupported')) }, [])
  const set = (patch: Partial<NotificationSettings>) => update((s) => ({ notifications: { ...s.notifications, ...patch } }))
  const preview = useMemo(() => buildSchedule({ ...settings, notifications: { ...n, enabled: true } }, new Date(), 2).slice(0, 8), [settings, n])
  const loc = settings.location

  const enable = async (on: boolean) => {
    if (on) {
      const r = await requestNotificationPermission()
      setPerm(r)
      if (r !== 'granted') { toast('لم يُسمح بالإشعارات. يمكنك تفعيلها من إعدادات الجهاز أو المتصفح.'); return }
    }
    set({ enabled: on })
  }

  return (
    <>
      <PageHead title="التذكيرات والأصوات" subtitle="الأذكار المسموعة ومواقيت الصلاة وكل تذكير بشكل مستقل — بلا إزعاج وبلا تكرار" />
      <div className="stack">
        <section className="card">
          <div className="spread">
            <h2 style={{ margin: 0 }}>{n.enabled ? <Bell size={18} /> : <BellOff size={18} />} التذكيرات</h2>
            <label className="check switch"><input type="checkbox" className="switch-input" checked={n.enabled} onChange={(e) => enable(e.target.checked)} disabled={!notificationsSupported()} aria-label="تفعيل التذكيرات" /> {n.enabled ? 'مفعّلة' : 'متوقفة'}</label>
          </div>
          {!notificationsSupported() && <p className="alert alert-gold small">هذا المتصفح لا يدعم الإشعارات.</p>}
          {perm === 'denied' && <p className="alert alert-error small">الإشعارات محظورة من إعدادات الجهاز أو المتصفح لهذا التطبيق. فعّلها من هناك ثم عد إلى هذه الصفحة.</p>}
          {!loc && <p className="alert alert-gold small">اختر مدينتك أولًا من <Link to="/prayer">مواقيت الصلاة</Link> حتى تُحسب أوقات التذكير.</p>}
          <p className="small muted">
            {isNative()
              ? `على ${platformName() === 'ios' ? 'iPhone' : 'Android'} تُجدول التذكيرات لسبعة أيام قادمة وتُحدَّث كلما فتحت التطبيق. قد تؤخر إعدادات توفير الطاقة بعض الإشعارات دقائق؛ ولا يضمن النظام الدقة المطلقة.`
              : 'في نسخة المتصفح تعمل التذكيرات ما دام التطبيق مفتوحًا (ولو في الخلفية). التذكيرات والتطبيق مغلق تعمل في نسختي Android وiPhone.'}
          </p>
        </section>

        <section className="card" aria-disabled={!n.enabled}>
          <h2>مواقيت الصلاة</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            {(Object.keys(n.perPrayer) as (keyof typeof n.perPrayer)[]).map((p) => (
              <label key={p} className="check"><input type="checkbox" className="switch-input" checked={n.perPrayer[p]} onChange={(e) => set({ perPrayer: { ...n.perPrayer, [p]: e.target.checked } })} /> {PRAYER_LABELS[p]}</label>
            ))}
          </div>
          <div className="grid grid-2" style={{ gap: '0.75rem' }}>
            <label className="check"><input type="checkbox" className="switch-input" checked={n.atAdhan} onChange={(e) => set({ atAdhan: e.target.checked })} /> إشعار عند دخول الوقت</label>
            <label className="field"><span>تنبيه قبل الأذان</span>
              <select className="select" value={n.minutesBefore} onChange={(e) => set({ minutesBefore: Number(e.target.value) })}>
                {[0, 5, 10, 15, 20, 30, 45].map((m) => <option key={m} value={m}>{m === 0 ? 'بدون' : `${m} دقيقة`}</option>)}
              </select>
            </label>
          </div>
        </section>

        <AdhanVoiceSection />

        <TimedVoiceSection />

        <section className="card">
          <h2>تذكيرات يومية</h2>
          <p className="small muted">فعّل ما تحتاجه فقط، واختر الوقت المناسب لك.</p>
          <div className="stack" style={{ gap: 6 }}>
            {TIMED.map((t) => {
              const v = n[t.key]
              return (
                <div key={t.key} className="spread reminder-row">
                  <label className="check" style={{ minWidth: 0 }}>
                    <input type="checkbox" className="switch-input" checked={!!v} onChange={(e) => set({ [t.key]: e.target.checked ? t.def : null } as Partial<NotificationSettings>)} />
                    <span>{t.label}{t.hint && <span className="small muted"> — {t.hint}</span>}</span>
                  </label>
                  {v && <input className="input" type="time" style={{ width: 130 }} value={v} aria-label={`وقت ${t.label}`} onChange={(e) => set({ [t.key]: e.target.value || null } as Partial<NotificationSettings>)} />}
                </div>
              )
            })}
          </div>
          <label className="check" style={{ marginTop: '0.75rem' }}>
            <input type="checkbox" className="switch-input" role="switch" checked={n.adhkarScreen} onChange={(e) => set({ adhkarScreen: e.target.checked })} aria-label="شاشة تنبيه الأذكار بالصوت" />
            <span>شاشة تنبيه الأذكار بالصوت<span className="small muted"> — إذا كان التطبيق مفتوحًا عند وقت الأذكار تظهر شاشة كاملة تقرأ الأذكار كلها: الآيات بصوت القارئ، والأذكار بتسجيل حصن المسلم أو صوت الجهاز</span></span>
          </label>

          <Link className="btn btn-sm" style={{ marginTop: 6, alignSelf: 'start' }} to="/adhkar-alert/morning">تجربة شاشة التنبيه</Link>
        </section>

        <section className="card">
          <h2><Moon size={18} /> الهدوء وتقليل الإشعارات</h2>
          <label className="check"><input type="checkbox" className="switch-input" checked={n.reduce} onChange={(e) => set({ reduce: e.target.checked })} /> تقليل الإشعارات: الصلاة عند دخول الوقت وتذكير الورد فقط</label>
          <label className="check" style={{ marginTop: 8 }}><input type="checkbox" className="switch-input" checked={n.quiet.enabled} onChange={(e) => set({ quiet: { ...n.quiet, enabled: e.target.checked } })} /> فترة هدوء يومية (لا تذكيرات غير الصلاة)</label>
          {n.quiet.enabled && (
            <div className="row" style={{ marginTop: 8 }}>
              <label className="row small">من <input className="input" type="time" style={{ width: 130 }} value={n.quiet.start} onChange={(e) => set({ quiet: { ...n.quiet, start: e.target.value } })} /></label>
              <label className="row small">إلى <input className="input" type="time" style={{ width: 130 }} value={n.quiet.end} onChange={(e) => set({ quiet: { ...n.quiet, end: e.target.value } })} /></label>
            </div>
          )}
        </section>

        <section className="card">
          <h2>التذكيرات القادمة</h2>
          {loc && preview.length ? (
            <ul className="small" style={{ paddingInlineStart: '1.2rem' }}>
              {preview.map((r) => <li key={r.id}><strong>{formatTime(r.at, loc.tz)}</strong> {new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'short', timeZone: loc.tz }).format(r.at)} — {r.title}</li>)}
            </ul>
          ) : <p className="small muted">لا توجد تذكيرات بحسب اختياراتك الحالية.</p>}
          <div className="row">
            <button className="btn btn-sm" disabled={perm !== 'granted'} onClick={() => showNotification('رفيق المسلم', 'هذا إشعار تجريبي — التذكيرات تعمل.', 'test')}>إرسال إشعار تجريبي</button>
            {isNative() && <button className="btn btn-sm" onClick={async () => toast(`جُدول ${await rescheduleNative(settings)} تذكيرًا`)}>إعادة الجدولة الآن</button>}
          </div>
        </section>
      </div>
    </>
  )
}
