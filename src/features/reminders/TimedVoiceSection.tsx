// «أذكار مسموعة» في صفحة التذكيرات: لكل تذكير (الاستيقاظ، الصباح، المساء، النوم، ما بعد الصلاة) وقته وأيامه
// وصوته — جملة قصيرة من الذكر نفسه تُسمع مع الإشعار: تسجيل حصن المسلم، أو صوت الهاتف، أو تسجيلك، أو نغمة —
// مع الاستماع للصوت، وإشعار تجريبي حقيقي، والاهتزاز، وإظهار النص على شاشة القفل، وإعادة الضبط.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Play, RotateCcw, Square } from 'lucide-react'
import { useSettings } from '../../state/SettingsContext'
import { DEFAULT_NOTIFICATIONS, type NotificationSettings, type PrayerKey, type VoiceOpt } from '../../state/settings'
import { platformName, sendTestReminder } from '../../platform'
import { toast } from '../../hooks'
import { getRecording } from '../../services/dhikrAudio'
import { hisnSlotChannel, prepareVoiceChannel, previewSource } from '../../services/timedVoice'
import { heardText, SLOT_DEFS, VOICE_SLOTS, voiceFor, type VoiceSlot } from '../../services/voiceSlots'
import { PRAYER_LABELS } from '../../services/prayer'
import { HISN_AUDIO_CREDIT } from '../../content/hisnAudio'

const DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const PRAYERS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const TIME_KEY: Record<Exclude<VoiceSlot, 'afterPrayer'>, 'morningAdhkar' | 'eveningAdhkar' | 'sleepAdhkar' | 'wakeAdhkar'> = { morning: 'morningAdhkar', evening: 'eveningAdhkar', sleep: 'sleepAdhkar', wake: 'wakeAdhkar' }
const DEF_TIME: Record<Exclude<VoiceSlot, 'afterPrayer'>, string> = { wake: '05:45', morning: '06:30', evening: '17:00', sleep: '22:30' }
const ORDER: VoiceSlot[] = ['wake', 'morning', 'evening', 'sleep', 'afterPrayer']

