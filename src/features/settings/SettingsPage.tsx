import { useEffect, useRef, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Download, Upload, Trash2, Bell } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { CityPicker } from '../../components/CityPicker'
import { useSettings } from '../../state/SettingsContext'
import { METHODS, PRAYER_LABELS, PRAYERS, suggestMethod, type MethodId, type PrayerName } from '../../services/prayer'
import { cityLabel } from '../../services/cities'
import { exportAll, importAll, clearAll } from '../../db/backup'
import { notificationsSupported, requestNotificationPermission, showNotification } from '../../platform'
import { toast, useQuran } from '../../hooks'
import { RECITERS } from '../../content/reciters'
import { TAFSIR_EDITIONS } from '../../services/tafsir'
import { formatHijri } from '../../lib/dates'
import { activeSyncAdapter } from '../../sync/sync'

export function SettingsPage() {
  const { settings, update } = useSettings()
  const { data: quran } = useQuran()
  const { hash } = useLocation()
  const [showCity, setShowCity] = useState(!settings.location)
  const fileRef = useRef<HTMLInputElement>(null)
  const [perm, setPerm] = useState<string>(notificationsSupported() ? Notification.permission : 'unsupported')
  const [usage, setUsage] = useState<string | null>(null)

  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView() }, [hash])
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage(`${((e.usage ?? 0) / 1048576).toFixed(1)} م.ب مستخدمة`)).catch(() => {})
  }, [])

  const setAdj = (p: PrayerName, v: number) => update((s) => ({ prayer: { ...s.prayer, adjustments: { ...s.prayer.adjustments, [p]: v } } }))

  const doExport = async () => {
    const b = await exportAll()
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rafiq-almuslim-backup-${b.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('صُدّرت النسخة الاحتياطية')
  }
  const doImport = async (f: File) => {
    try {
      const json = JSON.parse(await f.text())
      if (!confirm('ستُستبدل بياناتك الحالية بمحتوى النسخة الاحتياطية. متابعة؟')) return
      await importAll(json)
      toast('اكتملت الاستعادة — سيُعاد تحميل التطبيق')
      setTimeout(() => location.reload(), 800)
    } catch (e) {
      toast((e as Error).message || 'ملف غير صالح')
    }
  }

  return (
    <>
      <PageHead title="الإعدادات" />
      <div className="stack">
        <section className="card" id="location">
          <h2>المدينة والموقع</h2>
          {settings.location && <p>{cityLabel(settings.location)} <span className="muted small" dir="ltr">({settings.location.lat}, {settings.location.lng} • {settings.location.tz})</span></p>}
          {showCity ? <CityPicker onDone={() => setShowCity(false)} /> : <button className="btn" onClick={() => setShowCity(true)}>تغيير المدينة</button>}
        </section>

        <section className="card" id="prayer">
          <h2>حساب مواقيت الصلاة</h2>
          <div className="grid grid-2" style={{ gap: '0.75rem' }}>
            <label className="field"><span>طريقة الحساب</span>
              <select className="select" value={settings.prayer.method} onChange={(e) => update((s) => ({ prayer: { ...s.prayer, method: e.target.value as MethodId } }))}>
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label} — {m.detail}</option>)}
              </select>
            </label>
            <label className="field"><span>حساب العصر</span>
              <select className="select" value={settings.prayer.madhab} onChange={(e) => update((s) => ({ prayer: { ...s.prayer, madhab: e.target.value as 'shafi' | 'hanafi' } }))}>
                <option value="shafi">الجمهور: الشافعي والمالكي والحنبلي (ظل المثل)</option>
                <option value="hanafi">الحنفي (ظل المثلين)</option>
              </select>
            </label>
            <label className="field"><span>خطوط العرض العليا</span>
              <select className="select" value={settings.prayer.highLat} onChange={(e) => update((s) => ({ prayer: { ...s.prayer, highLat: e.target.value as typeof s.prayer.highLat } }))}>
                <option value="auto">تلقائي (حسب خط العرض)</option>
                <option value="middleofthenight">منتصف الليل</option>
                <option value="seventhofthenight">سُبع الليل</option>
                <option value="twilightangle">زاوية الشفق</option>
              </select>
            </label>
          </div>
          {settings.location && suggestMethod(settings.location.country) !== settings.prayer.method && (
            <p className="small muted">الطريقة الشائعة في {cityLabel(settings.location).split('، ').pop()}: {METHODS.find((m) => m.id === suggestMethod(settings.location!.country))?.label}. <button className="btn btn-ghost btn-sm" onClick={() => update((s) => ({ prayer: { ...s.prayer, method: suggestMethod(s.location!.country) } }))}>استخدمها</button></p>
          )}
          <h3 style={{ marginTop: '1rem' }}>تعديل يدوي بالدقائق (لمطابقة التقويم المحلي المعتمد)</h3>
          <div className="grid grid-3" style={{ gap: '0.5rem' }}>
            {PRAYERS.map((p) => (
              <label key={p} className="field"><span>{PRAYER_LABELS[p]}</span>
                <input className="input" type="number" min={-30} max={30} value={settings.prayer.adjustments[p]} onChange={(e) => setAdj(p, Math.max(-30, Math.min(30, Number(e.target.value) || 0)))} />
              </label>
            ))}
          </div>
          <label className="field" style={{ maxWidth: 360, marginTop: '1rem' }}><span>تعديل التاريخ الهجري (حسب رؤية الهلال المحلية) — اليوم: {formatHijri(new Date(), settings.location?.tz, settings.hijriOffset)}</span>
            <select className="select" value={settings.hijriOffset} onChange={(e) => update({ hijriOffset: Number(e.target.value) })}>
              {[-2, -1, 0, 1, 2].map((n) => <option key={n} value={n}>{n > 0 ? `+${n}` : n} يوم</option>)}
            </select>
          </label>
        </section>

        <section className="card" id="notifications">
          <h2><Bell size={18} /> التنبيهات</h2>
          {perm === 'unsupported' ? <p className="alert alert-gold small">المتصفح لا يدعم الإشعارات.</p> : (
            <>
              <label className="check"><input type="checkbox" checked={settings.notifications.enabled} onChange={async (e) => {
                if (e.target.checked) {
                  const r = await requestNotificationPermission()
                  setPerm(r)
                  if (r !== 'granted') { toast('لم يُسمح بالإشعارات من المتصفح'); return }
                }
                update((s) => ({ notifications: { ...s.notifications, enabled: e.target.checked } }))
              }} /> تفعيل تنبيهات الصلاة والأذكار</label>
              {perm === 'denied' && <p className="alert alert-error small">الإشعارات محظورة في إعدادات المتصفح لهذا الموقع.</p>}
              <div className="row" style={{ margin: '0.75rem 0' }}>
                {(Object.keys(settings.notifications.perPrayer) as (keyof typeof settings.notifications.perPrayer)[]).map((p) => (
                  <label key={p} className="check"><input type="checkbox" checked={settings.notifications.perPrayer[p]} onChange={(e) => update((s) => ({ notifications: { ...s.notifications, perPrayer: { ...s.notifications.perPrayer, [p]: e.target.checked } } }))} /> {PRAYER_LABELS[p]}</label>
                ))}
              </div>
              <div className="grid grid-3" style={{ gap: '0.75rem' }}>
                <label className="field"><span>التنبيه قبل الوقت بـ (دقيقة)</span>
                  <select className="select" value={settings.notifications.minutesBefore} onChange={(e) => update((s) => ({ notifications: { ...s.notifications, minutesBefore: Number(e.target.value) } }))}>
                    {[0, 5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n === 0 ? 'عند دخول الوقت' : n}</option>)}
                  </select>
                </label>
                <label className="field"><span>تذكير أذكار الصباح</span><input className="input" type="time" value={settings.notifications.morningAdhkar ?? ''} onChange={(e) => update((s) => ({ notifications: { ...s.notifications, morningAdhkar: e.target.value || null } }))} /></label>
                <label className="field"><span>تذكير أذكار المساء</span><input className="input" type="time" value={settings.notifications.eveningAdhkar ?? ''} onChange={(e) => update((s) => ({ notifications: { ...s.notifications, eveningAdhkar: e.target.value || null } }))} /></label>
              </div>
              <div className="row" style={{ marginTop: '0.75rem' }}>
                <button className="btn btn-sm" disabled={perm !== 'granted'} onClick={() => showNotification('رفيق المسلم', 'هذا إشعار تجريبي — التنبيهات تعمل.', 'test')}>إرسال إشعار تجريبي</button>
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>في نسخة الكمبيوتر تعمل التنبيهات ما دام التطبيق مفتوحًا (ولو في الخلفية). التنبيهات المجدولة والتطبيق مغلق ستتوفر في نسختي Android وiPhone.</p>
            </>
          )}
        </section>

        <section className="card">
          <h2>القراءة والمظهر</h2>
          <div className="grid grid-2" style={{ gap: '0.75rem' }}>
            <label className="field"><span>المظهر</span>
              <select className="select" value={settings.theme} onChange={(e) => update({ theme: e.target.value as typeof settings.theme })}>
                <option value="system">حسب النظام</option><option value="light">فاتح</option><option value="dark">داكن (ليلي)</option>
              </select>
            </label>
            <label className="field"><span>اللغة</span>
              <select className="select" value={settings.lang} onChange={(e) => update({ lang: e.target.value as 'ar' | 'en' })}>
                <option value="ar">العربية</option><option value="en">English (القوائم فقط حاليًا — تجريبي)</option>
              </select>
            </label>
            <label className="field"><span>حجم خط الواجهة ({Math.round(settings.uiScale * 100)}%)</span>
              <input type="range" min={0.85} max={1.3} step={0.05} value={settings.uiScale} onChange={(e) => update({ uiScale: Number(e.target.value) })} />
            </label>
            <label className="field"><span>حجم خط المصحف ({settings.quranFontSize}px)</span>
              <input type="range" min={18} max={56} step={2} value={settings.quranFontSize} onChange={(e) => update({ quranFontSize: Number(e.target.value) })} />
            </label>
            <label className="field"><span>القارئ المفضل</span>
              <select className="select" value={settings.reciterId} onChange={(e) => update({ reciterId: e.target.value })}>
                {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.style}</option>)}
              </select>
            </label>
            <label className="field"><span>التفسير الافتراضي</span>
              <select className="select" value={settings.tafsir} onChange={(e) => update({ tafsir: e.target.value })}>
                {TAFSIR_EDITIONS.filter((t) => t.kind === 'tafsir').map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
            </label>
          </div>
          {quran && <p className="quran-text" style={{ marginTop: '0.75rem' }} aria-label="معاينة خط المصحف">{quran.verses[0][1]} <span className="ayah-num">٢</span></p>}
          <label className="check"><input type="checkbox" checked={settings.showFooterDedication} onChange={(e) => update({ showFooterDedication: e.target.checked })} /> إظهار سطر الإهداء أسفل الصفحات</label>
        </section>

        <section className="card" id="data">
          <h2>إدارة البيانات</h2>
          <p className="small muted">كل بياناتك (العلامات، الملاحظات، الحفظ، السجلات، الإعدادات) محفوظة على هذا الجهاز فقط{usage ? ` — ${usage}` : ''}. المزامنة: {activeSyncAdapter().label}.</p>
          <div className="row">
            <button className="btn" onClick={doExport}><Download size={16} /> تصدير نسخة احتياطية</button>
            <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={16} /> استعادة من ملف</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = '' }} />
            <button className="btn btn-danger" onClick={async () => { if (confirm('حذف كل بياناتك المحلية نهائيًا؟ يُنصح بتصدير نسخة احتياطية أولًا.')) { await clearAll(); toast('حُذفت البيانات'); setTimeout(() => location.reload(), 600) } }}><Trash2 size={16} /> حذف كل البيانات</button>
          </div>
        </section>

        <section className="card" id="privacy">
          <h2>الخصوصية</h2>
          <ul className="small">
            <li>لا حسابات، ولا تتبّع، ولا إعلانات، ولا أدوات تحليل.</li>
            <li>الموقع يُطلب فقط عند ضغطك «استخدم موقعي الحالي»، ويُحفظ على جهازك.</li>
            <li>الاتصالات الخارجية: ملفات التلاوة من everyayah.com، والتفسير من مستودع tafsir_api (jsDelivr / GitHub) عند طلبك فقط.</li>
          </ul>
        </section>

        <section className="card">
          <h2>مصادر المحتوى</h2>
          <ul className="small">
            <li>نص القرآن: الرسم العثماني برواية حفص — موسوعة القرآن الكريم (QuranEnc) عبر حزمة quran-json 3.1.2، متحقق من اكتماله (114 سورة، 6236 آية).</li>
            <li>الأجزاء والأحزاب والصفحات: حزمة quran-meta (مصحف المدينة 604 صفحات).</li>
            <li>المواقيت: مكتبة adhan. المدن: GeoNames. التقويم الهجري: أم القرى (مدمج في المتصفح).</li>
            <li>الأذكار والأدعية: مختارة من «حصن المسلم» مع التخريج، والآيات من المصحف المعتمد.</li>
            <li>التفسير: التفسير الميسر وغيره عبر tafsir_api. التلاوات: EveryAyah.</li>
          </ul>
          <Link to="/about" className="small">التفاصيل في صفحة «عن التطبيق»</Link>
        </section>
      </div>
    </>
  )
}
