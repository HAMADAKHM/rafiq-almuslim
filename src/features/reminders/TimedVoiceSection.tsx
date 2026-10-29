// «الذكر المسموع في الإشعار»: لكل من الصباح والمساء من يقرأ الذكر نفسه عند وصول التذكير،
// مع معاينة الصوت داخل التطبيق، وإشعار تجريبي حقيقي بعد ثوانٍ على القناة نفسها.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Play, Square } from 'lucide-react'
import { useSettings } from '../../state/SettingsContext'
import type { NotificationSettings, TimedVoice } from '../../state/settings'
import { platformName, sendTestReminder } from '../../platform'
import { toast } from '../../hooks'
import { getRecording } from '../../services/dhikrAudio'
import { hisnSlotChannel, prepareVoiceChannel, previewSource, SLOT_DHIKR, voiceChoice, voiceLabel, type VoiceSlot } from '../../services/timedVoice'
import { timedHeard } from '../../services/reminders'
import { HISN_AUDIO_CREDIT } from '../../content/hisnAudio'

const SLOTS: { slot: VoiceSlot; label: string; key: 'morningVoice' | 'eveningVoice'; title: string; body: string; route: string }[] = [
  { slot: 'morning', label: 'أذكار الصباح', key: 'morningVoice', title: 'حان وقت أذكار الصباح 🌅', body: 'ابدأ يومك بذكر الله', route: '/adhkar-alert/morning' },
  { slot: 'evening', label: 'أذكار المساء', key: 'eveningVoice', title: 'حان وقت أذكار المساء 🌇', body: 'حان وقت ذكر الله في المساء', route: '/adhkar-alert/evening' },
]

