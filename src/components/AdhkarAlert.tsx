import { useEffect, useMemo, useRef, useState } from 'react'
import { dhikrAudio, playDhikrAudio, type DhikrAudio } from '../services/dhikrVoice'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { X, Play, Square, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react'
import { PaintedScene, type PaintTone } from './Scene'
import { ADHKAR } from '../content/adhkar'
import { ayahAudioSources, reciterById } from '../content/reciters'
import { useNow, useQuran } from '../hooks'
import { useSettings } from '../state/SettingsContext'
import { speakArabic, stopSpeaking, voiceAvailable } from '../platform/voice'
import { dayKey } from '../lib/dates'
import type { DhikrItem } from '../content/types'
import type { QuranData } from '../services/quran'

/** أقسام التنبيه ووقت كل منها في الإعدادات */
export const ALERT_CATS = ['morning', 'evening', 'sleep'] as const
export type AlertCat = (typeof ALERT_CATS)[number]
const TONE: Record<AlertCat, PaintTone> = { morning: 'dawn', evening: 'sunset', sleep: 'night' }

function quranText(data: QuranData, it: DhikrItem): string {
  return (it.quran ?? []).flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => data.verses[r.surah - 1][r.from + i - 1])).join(' ۝ ')
}

/** تشغيل ملف صوتي بتجربة المصادر البديلة بالترتيب، ويعود عند انتهائه */
function playUrl(sources: string[], audioRef: { current: HTMLAudioElement | null }, alive: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const tryAt = (i: number) => {
      if (i >= sources.length || !alive()) return resolve()
      const a = new Audio(sources[i])
      audioRef.current = a
      a.onended = () => resolve()
      a.onerror = () => tryAt(i + 1)
      a.play().catch(() => tryAt(i + 1))
    }
    tryAt(0)
  })
}

/**
 * شاشة تنبيه الأذكار: تعرض أذكار الوقت ذكرًا ذكرًا، وتقرؤها بالصوت:
 * الآيات بصوت القارئ المختار، وبقية الأذكار بصوت الجهاز (قراءة آلية للنص الموثق كما هو).
 */
