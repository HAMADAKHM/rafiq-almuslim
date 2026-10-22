import { useEffect, useRef, useState } from 'react'
import { ayahAudioSources, reciterById } from '../content/reciters'
import type { QuranData } from '../services/quran'
import { nextSurah, reciteQueue, REPEAT_GAP_MS, type AyahRef } from './recite'
import type { TvSettings } from './state'

const POS_KEY = 'rafiq-tv:recite-pos'
function loadPos(): AyahRef | null { try { return JSON.parse(localStorage.getItem(POS_KEY) || 'null') } catch { return null } }
function savePos(p: AyahRef) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* اختياري */ } }

/** يشغّل ملف الآية مع تجربة المصادر البديلة، ويعود عند انتهائه أو عند الإيقاف */
function playOne(sources: string[], volume: number, cur: { current: HTMLAudioElement | null }, alive: () => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const tryAt = (i: number) => {
      if (!alive()) return resolve(false)
      if (i >= sources.length) return resolve(false)
      const a = new Audio(sources[i])
      a.volume = volume
      cur.current = a
      a.onended = () => resolve(true)
      a.onerror = () => tryAt(i + 1)
      a.play().catch(() => tryAt(i + 1))
    }
    tryAt(0)
  })
}

const sleep = (ms: number, alive: () => boolean) => new Promise<void>((r) => { const t0 = Date.now(); const tick = () => (!alive() || Date.now() - t0 >= ms ? r() : setTimeout(tick, 500)); tick() })

/**
 * التلاوة على الشاشة. `hold` = وقت الأذان أو انتظار الإقامة: تتوقف التلاوة فورًا وتُستأنف من الآية نفسها بعده.
 */
export function useRecitation(s: TvSettings, data: QuranData | null, ctx: { day: string; hour: number }, hold: boolean) {
  const [current, setCurrent] = useState<AyahRef | null>(null)
  const [failed, setFailed] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const run = useRef(0)
  const active = s.reciteOn && !!data && !hold

  useEffect(() => {
    const id = ++run.current
    const alive = () => run.current === id
    if (!active || !data) { setCurrent(null); return () => { audio.current?.pause(); audio.current = null } }
    const reciter = reciterById(s.reciterId)
    ;(async () => {
      let surah = s.reciteSurah
      let from: number | undefined
      if (s.reciteMode === 'surah') {
        const pos = loadPos()
        if (pos && pos.surah >= 1 && pos.surah <= 114) { surah = pos.surah; from = pos.ayah }
      }
      let misses = 0
      while (alive()) {
        const queue = reciteQueue(s.reciteMode, data.meta, { day: ctx.day, hour: ctx.hour, surah, from })
        for (const a of queue) {
          if (!alive()) return
          setCurrent(a)
          if (s.reciteMode === 'surah') savePos(a)
          const ok = await playOne(ayahAudioSources(reciter, a.surah, a.ayah), s.reciteVolume, audio, alive)
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
    return () => { run.current++; audio.current?.pause(); audio.current = null }
  }, [active, s.reciteMode, s.reciterId, s.reciteSurah, ctx.day, data]) // eslint-disable-line react-hooks/exhaustive-deps

  // تغيير مستوى الصوت أثناء التلاوة
  useEffect(() => { if (audio.current) audio.current.volume = s.reciteVolume }, [s.reciteVolume])

  return { current: active ? current : null, failed: active && failed }
}

/** عند تغيير سورة البدء من الإعدادات يُنسى الموضع المحفوظ */
export function resetRecitePos() { try { localStorage.removeItem(POS_KEY) } catch { /* اختياري */ } }
