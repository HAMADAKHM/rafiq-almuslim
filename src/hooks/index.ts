import { useEffect, useState, useSyncExternalStore, useCallback, useRef } from 'react'
import { loadQuran, type QuranData } from '../services/quran'
import { onChange } from '../db/events'
import { player } from '../services/audio'

export function useQuran(): { data: QuranData | null; error: string | null } {
  const [data, setData] = useState<QuranData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadQuran().then((d) => alive && setData(d)).catch(() => alive && setError('تعذر تحميل بيانات المصحف. أعد تحميل الصفحة.'))
    return () => { alive = false }
  }, [])
  return { data, error }
}

/**
 * قراءة بيانات من IndexedDB مع إعادة التحميل تلقائيًا عند تغير الموضوعات المحددة.
 */
export function useLive<T>(loader: () => Promise<T>, topics: string[], initial: T, deps: unknown[] = []): T {
  const [value, setValue] = useState<T>(initial)
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  useEffect(() => {
    let alive = true
    const run = () => loaderRef.current().then((v) => alive && setValue(v)).catch(() => {})
    run()
    const off = onChange((t) => {
      if (t === '*' || topics.some((x) => t === x || t.startsWith(x))) run()
    })
    return () => { alive = false; off() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

export function usePlayer() {
  return useSyncExternalStore(player.subscribe, player.getSnapshot)
}

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

// ---------- رسائل قصيرة ----------
type ToastListener = (msg: string | null) => void
const toastListeners = new Set<ToastListener>()
let toastTimer: ReturnType<typeof setTimeout> | undefined
export function toast(msg: string) {
  toastListeners.forEach((l) => l(msg))
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastListeners.forEach((l) => l(null)), 2600)
}
export function useToastMessage(): string | null {
  const [msg, setMsg] = useState<string | null>(null)
  const cb = useCallback((m: string | null) => setMsg(m), [])
  useEffect(() => { toastListeners.add(cb); return () => { toastListeners.delete(cb) } }, [cb])
  return msg
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — رفيق المسلم` : 'رفيق المسلم | Islamic Companion'
  }, [title])
}