export function TimedVoiceSection() {
  const { settings, update } = useSettings()
  const n = settings.notifications
  const set = (patch: Partial<NotificationSettings>) => update((s) => ({ notifications: { ...s.notifications, ...patch } }))
  const android = platformName() === 'android'
  const [mine, setMine] = useState<Record<VoiceSlot, boolean>>({ morning: false, evening: false })
  const [playing, setPlaying] = useState<VoiceSlot | null>(null)
  const [busy, setBusy] = useState<VoiceSlot | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    Promise.all((['morning', 'evening'] as VoiceSlot[]).map((s) => getRecording(SLOT_DHIKR[s].itemId).catch(() => null)))
      .then(([m, e]) => setMine({ morning: !!m, evening: !!e }))
  }, [])
  useEffect(() => () => { audio.current?.pause(); speechSynthesis?.cancel?.() }, [])

  const stop = () => { audio.current?.pause(); audio.current = null; try { speechSynthesis.cancel() } catch { /* لا شيء */ } setPlaying(null) }
  const preview = async (slot: VoiceSlot) => {
    if (playing) { const was = playing; stop(); if (was === slot) return }
    setBusy(slot)
    const src = await previewSource(n, slot).catch(() => null)
    setBusy(null)
    if (!src) { toast('لا يوجد صوت لهذا الاختيار بعد'); return }
    if ('speak' in src) {
      // في المتصفح: صوت المتصفح العربي للمعاينة فقط
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
    el.onerror = () => { end(); toast('تعذر تشغيل الصوت (تسجيل حصن المسلم يحتاج اتصالًا بالإنترنت للمعاينة فقط)') }
    if (src.from) el.currentTime = src.from
    if (src.to) el.ontimeupdate = () => { if (el.currentTime >= src.to!) { el.pause(); end() } }
    el.play().then(() => setPlaying(slot)).catch(() => end())
  }

  const test = async (s: typeof SLOTS[number]) => {
    setBusy(s.slot)
    const custom = n.adhkarVoice !== false ? await prepareVoiceChannel(n, s.slot) : null
    const v = voiceChoice(n, s.slot)
    if (n.adhkarVoice !== false && v !== 'hisn' && !custom && android) toast(v === 'device' ? 'لا يوجد صوت عربي في الهاتف: سيُستعمل تسجيل حصن المسلم' : 'لم تضف تسجيلًا لهذا الذكر: سيُستعمل تسجيل حصن المسلم')
    const channelId = n.adhkarVoice === false ? undefined : custom ?? hisnSlotChannel(s.slot)
    const heard = n.adhkarVoice === false ? '' : timedHeard(s.slot, !!custom)
    await sendTestReminder({ title: s.title, body: heard ? `🔊 ${heard} — ${s.body}` : s.body, route: s.route, channelId }).catch(() => null)
    setBusy(null)
    toast(android ? 'سيصل الإشعار التجريبي بعد 5 ثوانٍ — يمكنك إغلاق التطبيق لتجربته' : 'أُرسل إشعار تجريبي')
  }

  return (
    <div className="stack" style={{ gap: 10, marginTop: '0.75rem' }} aria-label="الذكر المسموع في الإشعار">
      <label className="check">
        <input type="checkbox" className="switch-input" role="switch" checked={n.adhkarVoice !== false} onChange={(e) => set({ adhkarVoice: e.target.checked })} aria-label="ذكر مسموع في الإشعار" />
        <span>الذكر مسموع في الإشعار 🔊<span className="small muted"> — بدل النغمة يُسمع الذكر نفسه عند وصول التذكير، والتطبيق مغلق</span></span>
      </label>
      {n.adhkarVoice !== false && SLOTS.map((s) => {
        const v = voiceChoice(n, s.slot)
        const options: { id: TimedVoice; label: string; off?: boolean }[] = [
          { id: 'hisn', label: s.slot === 'morning' ? 'حصن المسلم (بشري)' : 'حصن المسلم: بسم الله الذي لا يضر' },
          { id: 'device', label: 'صوت الهاتف العربي', off: !android },
          { id: 'mine', label: 'تسجيلي', off: !mine[s.slot] },
        ]
        return (
          <div key={s.slot} className="card-inset stack" style={{ gap: 6 }}>
            <strong>{s.label}{(s.slot === 'morning' ? n.morningAdhkar : n.eveningAdhkar) ? '' : <span className="small muted"> — التذكير متوقف (فعّله من الأعلى)</span>}</strong>
            <div className="chips" role="radiogroup" aria-label={`صوت ${s.label}`}>
              {options.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={v === o.id} disabled={o.off} className={'chip' + (v === o.id ? ' active' : '')} onClick={() => set({ [s.key]: o.id } as Partial<NotificationSettings>)}>{o.label}</button>
              ))}
            </div>
            <p className="small muted" style={{ margin: 0 }}>يُسمع: {voiceLabel(s.slot, v)}.</p>
            {s.slot === 'evening' && v === 'hisn' && <p className="small muted" style={{ margin: 0 }}>لا يوجد في حصن المسلم تسجيل لـ«أمسينا وأمسى الملك لله»؛ لسماعه اختر صوت الهاتف أو سجّله بصوتك.</p>}
            {v === 'device' && <p className="small muted" style={{ margin: 0 }}>نطق آلي من محرك الكلام في هاتفك للنص المعتمد كما هو — استمع إليه أولًا، وجودته تختلف بين الأجهزة.</p>}
            {!mine[s.slot] && <p className="small muted" style={{ margin: 0 }}>لتسمعه بصوتك أو بصوت تملك حق استخدامه: أضف تسجيلًا لذكر {s.slot === 'morning' ? '«أصبحنا وأصبح الملك لله»' : '«أمسينا وأمسى الملك لله»'} من <Link to="/adhkar-audio">تسجيلات الأذكار</Link>.</p>}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-sm" disabled={busy === s.slot} onClick={() => preview(s.slot)}>{playing === s.slot ? <><Square size={14} /> إيقاف</> : <><Play size={14} /> استمع</>}</button>
              <button className="btn btn-sm" disabled={busy === s.slot} onClick={() => test(s)}><BellRing size={14} /> إشعار تجريبي</button>
            </div>
          </div>
        )
      })}
      {n.adhkarVoice !== false && <p className="small muted" style={{ margin: 0 }}>النوم: «باسمك ربي وضعت جنبي…» بتسجيل حصن المسلم. {HISN_AUDIO_CREDIT}. الصوت يتبع مستوى صوت الإشعارات في الهاتف، ولا يُسمع في الوضع الصامت أو «عدم الإزعاج». لإيقافه: اسحب الإشعار أو اضغط عليه.</p>}
    </div>
  )
}
