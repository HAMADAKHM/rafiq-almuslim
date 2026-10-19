import { BrowserRouter, HashRouter, Route, Routes, Link } from 'react-router-dom'

// نسخة المعاينة المستضافة (Artifact) لا تدعم مسارات الخادم، فتستخدم التوجيه عبر #
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter
import { Layout } from './Layout'
import { SettingsProvider } from '../state/SettingsContext'
import { HomePage } from '../features/home/HomePage'
import { QuranIndexPage } from '../features/quran/QuranIndexPage'
import { ReaderPage } from '../features/quran/ReaderPage'
import { MemorizePage } from '../features/memorize/MemorizePage'
import { PrayerPage } from '../features/prayer/PrayerPage'
import { QiblaPage } from '../features/qibla/QiblaPage'
import { ContentLibrary } from '../features/adhkar/AdhkarPage'
import { ListenPage } from '../features/listen/ListenPage'
import { LearnPage, LessonPage } from '../features/learn/LearnPage'
import { WirdPage } from '../features/wird/WirdPage'
import { ProgressPage } from '../features/progress/ProgressPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { AboutPage } from '../features/about/AboutPage'
import { SearchPage } from '../features/search/SearchPage'
import { JourneyPage } from '../features/journey/JourneyPage'
import { Empty } from '../components/Common'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="quran" element={<QuranIndexPage />} />
        <Route path="quran/:surah" element={<ReaderPage />} />
        <Route path="memorize" element={<MemorizePage />} />
        <Route path="prayer" element={<PrayerPage />} />
        <Route path="qibla" element={<QiblaPage />} />
        <Route path="adhkar" element={<ContentLibrary kind="adhkar" />} />
        <Route path="adhkar/:category" element={<ContentLibrary kind="adhkar" />} />
        <Route path="duas" element={<ContentLibrary kind="duas" />} />
        <Route path="duas/:category" element={<ContentLibrary kind="duas" />} />
        <Route path="listen" element={<ListenPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="learn/:lessonId" element={<LessonPage />} />
        <Route path="wird" element={<WirdPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<Empty>الصفحة غير موجودة. <Link to="/">العودة إلى الرئيسية</Link></Empty>} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <Router>
        <AppRoutes />
      </Router>
    </SettingsProvider>
  )
}
