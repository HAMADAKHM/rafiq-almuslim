import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

  useEffect(() => {
    kv.get<Partial<Settings> | null>('settings', null)
      .then((s) => setSettings(mergeSettings(s)))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const update = useCallback((patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => {
    setSettings((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }
      kv.set('settings', next).catch(() => {})
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
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'gold' ? '#0a0a0a' : dark ? '#0c1512' : '#0f5a44')
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
