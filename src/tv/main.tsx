// شاشة رفيق المسلم للتلفاز: تطبيق منفصل يُفتح في متصفح التلفاز (Samsung وغيره) ويعرض المواقيت والأذان.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/amiri-quran/400.css'
import './tv.css'
import { TvApp } from './TvApp'

createRoot(document.getElementById('root')!).render(<StrictMode><TvApp /></StrictMode>)
