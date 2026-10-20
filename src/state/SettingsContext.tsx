import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { kv } from '../db/repos'
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from './settings'

interface Ctx {
  settings: Settings
  ready: boolean
  update: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void
}

const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, ready: false, update: () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  type Patch = Partial<Settings> | ((s: Settings) => Partial<Settings>)
  const apply = (s: Settings, p: Patch): Settings => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })
  // تغييرات قبل اكتمال تحميل الإعدادات المحفوظة: تُطبق فوقها بعد التحميل، ولا يُكتب شيء قبل ذلك
  // (وإلا كُتبت القيم الافتراضية فوق إعدادات المستخدم المحفوظة)
  const loaded = useRef(false)
  const pending = useRef<Patch[]>([])

  useEffect(() => {
    kv.get<Partial<Settings> | null>('settings', null)
      .catch(() => null)
      .then((saved) => {
        let s = mergeSettings(saved)
        for (const p of pending.current) s = apply(s, p)
        loaded.current = true
        if (pending.current.length) kv.set('settings', s).catch(() => {})
        pending.current = []
        setSettings(s)
        setReady(true)
      })
  }, [])

  const update = useCallback((patch: Patch) => {
    if (!loaded.current) pending.current.push(patch)
    setSettings((prev) => {
      const next = apply(prev, patch)
      if (loaded.current) kv.set('settings', next).catch(() => {})
      return next
    })
  }, [])

  // تطبيق السمة وحجم الخط على المستند
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark = settings.theme === 'dark' || settings.theme === 'gold' || (settings.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      root.dataset.theme = dark ? 'dark' : 'light'
      // الأسود والذهبي: قاعدة الوضع الداكن مع لون مميز ذهبي
      if (settings.theme === 'gold') root.dataset.accent = 'gold'
      else delete root.dataset.accent
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'gold' ? '#0a0a0a' : dark ? '#0c1512' : '#073B32')
    }
    apply()
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    mq?.addEventListener?.('change', apply)
    root.style.setProperty('--ui-scale', String(settings.uiScale))
    root.style.setProperty('--quran-size', settings.quranFontSize + 'px')
    root.lang = settings.lang
    root.dir = settings.lang === 'ar' ? 'rtl' : 'ltr'
    return () => mq?.removeEventListener?.('change', apply)
  }, [settings.theme, settings.uiScale, settings.quranFontSize, settings.lang])

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update])
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettings() {
  return useContext(SettingsCtx)
}
