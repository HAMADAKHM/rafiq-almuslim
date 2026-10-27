import { useEffect, useRef, useState } from 'react'
import { ayahAudioSources, reciterById, type Reciter } from '../content/reciters'
import type { QuranData } from '../services/quran'
import { BASMALA_AYAH, nextSurah, reciteQueue, REPEAT_GAP_MS, type AyahRef } from './recite'
import type { TvSettings } from './state'
import { ADHKAR } from '../content/adhkar'
import { hisnAudioUrl } from '../content/hisnAudio'
import { adhkarForNow } from '../services/daily'
import { speak, stopVoice } from './voice'

/** الذكر المقروء الآن بالصوت (نصوص الأذكار غير القرآنية) */
export interface SpokenDhikr { title: string; text: string; source: string; count?: number; voice: boolean }
/** أقصى تكرار بالصوت لذكر ورد تكراره (يظهر العدد كاملًا على الشاشة) */
const MAX_SPOKEN_REPEAT = 3

const POS_KEY = 'rafiq-tv:recite-pos'
function loadPos(): AyahRef | null { try { return JSON.parse(localStorage.getItem(POS_KEY) || 'null') } catch { return null } }
function savePos(p: AyahRef) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* اختياري */ } }

const sourcesFor = (r: Reciter, a: AyahRef) => (a.ayah === BASMALA_AYAH ? ayahAudioSources(r, 1, 1) : ayahAudioSources(r, a.surah, a.ayah))

/** ملف آية مُحمَّل مسبقًا (يبدأ تحميله أثناء تلاوة الآية السابقة) لتتصل القراءة دون فجوات */
interface Prepared { el: HTMLAudioElement; sources: string[]; i: number }
function prepare(sources: string[], volume: number): Prepared {
  const el = new Audio()
  el.preload = 'auto'
  el.volume = volume
  el.src = sources[0]
  el.load()
  return { el, sources, i: 0 }
}

/** يشغّل الملف المُحمَّل، ويجرب المصادر البديلة إن تعذر، ويعود عند انتهائه أو الإيقاف */
function playPrepared(p: Prepared, cur: { current: HTMLAudioElement | null }, alive: () => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const el = p.el
    cur.current = el
    const fail = () => {
      if (!alive()) return resolve(false)
      p.i++
      if (p.i >= p.sources.length) return resolve(false)
      el.src = p.sources[p.i]
      el.load()
      el.play().catch(fail)
    }
    el.onended = () => resolve(true)
    el.onerror = fail
    el.play().catch(fail)
  })
}

const sleep = (ms: number, alive: () => boolean) => new Promise<void>((r) => { const t0 = Date.now(); const tick = () => (!alive() || Date.now() - t0 >= ms ? r() : setTimeout(tick, 500)); tick() })

/**
 * التلاوة على الشاشة، متصلة بلا فجوات بين الآيات. `hold` = وقت الأذان أو انتظار الإقامة:
 * تتوقف التلاوة فورًا وتُستأنف من الآية نفسها بعده.
 */
