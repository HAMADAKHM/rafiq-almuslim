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
const AcademyHome = page(() => import('../features/academy/AcademyPages'), 'AcademyHome')
const CoursePage = page(() => import('../features/academy/AcademyPages'), 'CoursePage')
const AcademyLessonPage = page(() => import('../features/academy/AcademyPages'), 'LessonPage')
const LessonQuizPage = page(() => import('../features/academy/AcademyPages'), 'LessonQuizPage')
const DailyQuizPage = page(() => import('../features/academy/AcademyPages'), 'DailyQuizPage')
const AchievementsPage = page(() => import('../features/academy/AcademyPages'), 'AchievementsPage')
const SourcesPage = page(() => import('../features/academy/AcademyPages'), 'SourcesPage')
const KidsHome = page(() => import('../features/academy/KidsPages'), 'KidsHome')
const ParentPanel = page(() => import('../features/academy/KidsPages'), 'ParentPanel')
const KidLessonPage = page(() => import('../features/academy/KidsPages'), 'KidLessonPage')
const KidQuizPage = page(() => import('../features/academy/KidsPages'), 'KidQuizPage')
const KidDailyPage = page(() => import('../features/academy/KidsPages'), 'KidDailyPage')
const KidProphetsPage = page(() => import('../features/academy/KidsPages'), 'KidProphetsPage')
const KidLettersPage = page(() => import('../features/academy/KidsPages'), 'KidLettersPage')
const LettersBoard = page(() => import('../features/academy/KidsPages'), 'LettersBoard')
const HadithHome = page(() => import('../features/hadith/HadithPages'), 'HadithHome')
const HadithBookPage = page(() => import('../features/hadith/HadithPages'), 'HadithBookPage')
const HadithSectionPage = page(() => import('../features/hadith/HadithPages'), 'HadithSectionPage')
const HadithDetailPage = page(() => import('../features/hadith/HadithPages'), 'HadithDetailPage')
const HadithSearchPage = page(() => import('../features/hadith/HadithPages'), 'HadithSearchPage')
const HadithFavoritesPage = page(() => import('../features/hadith/HadithPages'), 'HadithFavoritesPage')
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
const Reader2Page = page(() => import('../features/quran2/Reader2Page'), 'Reader2Page')
const CardsPage = page(() => import('../features/cards/CardsPage'), 'CardsPage')
const LibraryPage = page(() => import('../features/library/LibraryPage'), 'LibraryPage')
const FavoritesPage = page(() => import('../features/library/LibraryPage'), 'FavoritesPage')
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
const AdhkarAudioPage = page(() => import('../features/adhkaraudio/AdhkarAudioPage'), 'AdhkarAudioPage')
const TvRemotePage = page(() => import('../features/tvremote/TvRemotePage'), 'TvRemotePage')
const CompanionPage = page(() => import('../features/companion/CompanionPage'), 'CompanionPage')
const CompanionDhikrPage = page(() => import('../features/companion/CompanionPage'), 'CompanionDhikrPage')
const DeceasedPage = page(() => import('../features/deceased/DeceasedPage'), 'DeceasedPage')
const StoriesPage = page(() => import('../features/stories/StoriesPage'), 'StoriesPage')
const StoryPlayerPage = page(() => import('../features/stories/StoryPlayer'), 'StoryPlayerPage')
const FeaturesPage = page(() => import('../features/plus/FeaturesPage'), 'FeaturesPage')
const TermsPage = page(() => import('../features/about/TermsPage'), 'TermsPage')
const DateToolsPage = page(() => import('../features/datetools/DateToolsPage'), 'DateToolsPage')
const BelovedPage = page(() => import('../features/beloved/BelovedPage'), 'BelovedPage')
const KidsAdhkarPage = page(() => import('../features/kids/KidsAdhkarPage'), 'KidsAdhkarPage')
const BookletPage = page(() => import('../features/booklet/BookletPage'), 'BookletPage')
const WidgetsPage = page(() => import('../features/widgets/WidgetsPage'), 'WidgetsPage')

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
        <Route path="academy" element={<AcademyHome />} />
        <Route path="academy/course/:courseId" element={<CoursePage />} />
        <Route path="academy/lesson/:courseId/:lessonId" element={<AcademyLessonPage />} />
        <Route path="academy/quiz/:courseId/:lessonId" element={<LessonQuizPage />} />
        <Route path="academy/daily" element={<DailyQuizPage />} />
        <Route path="academy/achievements" element={<AchievementsPage />} />
        <Route path="academy/sources" element={<SourcesPage />} />
        <Route path="academy/kids/letters" element={<LettersBoard />} />
        <Route path="kids" element={<KidsHome />} />
        <Route path="kids/parent" element={<ParentPanel />} />
        <Route path="kids/lesson/:courseId/:lessonId" element={<KidLessonPage />} />
        <Route path="kids/quiz/:courseId/:lessonId" element={<KidQuizPage />} />
        <Route path="kids/daily" element={<KidDailyPage />} />
        <Route path="kids/prophets" element={<KidProphetsPage />} />
        <Route path="kids/letters" element={<KidLettersPage />} />
        <Route path="hadith" element={<HadithHome />} />
        <Route path="hadith/selected" element={<ContentLibrary kind="hadith" />} />
        <Route path="hadith/book/:book" element={<HadithBookPage />} />
        <Route path="hadith/book/:book/:section" element={<HadithSectionPage />} />
        <Route path="hadith/h/:book/:num" element={<HadithDetailPage />} />
        <Route path="hadith/search" element={<HadithSearchPage />} />
        <Route path="hadith/favorites" element={<HadithFavoritesPage />} />
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
        <Route path="library" element={<LibraryPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="read" element={<Reader2Page />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="my-adhkar" element={<MyAdhkarPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="mosques" element={<MosquesPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="adhkar-alert/:category" element={<AdhkarAlertPage />} />
        <Route path="plus" element={<PlusPage />} />
        <Route path="plus/features" element={<FeaturesPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="date-tools" element={<DateToolsPage />} />
        <Route path="beloved" element={<BelovedPage />} />
        <Route path="kids-adhkar" element={<KidsAdhkarPage />} />
        <Route path="booklet" element={<BookletPage />} />
        <Route path="widgets" element={<WidgetsPage />} />
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
        <Route path="tv-remote" element={<TvRemotePage />} />
        <Route path="adhkar-audio" element={<AdhkarAudioPage />} />
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
