import { BrowserRouter, HashRouter, Route, Routes, Link } from 'react-router-dom'

// نسخة المعاينة المستضافة (Artifact) لا تدعم مسارات الخادم، فتستخدم التوجيه عبر #
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter
import { Layout } from './Layout'
import { SettingsProvider } from '../state/SettingsContext'
import { HomePage } from '../features/home/HomePage'
import { QuranIndexPage } from '../features/quran/QuranIndexPage'
import { ReaderPage } from '../features/quran/ReaderPage'
import { PrayerPage } from '../features/prayer/PrayerPage'
import { ContentLibrary } from '../features/adhkar/AdhkarPage'
import { Empty } from '../components/Common'
import { NativeBridge } from './NativeBridge'
import { PlusProvider } from '../billing/PlusContext'
import { lazy, type ComponentType } from 'react'

// الصفحات الأقل استخدامًا تُحمَّل عند فتحها فقط (أول فتح أسرع)؛ وكلها مخزنة للعمل دون اتصال
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })))
const MemorizePage = page(() => import('../features/memorize/MemorizePage'), 'MemorizePage')
const QiblaPage = page(() => import('../features/qibla/QiblaPage'), 'QiblaPage')
const ListenPage = page(() => import('../features/listen/ListenPage'), 'ListenPage')
const WirdPage = page(() => import('../features/wird/WirdPage'), 'WirdPage')
const ProgressPage = page(() => import('../features/progress/ProgressPage'), 'ProgressPage')
const SettingsPage = page(() => import('../features/settings/SettingsPage'), 'SettingsPage')
const AboutPage = page(() => import('../features/about/AboutPage'), 'AboutPage')
const SearchPage = page(() => import('../features/search/SearchPage'), 'SearchPage')
const JourneyPage = page(() => import('../features/journey/JourneyPage'), 'JourneyPage')
const MushafPage = page(() => import('../features/quran/MushafPage'), 'MushafPage')
const SurahInfoPage = page(() => import('../features/quran/SurahInfoPage'), 'SurahInfoPage')
const TasbihPage = page(() => import('../features/tasbih/TasbihPage'), 'TasbihPage')
const CalendarPage = page(() => import('../features/calendar/CalendarPage'), 'CalendarPage')
const RemindersPage = page(() => import('../features/reminders/RemindersPage'), 'RemindersPage')
const MorePage = page(() => import('../features/more/MorePage'), 'MorePage')
const MyAdhkarPage = page(() => import('../features/adhkar/MyAdhkarPage'), 'MyAdhkarPage')
const StudioPage = page(() => import('../features/studio/StudioPage'), 'StudioPage')
const MosquesPage = page(() => import('../features/mosques/MosquesPage'), 'MosquesPage')
const AdhkarAlertPage = page(() => import('../components/AdhkarAlert'), 'AdhkarAlertPage')
const AssistantPage = page(() => import('../features/assistant/AssistantPage'), 'AssistantPage')
const LearnPage = page(() => import('../features/learn/LearnPage'), 'LearnPage')
const LessonPage = page(() => import('../features/learn/LearnPage'), 'LessonPage')
const PlusPage = page(() => import('../features/plus/PlusPage'), 'PlusPage')
const PlusThemesPage = page(() => import('../features/plus/PlusFeatures'), 'PlusThemesPage')
const PlusRemindersPage = page(() => import('../features/plus/PlusFeatures'), 'PlusRemindersPage')
const PlusInsightsPage = page(() => import('../features/plus/PlusFeatures'), 'PlusInsightsPage')
const WeatherPage = page(() => import('../features/weather/WeatherPage'), 'WeatherPage')
const RamadanPage = page(() => import('../features/ramadan/RamadanPage'), 'RamadanPage')
const DownloadsPage = page(() => import('../features/plus/DownloadsPage'), 'DownloadsPage')
const MemoPlanPage = page(() => import('../features/plus/MemoPlanPage'), 'MemoPlanPage')
const FamilyKhatmaPage = page(() => import('../features/plus/FamilyKhatmaPage'), 'FamilyKhatmaPage')
const CompanionPage = page(() => import('../features/companion/CompanionPage'), 'CompanionPage')
const CompanionDhikrPage = page(() => import('../features/companion/CompanionPage'), 'CompanionDhikrPage')
const DeceasedPage = page(() => import('../features/deceased/DeceasedPage'), 'DeceasedPage')
const StoriesPage = page(() => import('../features/stories/StoriesPage'), 'StoriesPage')
const StoryPlayerPage = page(() => import('../features/stories/StoryPlayer'), 'StoryPlayerPage')

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="quran" element={<QuranIndexPage />} />
        <Route path="quran/:surah" element={<ReaderPage />} />
        <Route path="quran/:surah/info" element={<SurahInfoPage />} />
        <Route path="mushaf/:page" element={<MushafPage />} />
        <Route path="tasbih" element={<TasbihPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="memorize" element={<MemorizePage />} />
        <Route path="prayer" element={<PrayerPage />} />
        <Route path="qibla" element={<QiblaPage />} />
        <Route path="adhkar" element={<ContentLibrary kind="adhkar" />} />
        <Route path="adhkar/:category" element={<ContentLibrary kind="adhkar" />} />
        <Route path="duas" element={<ContentLibrary kind="duas" />} />
        <Route path="duas/:category" element={<ContentLibrary kind="duas" />} />
        <Route path="hadith" element={<ContentLibrary kind="hadith" />} />
        <Route path="hadith/:category" element={<ContentLibrary kind="hadith" />} />
        <Route path="listen" element={<ListenPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="learn/:lessonId" element={<LessonPage />} />
        <Route path="wird" element={<WirdPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="my-adhkar" element={<MyAdhkarPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="mosques" element={<MosquesPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="adhkar-alert/:category" element={<AdhkarAlertPage />} />
        <Route path="plus" element={<PlusPage />} />
        <Route path="plus/themes" element={<PlusThemesPage />} />
        <Route path="plus/reminders" element={<PlusRemindersPage />} />
        <Route path="plus/insights" element={<PlusInsightsPage />} />
        <Route path="stories" element={<StoriesPage />} />
        <Route path="weather" element={<WeatherPage />} />
        <Route path="ramadan" element={<RamadanPage />} />
        <Route path="plus/downloads" element={<DownloadsPage />} />
        <Route path="plus/memorize" element={<MemoPlanPage />} />
        <Route path="plus/family" element={<FamilyKhatmaPage />} />
        <Route path="companion" element={<CompanionPage />} />
        <Route path="companion/dhikr/:id" element={<CompanionDhikrPage />} />
        <Route path="for-the-deceased" element={<DeceasedPage />} />
        <Route path="stories/surah/:surah" element={<StoryPlayerPage />} />
        <Route path="stories/:id" element={<StoryPlayerPage />} />
        <Route path="*" element={<Empty>الصفحة غير موجودة. <Link to="/">العودة إلى الرئيسية</Link></Empty>} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <PlusProvider>
        <Router>
          <AppRoutes />
          <NativeBridge />
        </Router>
      </PlusProvider>
    </SettingsProvider>
  )
}