export function useRecitation(s: TvSettings, data: QuranData | null, ctx: { day: string; hour: number }, hold: boolean) {
  const [current, setCurrent] = useState<AyahRef | null>(null)
  const [failed, setFailed] = useState(false)
  const [dhikr, setDhikr] = useState<SpokenDhikr | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const run = useRef(0)
  const hourRef = useRef(ctx.hour)
  hourRef.current = ctx.hour
  const active = s.reciteOn && !!data && !hold

  useEffect(() => {
    const id = ++run.current
    const alive = () => run.current === id
    if (!active || !data) { setCurrent(null); setDhikr(null); return () => { audio.current?.pause(); audio.current = null; stopVoice() } }
    const reciter = reciterById(s.reciterId)
    const vol = s.reciteVolume
    let pending: Prepared | null = null
    // الأذكار بالصوت: أذكار الوقت كاملة بالترتيب، الآيات بصوت القارئ وبقية الأذكار بصوت عربي
    const adhkarLoop = async () => {
      while (alive()) {
        const which = adhkarForNow(hourRef.current)
        const cat = ADHKAR.find((c) => c.id === which.id)
        let misses = 0
        for (const it of cat?.items ?? []) {
          if (!alive()) return
          if (it.kind === 'quran' && it.quran) {
            setDhikr(null)
            for (const r of it.quran) for (let a = r.from; a <= r.to && alive(); a++) {
              const ref = { surah: r.surah, ayah: a }
              setCurrent(ref)
              const ok = await playPrepared(prepare(sourcesFor(reciter, ref), vol), audio, alive)
              misses = ok ? 0 : misses + 1
              setFailed(misses >= 3)
              if (misses >= 3) await sleep(60_000, alive)
            }
          } else if (it.text) {
            setCurrent(null)
            const reps = Math.min(MAX_SPOKEN_REPEAT, Math.max(1, it.count ?? 1))
            let voice = true
            // تسجيل «حصن المسلم» البشري إن طابق نص الذكر، وإلا صوت التلفاز الآلي
            const human = hisnAudioUrl(it.id)
            for (let k = 0; k < reps && alive() && voice; k++) {
              setDhikr({ title: which.title, text: it.text, source: it.source, count: it.count, voice })
              const played = human ? await playPrepared(prepare([human], vol), audio, alive) : false
              if (!played) voice = await speak(it.text, vol, alive)
              if (voice && alive()) await sleep(1200, alive)
            }
            // لا يوجد صوت عربي في الجهاز: يبقى النص ظاهرًا مدة تكفي لقراءته ثم يُنتقل للتالي
            if (!voice && alive()) { setDhikr({ title: which.title, text: it.text, source: it.source, count: it.count, voice: false }); await sleep(Math.max(8000, it.text.length * 90), alive) }
          }
        }
        setCurrent(null); setDhikr(null)
        await sleep(REPEAT_GAP_MS, alive)
      }
    }
    ;(async () => {
      if (s.reciteMode === 'adhkar') return adhkarLoop()
      let surah = s.reciteSurah
      let from: number | undefined
      if (s.reciteMode === 'surah') {
        const pos = loadPos()
        if (pos && pos.surah >= 1 && pos.surah <= 114) { surah = pos.surah; from = Math.max(1, pos.ayah) }
      }
      let misses = 0
      while (alive()) {
        const queue = reciteQueue(s.reciteMode, data.meta, { day: ctx.day, hour: hourRef.current, surah, from })
        let next: Prepared | null = queue.length ? prepare(sourcesFor(reciter, queue[0]), vol) : null
        for (let k = 0; k < queue.length; k++) {
          if (!alive()) return
          const a = queue[k]
          const cur = next!
          // تحميل الآية التالية الآن، أثناء تلاوة الحالية
          next = k + 1 < queue.length ? prepare(sourcesFor(reciter, queue[k + 1]), vol) : null
          pending = next
          setCurrent(a)
          if (s.reciteMode === 'surah' && a.ayah !== BASMALA_AYAH) savePos(a)
          const ok = await playPrepared(cur, audio, alive)
          if (!alive()) return
          misses = ok ? 0 : misses + 1
          setFailed(misses >= 3)
          // تعذر التحميل (انقطاع الإنترنت): انتظار ثم المتابعة دون ضغط على الشبكة
          if (misses >= 3) await sleep(60_000, alive)
        }
        if (s.reciteMode === 'surah') { surah = nextSurah(surah); from = 1; savePos({ surah, ayah: 1 }) }
        else { setCurrent(null); await sleep(REPEAT_GAP_MS, alive) }
      }
    })()
    return () => {
      run.current++
      audio.current?.pause(); audio.current = null
      stopVoice()
      if (pending) { pending.el.removeAttribute('src'); pending.el.load(); pending = null }
    }
  }, [active, s.reciteMode, s.reciterId, s.reciteSurah, ctx.day, data]) // eslint-disable-line react-hooks/exhaustive-deps

  // تغيير مستوى الصوت أثناء التلاوة
  useEffect(() => { if (audio.current) audio.current.volume = s.reciteVolume }, [s.reciteVolume])

  return { current: active ? current : null, dhikr: active ? dhikr : null, failed: active && failed }
}

/** عند تغيير سورة البدء من الإعدادات يُنسى الموضع المحفوظ */
export function resetRecitePos() { try { localStorage.removeItem(POS_KEY) } catch { /* اختياري */ } }