export function TimedVoiceSection() {
  const { settings, update } = useSettings()
  const n = settings.notifications
  const set = (patch: Partial<NotificationSettings>) => update((s) => ({ notifications: { ...s.notifications, ...patch } }))
  const android = platformName() === 'android'
  const [mine, setMine] = useState<Partial<Record<VoiceSlot, boolean>>>({})
  const [playing, setPlaying] = useState<VoiceSlot | null>(null)
  const [busy, setBusy] = useState<VoiceSlot | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    Promise.all(VOICE_SLOTS.map((s) => getRecording(SLOT_DEFS[s].itemId).catch(() => null)))
      .then((r) => setMine(Object.fromEntries(VOICE_SLOTS.map((s, i) => [s, !!r[i]]))))
  }, [])
  useEffect(() => () => { audio.current?.pause(); try { speechSynthesis.cancel() } catch { /* لا شيء */ } }, [])

  const stop = () => { audio.current?.pause(); audio.current = null; try { speechSynthesis.cancel() } catch { /* لا شيء */ } setPlaying(null) }
  const preview = async (slot: VoiceSlot) => {
    if (playing) { const was = playing; stop(); if (was === slot) return }
    setBusy(slot)
    const src = await previewSource(n, slot).catch(() => null)
    setBusy(null)
    if (!src) { toast(voiceFor(n, slot) === 'tone' ? 'نغمة الإشعار العادية في هاتفك' : 'لا يوجد صوت لهذا الاختيار بعد'); return }
    if ('speak' in src) {
      try {
        const u = new SpeechSynthesisUtterance(src.speak); u.lang = 'ar'; u.rate = 0.85
        u.onend = () => setPlaying(null); speechSynthesis.speak(u); setPlaying(slot)
      } catch { toast('لا يوجد صوت عربي في هذا الجهاز') }
      return
    }
    const el = new Audio(src.url)
    audio.current = el
    const end = () => { if (src.revoke) URL.revokeObjectURL(src.url); if (audio.current === el) { audio.current = null; setPlaying(null) } }
    el.onended = end
    el.onerror = () => { end(); toast('تعذر تشغيل الصوت (معاينة تسجيل حصن المسلم تحتاج الإنترنت؛ الإشعار نفسه لا يحتاجه)') }
    if (src.from) el.currentTime = src.from
    if (src.to) el.ontimeupdate = () => { if (el.currentTime >= src.to!) { el.pause(); end() } }
    el.play().then(() => setPlaying(slot)).catch(() => end())
  }

  const test = async (slot: VoiceSlot) => {
    const d = SLOT_DEFS[slot]
    setBusy(slot)
    const opt = n.adhkarVoice === false ? 'tone' : voiceFor(n, slot)
    const custom = opt === 'device' || opt === 'mine' ? await prepareVoiceChannel(n, slot) : null
    if ((opt === 'device' || opt === 'mine') && !custom && android) toast(opt === 'device' ? 'لا يوجد صوت عربي في الهاتف: سيُستعمل تسجيل حصن المسلم' : 'لم تضف تسجيلًا لهذا الذكر: سيُستعمل تسجيل حصن المسلم')
    const heard = heardText(slot, opt, !!custom)
    await sendTestReminder({ title: d.title, body: heard ? `🔊 ${heard} — ${d.body}` : d.body, route: d.route, channelId: opt === 'tone' ? undefined : custom ?? hisnSlotChannel(n, slot) }).catch(() => null)
    setBusy(null)
    toast(android ? 'سيصل الإشعار التجريبي بعد 5 ثوانٍ — أغلق التطبيق لتجربته' : 'أُرسل إشعار تجريبي')
  }

  const setVoice = (slot: VoiceSlot, v: VoiceOpt) => set({ voices: { ...n.voices, [slot]: v } })
  const days = (slot: Exclude<VoiceSlot, 'afterPrayer'>) => n.adhkarDays?.[slot] ?? []
  const toggleDay = (slot: Exclude<VoiceSlot, 'afterPrayer'>, d: number) => {
    const cur = days(slot).length ? days(slot) : [0, 1, 2, 3, 4, 5, 6]
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()
    set({ adhkarDays: { ...n.adhkarDays, [slot]: next.length === 7 ? [] : next } })
  }
  const ap = n.afterPrayer ?? DEFAULT_NOTIFICATIONS.afterPrayer!
  const reset = () => {
    set({
      voices: {}, morningVoice: 'hisn', eveningVoice: 'device', adhkarDays: {}, vibrate: true, lockText: true, adhkarVoice: true,
      wakeAdhkar: null, morningAdhkar: '06:30', eveningAdhkar: '17:00', sleepAdhkar: null, afterPrayer: DEFAULT_NOTIFICATIONS.afterPrayer,
    })
    toast('أُعيدت تذكيرات الأذكار إلى الإعداد الافتراضي')
  }

  return (
    <section className="card stack" style={{ gap: 10 }} aria-label="أذكار مسموعة">
      <h2 style={{ margin: 0 }}>🔊 الأذكار المسموعة</h2>
      <p className="small muted" style={{ margin: 0 }}>عند موعد كل تذكير يظهر الإشعار ويُسمع معه الذكر نفسه في ثوانٍ، والتطبيق مغلق. اضغط الإشعار لتكمل الأذكار كاملة مع العداد.</p>
      <label className="check">
        <input type="checkbox" className="switch-input" role="switch" checked={n.adhkarVoice !== false} onChange={(e) => set({ adhkarVoice: e.target.checked })} aria-label="ذكر مسموع في الإشعار" />
        <span>الذكر مسموع في الإشعار<span className="small muted"> — بدل النغمة العادية</span></span>
      </label>
      {ORDER.map((slot) => {
        const d = SLOT_DEFS[slot]
        const v = voiceFor(n, slot)
        const on = slot === 'afterPrayer' ? ap.enabled : !!n[TIME_KEY[slot]]
        const options: { id: VoiceOpt; label: string; off?: boolean }[] = [
          { id: 'hisn', label: slot === 'evening' ? 'حصن المسلم: بسم الله الذي لا يضر' : 'حصن المسلم' },
          { id: 'device', label: 'صوت الهاتف', off: !android },
          { id: 'mine', label: 'تسجيلي', off: !mine[slot] },
          { id: 'tone', label: 'نغمة فقط' },
        ]
        return (
          <div key={slot} className="card-inset stack" style={{ gap: 6 }} aria-label={d.label}>
            <div className="spread">
              <label className="check">
                <input type="checkbox" className="switch-input" checked={on} aria-label={`تذكير ${d.label}`}
                  onChange={(e) => slot === 'afterPrayer' ? set({ afterPrayer: { ...ap, enabled: e.target.checked } }) : set({ [TIME_KEY[slot]]: e.target.checked ? (n[TIME_KEY[slot]] || DEF_TIME[slot]) : null } as Partial<NotificationSettings>)} />
                <strong>{d.label}</strong>
              </label>
              {on && slot !== 'afterPrayer' && <input className="input" type="time" style={{ width: 125 }} value={n[TIME_KEY[slot]] ?? ''} aria-label={`وقت ${d.label}`} onChange={(e) => set({ [TIME_KEY[slot]]: e.target.value || null } as Partial<NotificationSettings>)} />}
            </div>
            {on && slot === 'afterPrayer' && (
              <>
                <div className="chips" aria-label="الصلوات">
                  {PRAYERS.map((p) => { const sel = ap.prayers.includes(p); return <button key={p} type="button" aria-pressed={sel} className={'chip' + (sel ? ' active' : '')} onClick={() => set({ afterPrayer: { ...ap, prayers: sel ? ap.prayers.filter((x) => x !== p) : [...ap.prayers, p] } })}>{PRAYER_LABELS[p]}</button> })}
                </div>
                <label className="field" style={{ maxWidth: 220 }}><span>بعد الأذان بـ</span>
                  <select className="select" value={ap.minutes} onChange={(e) => set({ afterPrayer: { ...ap, minutes: Number(e.target.value) } })}>
                    {[5, 10, 15, 20, 25, 30].map((m) => <option key={m} value={m}>{m} دقيقة</option>)}
                  </select>
                </label>
              </>
            )}
            {on && slot !== 'afterPrayer' && (
              <div className="chips" aria-label={`أيام ${d.label}`}>
                {DAYS.map((name, i) => { const sel = !days(slot).length || days(slot).includes(i); return <button key={name} type="button" aria-pressed={sel} className={'chip chip-sm' + (sel ? ' active' : '')} onClick={() => toggleDay(slot, i)}>{name}</button> })}
              </div>
            )}
            {on && n.adhkarVoice !== false && (
              <>
                <div className="chips" role="radiogroup" aria-label={`صوت ${d.label}`}>
                  {options.map((o) => <button key={o.id} type="button" role="radio" aria-checked={v === o.id} disabled={o.off} className={'chip' + (v === o.id ? ' active' : '')} onClick={() => setVoice(slot, o.id)}>{o.label}</button>)}
                </div>
                <p className="small muted" style={{ margin: 0 }}>{v === 'tone' ? 'نغمة الإشعار العادية دون ذكر مسموع.' : `يُسمع: ${heardText(slot, v, v !== 'hisn')}${v === 'device' ? ' — نطق آلي من هاتفك للنص المعتمد، استمع إليه أولًا' : v === 'mine' ? ' — بتسجيلك' : ' — بتسجيل حصن المسلم'}.`}</p>
                {slot === 'evening' && v === 'hisn' && <p className="small muted" style={{ margin: 0 }}>لا يوجد في حصن المسلم تسجيل لـ«أمسينا وأمسى الملك لله»؛ لسماعه اختر صوت الهاتف أو سجّله بصوتك.</p>}
                {!mine[slot] && <p className="small muted" style={{ margin: 0 }}>لتسمعه بصوتك: أضف تسجيلًا لهذا الذكر من <Link to="/adhkar-audio">تسجيلات الأذكار</Link>.</p>}
              </>
            )}
            {on && (
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {n.adhkarVoice !== false && v !== 'tone' && <button className="btn btn-sm" disabled={busy === slot} onClick={() => preview(slot)}>{playing === slot ? <><Square size={14} /> إيقاف</> : <><Play size={14} /> استمع</>}</button>}
                <button className="btn btn-sm" disabled={busy === slot} onClick={() => test(slot)}><BellRing size={14} /> إشعار تجريبي</button>
              </div>
            )}
          </div>
        )
      })}
      <label className="check"><input type="checkbox" className="switch-input" checked={n.vibrate !== false} onChange={(e) => set({ vibrate: e.target.checked })} /> الاهتزاز مع إشعار الذكر</label>
      <label className="check"><input type="checkbox" className="switch-input" checked={n.lockText !== false} onChange={(e) => set({ lockText: e.target.checked })} /> إظهار نص الذكر على شاشة القفل</label>
      <p className="small muted" style={{ margin: 0 }}>{HISN_AUDIO_CREDIT}. الصوت يتبع مستوى صوت الإشعارات في هاتفك، ولا يُسمع في الوضع الصامت أو «عدم الإزعاج». لإيقافه: اسحب الإشعار أو اضغط عليه.</p>
      <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'start' }} onClick={reset}><RotateCcw size={14} /> إعادة ضبط تذكيرات الأذكار</button>
    </section>
  )
}
