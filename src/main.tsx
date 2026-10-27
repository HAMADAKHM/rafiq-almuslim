import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/amiri-quran/400.css'
import '@fontsource/scheherazade-new/arabic-400.css'
import '@fontsource/noto-naskh-arabic/arabic-400.css'
import './styles/global.css'
import './styles/theme.css'
import './styles/design.css'
import './styles/reader.css'
import './styles/skins.css'
import { App } from './app/App'
import { registerSW } from 'virtual:pwa-register'

if (import.meta.env.VITE_STANDALONE === '1') await import('./standalone')

// عامل الخدمة: يتيح العمل دون إنترنت (الواجهة والمصحف والأذكار وبيانات المستخدم)
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_HASH_ROUTER !== '1') registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
