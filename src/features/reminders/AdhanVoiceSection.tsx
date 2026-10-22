import { ONLINE_ADHANS, type OnlineAdhan } from '../../content/onlineAdhans'
import { useEffect, useRef, useState } from 'react'
import { Play, Square, Upload, Trash2, Volume2, AlarmClock, Download } from 'lucide-react'
import { useSettings } from '../../state/SettingsContext'
import { toast, useLive } from '../../hooks'
import { ADHAN_VOICES, VOICE_DEVICE, VOICE_SAME, VOICE_TONE } from '../../content/adhanVoices'
import { downloadOnlineAdhan, DEVICE_VOICE_KEY, DEVICE_NATIVE_KEY, loadDeviceNative, loadDeviceVoice, playableUrl, removeDeviceVoice, saveDeviceVoice, validateDeviceFile, type DeviceVoice } from '../../services/adhan'
import { exactAlarmStatus, isNative, platformName, requestExactAlarm } from '../../platform'
import type { NotificationSettings } from '../../state/settings'
import { rescheduleNative } from '../../services/notifications'
import type { DeviceNative } from '../../services/adhan'

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')} دقيقة`
}

/** اختيار صوت المؤذن، وصوت خاص لأذان الفجر، وتجربة الصوت، واستيراد ملف من الجهاز */
export function AdhanVoiceSection() {
  const { settings, update } = useSettings()
  const n = settings.notifications
  const set = (patch: Partial<NotificationSettings>) => update((s) => ({ notifications: { ...s.notifications, ...patch } }))
  const device = useLive(() => loadDeviceVoice(), ['kv:' + DEVICE_VOICE_KEY], null as DeviceVoice | null)
  const native = useLive(() => loadDeviceNative(), ['kv:' + DEVICE_NATIVE_KEY], null as DeviceNative | null)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [exact, setExact] = useState<'granted' | 'denied' | 'unsupported'>('unsupported')
  useEffect(() => { exactAlarmStatus().then(setExact).catch(() => {}) }, [])

  const stopPreview = () => {
    audio.current?.pause()
    if (audio.current?.src.startsWith('blob:')) URL.revokeObjectURL(audio.current.src)
    audio.current = null
    setPlaying(null)
  }
  useEffect(() => () => stopPreview(), [])

  const preview = async (id: string) => {
    if (playing === id) { stopPreview(); return }
    stopPreview()
    const url = await playableUrl(id)
    if (!url) return
    const a = new Audio(url)
    audio.current = a
    a.onended = () => setPlaying(null)
    setPlaying(id)
    a.play().catch(() => { setPlaying(null); toast('تعذر تشغيل الصوت على هذا الجهاز') })
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    const err = validateDeviceFile(f)
    if (err) { toast(err); return }
    setBusy(true)
    try {
      const ok = await saveDeviceVoice(f)
      set({ adhanVoice: VOICE_DEVICE })
      if (isNative()) rescheduleNative({ ...settings, notifications: { ...n, adhanVoice: VOICE_DEVICE } }).catch(() => {})
      toast(!isNative() || ok ? 'أُضيف صوت الأذان من جهازك' : 'أُضيف الصوت للتشغيل داخل التطبيق، وتعذّر ربطه بإشعارات الجهاز')
    } finally {
      setBusy(false)
    }
  }

  const download = async (v: OnlineAdhan) => {
    setBusy(true)
    try {
      const ok = await downloadOnlineAdhan(v)
      set({ adhanVoice: VOICE_DEVICE })
      if (isNative()) rescheduleNative({ ...settings, notifications: { ...n, adhanVoice: VOICE_DEVICE } }).catch(() => {})
      toast(!isNative() || ok ? `نُزّل أذان ${v.name} واختير لتنبيه الصلاة` : 'نُزّل الصوت للتشغيل داخل التطبيق، وتعذّر ربطه بإشعارات الجهاز')
    } catch (e) {
      toast((e as Error).message || 'تعذر تنزيل الأذان — تحقق من الاتصال')
    } finally {
      setBusy(false)
    }
  }

  const options = [
    { id: VOICE_TONE, label: 'نغمة الإشعار فقط', hint: 'بلا أذان — نغمة الجهاز الافتراضية' },
    ...ADHAN_VOICES.map((v) => ({ id: v.id, label: v.name, hint: [v.muezzin, fmtDuration(v.durationSec)].filter(Boolean).join(' • ') })),
    ...(device ? [{ id: VOICE_DEVICE, label: `من جهازي: ${device.name}`, hint: !isNative() ? 'يُشغَّل كاملًا ما دام التطبيق مفتوحًا' : native?.androidChannel ? 'يُرفع عند دخول الوقت حتى والتطبيق مغلق، بمستوى صوت المنبّه' : native?.iosSound ? 'والتطبيق مغلق: أول 30 ثانية (حد iPhone)؛ وكاملًا والتطبيق مفتوح' : 'يُشغَّل داخل التطبيق فقط' }] : []),
  ]
  const fajrOptions = [{ id: VOICE_SAME, label: 'نفس صوت بقية الصلوات' }, ...options]

  return (
    <section className="card" aria-labelledby="adhan-voice-title">
      <h2 id="adhan-voice-title"><Volume2 size={18} /> صوت الأذان</h2>
      <p className="small muted" style={{ marginTop: 0 }}>اختر صوت المؤذن الذي يُرفع عند دخول وقت الصلاة.</p>
      <div className="voice-list" role="radiogroup" aria-label="صوت الأذان">
        {options.map((o) => (
          <div key={o.id} className={'voice-row' + (n.adhanVoice === o.id ? ' selected' : '')}>
            <label>
              <input type="radio" name="adhan-voice" checked={n.adhanVoice === o.id} onChange={() => set({ adhanVoice: o.id })} />
              <span style={{ minWidth: 0 }}>{o.label}<small>{o.hint}</small></span>
            </label>
            {o.id !== VOICE_TONE && (
              <button className="btn btn-ghost btn-sm icon-btn" onClick={() => preview(o.id)} aria-label={`${playing === o.id ? 'إيقاف' : 'تجربة'} ${o.label}`}>
                {playing === o.id ? <Square size={15} /> : <Play size={15} />}
              </button>
            )}
            {o.id === VOICE_DEVICE && (
              <button className="btn btn-ghost btn-sm icon-btn" aria-label="حذف الصوت المستورد" onClick={async () => {
                stopPreview()
                await removeDeviceVoice()
                if (n.adhanVoice === VOICE_DEVICE) set({ adhanVoice: VOICE_TONE })
                if (n.fajrVoice === VOICE_DEVICE) set({ fajrVoice: VOICE_SAME })
              }}><Trash2 size={15} /></button>
            )}
          </div>
        ))}
      </div>
      {ADHAN_VOICES.length === 0 && (
        <p className="alert alert-gold small" style={{ marginTop: 10 }}>
          لم تُدمج أصوات مؤذنين داخل ملف التطبيق. يمكنك تنزيل أذان من القائمة أدناه، أو اختيار ملف أذان من جهازك.
        </p>
      )}
      <div className="stack" style={{ marginTop: 10, gap: 6 }}>
        <strong className="small">أصوات أذان للتنزيل</strong>
        {ONLINE_ADHANS.map((v) => (
          <div key={v.id} className="voice-row">
            <span style={{ flex: 1 }}>أذان {v.name}<small>يُنزَّل على جهازك عند الطلب (نحو دقيقة بحسب الاتصال) — المصدر: {v.source}</small></span>
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => download(v)} aria-label={`تنزيل أذان ${v.name}`}><Download size={15} /> {device?.name === `${v.name}.mp3` ? 'إعادة التنزيل' : 'تنزيل واستخدام'}</button>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={16} /> {device ? 'استبدال ملف الأذان من جهازي' : 'اختيار ملف أذان من جهازي'}</button>
        <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" hidden aria-label="استيراد صوت أذان من الجهاز" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      <label className="field" style={{ marginTop: 12, maxWidth: 420 }}><span>صوت أذان الفجر</span>
        <select className="select" value={n.fajrVoice} onChange={(e) => set({ fajrVoice: e.target.value })}>
          {fajrOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>

      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" className="switch-input" checked={n.adhanInApp} onChange={(e) => set({ adhanInApp: e.target.checked })} />
        تشغيل الأذان كاملًا داخل التطبيق إذا كان مفتوحًا
      </label>

      {platformName() === 'android' && (
        <div className="row" style={{ marginTop: 12 }}>
          <AlarmClock size={16} />
          <span className="small">{exact === 'granted' ? 'التنبيه في الوقت الدقيق: مسموح' : 'التنبيه في الوقت الدقيق غير مسموح، فقد يتأخر الأذان دقائق'}</span>
          {exact !== 'granted' && <button className="btn btn-sm" onClick={async () => setExact(await requestExactAlarm())}>السماح</button>}
        </div>
      )}

      <ul className="small muted" style={{ margin: '0.75rem 0 0', paddingInlineStart: '1.2rem' }}>
        <li>على Android يُرفع الأذان بالصوت المختار (المدمج أو من جهازك) حتى والتطبيق مغلق، ويُوقف بسحب الإشعار. قد تؤخره إعدادات توفير الطاقة في بعض الأجهزة.</li>
        <li>على iPhone يسمح النظام بـ30 ثانية فقط من الصوت في الإشعار، ويُشغَّل الأذان كاملًا إذا كان التطبيق مفتوحًا.</li>
        <li>يعمل الصوت فقط إذا كانت التذكيرات مفعّلة وتذكير «دخول الوقت» مفعّلًا للصلاة.</li>
      </ul>
    </section>
  )
}
