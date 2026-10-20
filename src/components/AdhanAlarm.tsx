import { useEffect, useRef, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { useLive, useNow } from '../hooks'
import { useSettings } from '../state/SettingsContext'
import { PRAYER_LABELS, todayTimes } from '../services/prayer'
import { DEVICE_NATIVE_KEY, loadDeviceNative, playableUrl, voiceIdFor, type DeviceNative } from '../services/adhan'
import { VOICE_DEVICE, VOICE_TONE, voiceById } from '../content/adhanVoices'
import { isNative } from '../platform'
import { dayKey } from '../lib/dates'
import type { PrayerKey } from '../state/settings'

const FIVE: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
/** نافذة بدء الأذان بعد دخول الوقت (إن فُتح التطبيق متأخرًا لا يُشغَّل أذان قديم) */
const WINDOW_MS = 90_000

function playedKey(day: string, p: PrayerKey) { return `adhan-played:${day}:${p}` }
function wasPlayed(k: string) { try { return !!sessionStorage.getItem(k) } catch { return false } }
function markPlayed(k: string) { try { sessionStorage.setItem(k, '1') } catch { /* اختياري */ } }

/**
 * يشغّل الأذان كاملًا داخل التطبيق عند دخول وقت الصلاة ما دام التطبيق مفتوحًا.
 * على الهاتف مع صوت مدمج يتولى نظام الإشعارات تشغيل الأذان، فلا يُكرر هنا.
 */
export function AdhanAlarm() {
  const { settings } = useSettings()
  const now = useNow(1000)
  const [active, setActive] = useState<{ prayer: PrayerKey; voice: string; blocked: boolean } | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const n = settings.notifications
  const loc = settings.location
  const native = useLive(() => loadDeviceNative(), ['kv:' + DEVICE_NATIVE_KEY], null as DeviceNative | null)

  const stop = () => {
    audio.current?.pause()
    audio.current = null
    if (urlRef.current?.startsWith('blob:')) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setActive(null)
  }
  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const start = async (prayer: PrayerKey, voice: string) => {
    const url = await playableUrl(voice)
    if (!url) return
    urlRef.current = url
    const a = new Audio(url)
    audio.current = a
    a.onended = () => stop()
    setActive({ prayer, voice, blocked: false })
    // المتصفح قد يمنع التشغيل التلقائي دون تفاعل سابق: نعرض زر التشغيل حينها
    a.play().catch(() => setActive({ prayer, voice, blocked: true }))
  }

  useEffect(() => {
    if (!loc || !n.atAdhan || !n.adhanInApp || active) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    const times = todayTimes(loc, settings.prayer, now)
    const day = dayKey(now, loc.tz)
    for (const p of FIVE) {
      if (!n.perPrayer[p]) continue
      const diff = now.getTime() - times[p].getTime()
      if (diff < 0 || diff > WINDOW_MS) continue
      const k = playedKey(day, p)
      if (wasPlayed(k)) continue
      const voice = voiceIdFor(settings, p)
      if (voice === VOICE_TONE) continue
      // على الهاتف يرفع نظام الإشعارات الأذان بنفسه إن كان الصوت مثبّتًا فيه
      if (isNative() && (voice !== VOICE_DEVICE || native?.androidChannel || native?.iosSound)) continue
      markPlayed(k)
      start(p, voice)
      break
    }
  }, [now]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null
  const v = voiceById(active.voice)
  return (
    <div className="adhan-alarm" role="alertdialog" aria-label="الأذان" aria-live="assertive">
      <div className="adhan-alarm-card">
        <Volume2 size={28} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>حان الآن وقت صلاة {PRAYER_LABELS[active.prayer]}</strong>
          <div className="small">{v ? v.name : 'الأذان من جهازك'}</div>
        </div>
        {active.blocked
          ? <button className="btn btn-gold" onClick={() => { audio.current?.play().then(() => setActive({ ...active, blocked: false })).catch(() => {}) }}>تشغيل الأذان</button>
          : null}
        <button className="btn" onClick={stop} aria-label="إيقاف الأذان"><Square size={16} /> إيقاف</button>
      </div>
    </div>
  )
}
