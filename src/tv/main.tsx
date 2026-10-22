// شاشة رفيق المسلم للتلفاز: تطبيق منفصل يُفتح في متصفح التلفاز (Samsung وغيره) ويعرض المواقيت والأذان.
import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/amiri-quran/400.css'
import './tv.css'
import { TvApp } from './TvApp'

/** يعرض الخطأ على الشاشة بدل شاشة سوداء (لتصويره وإرساله) */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: '4vw', fontSize: '1.8vw', color: '#F5F0E6', background: '#073B32', height: '100vh' }}>
        <h1 style={{ color: '#E9CF8E' }}>تعذر تشغيل الشاشة</h1>
        <p>صوّر هذه الرسالة وأرسلها للمطوّر:</p>
        <pre style={{ direction: 'ltr', whiteSpace: 'pre-wrap', fontSize: '1.2vw' }}>{String(this.state.error?.stack || this.state.error)}{'\n'}{navigator.userAgent}</pre>
      </div>
    )
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><TvApp /></ErrorBoundary></StrictMode>)