export function AdhkarAlert({ cat, onClose }: { cat: AlertCat; onClose: () => void }) {
  const { data } = useQuran()
  const { settings } = useSettings()
  const category = ADHKAR.find((c) => c.id === cat)!
  const items = category.items
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [noVoice, setNoVoice] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const run = useRef(0)
  const it = items[i]

  const stop = () => {
    run.current++
    audio.current?.pause()
    audio.current = null
    stopSpeaking().catch(() => {})
    setPlaying(false)
  }

  /** يقرأ الأذكار بالتتابع بدءًا من `from` */
  const playFrom = async (from: number) => {
    stop()
    const id = ++run.current
    const alive = () => run.current === id
    setPlaying(true)
    const reciter = reciterById(settings.reciterId)
    const canSpeak = await voiceAvailable()
    let human: DhikrAudio | null = null
    for (let k = from; k < items.length && alive(); k++) {
      setI(k)
      const x = items[k]
      if (x.kind === 'quran' && x.quran) {
        for (const r of x.quran) for (let a = r.from; a <= r.to && alive(); a++) await playUrl(ayahAudioSources(reciter, r.surah, a), audio, alive)
      } else if (x.text && (human = await dhikrAudio(x.id)) && (await playDhikrAudio(human, audio, alive))) {
        // صوت بشري (تسجيلك أو حصن المسلم) بدل الصوت الآلي
      } else if (x.text && canSpeak) {
        try { await speakArabic(x.text) } catch { setNoVoice(true) }
      } else if (!canSpeak) {
        setNoVoice(true)
        break
      }
    }
    if (alive()) setPlaying(false)
  }

  useEffect(() => {
    // يبدأ الصوت تلقائيًا عند فتح الشاشة (قد يمنعه المتصفح حتى يضغط المستخدم «تشغيل»)
    if (data) playFrom(0)
    return () => stop()
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const text = useMemo(() => (it.kind === 'quran' && data ? quranText(data, it) : it.text ?? ''), [it, data])

  return (
    <div className="adhkar-alert" role="dialog" aria-modal="true" aria-label={`تنبيه ${category.title}`}>
      <PaintedScene tone={TONE[cat]} variant="tall" className="aa-art" />
      <div className="aa-veil" />
      <div className="aa-body">
        <div className="aa-top">
          <button className="aa-icon" onClick={() => { stop(); onClose() }} aria-label="إغلاق"><X size={22} /></button>
          <div className="aa-title">
            <h2>{category.title}</h2>
            <small>{i + 1} من {items.length}</small>
          </div>
          <span className="aa-icon" aria-hidden="true" />
        </div>
        <div className="aa-card">
          {it.kind === 'quran' ? <p className="aa-text quran-text">{text || '…'}</p> : <p className="aa-text dhikr-text">{text}</p>}
          <div className="aa-meta">
            {it.count && it.count > 1 && <span className="badge">يُقال {it.count} مرات</span>}
            <span>{it.source}</span>
          </div>
        </div>
        {noVoice && <p className="aa-note">لا يتوفر صوت عربي للقراءة على هذا الجهاز؛ تُقرأ الآيات بصوت القارئ فقط. يمكن تثبيت اللغة العربية في إعدادات «تحويل النص إلى كلام» في الهاتف.</p>}
        <div className="aa-controls">
          <button className="aa-icon" onClick={() => playFrom(Math.max(0, i - 1))} disabled={i === 0} aria-label="الذكر السابق"><ChevronRight size={24} /></button>
          <button className="aa-play" onClick={() => (playing ? stop() : playFrom(i))} aria-label={playing ? 'إيقاف الصوت' : 'تشغيل الصوت'}>{playing ? <Square size={24} /> : <Play size={26} />}</button>
          <button className="aa-icon" onClick={() => playFrom(Math.min(items.length - 1, i + 1))} disabled={i === items.length - 1} aria-label="الذكر التالي"><ChevronLeft size={24} /></button>
        </div>
        <Link className="aa-open" to={`/adhkar/${cat}`} onClick={() => { stop(); onClose() }}><BookOpen size={18} /> فتح الأذكار بالعدّاد</Link>
        <p className="aa-note small">الآيات بصوت {reciterById(settings.reciterId).name}، وبقية الأذكار قراءة آلية بصوت الجهاز للنص الموثق كما هو.</p>
      </div>
    </div>
  )
}

/** صفحة التنبيه (يفتحها الضغط على إشعار الأذكار) */
export function AdhkarAlertPage() {
  const { category } = useParams()
  const nav = useNavigate()
  const cat = (ALERT_CATS as readonly string[]).includes(category ?? '') ? (category as AlertCat) : 'morning'
  return <AdhkarAlert cat={cat} onClose={() => nav('/', { replace: true })} />
}

const shownKey = (day: string, cat: AlertCat) => `adhkar-alert:${day}:${cat}`
function wasShown(k: string) { try { return !!sessionStorage.getItem(k) } catch { return false } }
function markShown(k: string) { try { sessionStorage.setItem(k, '1') } catch { /* اختياري */ } }
const WINDOW_MS = 90_000

/** عند حلول وقت أذكار الصباح أو المساء أو النوم والتطبيق مفتوح: تظهر شاشة التنبيه بالصوت */
export function AdhkarAlarm() {
  const { settings } = useSettings()
  const now = useNow(5000)
  const [open, setOpen] = useState<AlertCat | null>(null)
  const n = settings.notifications
  useEffect(() => {
    if (open || !n.enabled || !n.adhkarScreen) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (location.pathname.startsWith('/adhkar-alert')) return
    const tz = settings.location?.tz
    const day = dayKey(now, tz)
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
    const times: Record<AlertCat, string | null> = { morning: n.morningAdhkar, evening: n.eveningAdhkar, sleep: n.sleepAdhkar }
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
    for (const c of ALERT_CATS) {
      const t = times[c]
      if (!t) continue
      const diff = (toMin(hm) - toMin(t)) * 60_000
      const k = shownKey(day, c)
      if (diff >= 0 && diff < WINDOW_MS && !wasShown(k)) { markShown(k); setOpen(c); break }
    }
  }, [now]) // eslint-disable-line react-hooks/exhaustive-deps
  return open ? <AdhkarAlert cat={open} onClose={() => setOpen(null)} /> : null
}
