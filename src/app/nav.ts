import {
  House, CalendarCheck, BookOpen, Brain, Headphones, Clock, Compass, Sparkles, HandHeart, GraduationCap,
  ChartColumn, Route, Search, Settings, Heart, Gem, BookOpenText, Palette as PaletteIcon, BellPlus, ChartNoAxesColumn, CloudSun, MoonStar, HardDriveDownload, BrainCircuit, UsersRound, HeartHandshake, CircleDot, CalendarDays, Bell, LayoutGrid, PenLine, Palette, Landmark, ScrollText, MessageCircleQuestion, BellRing,
} from 'lucide-react'
import type { StringKey } from '../i18n/strings'

export type NavItem = { to: string; key: StringKey; icon: typeof House }

export const NAV: { group: StringKey; items: NavItem[] }[] = [
  { group: 'groupPlus', items: [
    { to: '/plus', key: 'plus', icon: Gem },
    { to: '/companion', key: 'companion', icon: BellRing },
    { to: '/stories', key: 'stories', icon: BookOpenText },
    { to: '/ramadan', key: 'ramadan', icon: MoonStar },
    { to: '/weather', key: 'weather', icon: CloudSun },
    { to: '/plus/memorize', key: 'plusMemorize', icon: BrainCircuit },
    { to: '/plus/family', key: 'plusFamily', icon: UsersRound },
    { to: '/plus/downloads', key: 'plusDownloads', icon: HardDriveDownload },
    { to: '/plus/themes', key: 'plusThemes', icon: PaletteIcon },
    { to: '/plus/reminders', key: 'plusReminders', icon: BellPlus },
    { to: '/plus/insights', key: 'plusInsights', icon: ChartNoAxesColumn },
  ] },
  { group: 'groupDaily', items: [
    { to: '/', key: 'home', icon: House },
    { to: '/wird', key: 'wird', icon: CalendarCheck },
  ] },
  { group: 'groupQuran', items: [
    { to: '/quran', key: 'quran', icon: BookOpen },
    { to: '/memorize', key: 'memorize', icon: Brain },
    { to: '/listen', key: 'listen', icon: Headphones },
    { to: '/learn', key: 'learn', icon: GraduationCap },
    { to: '/studio', key: 'studio', icon: Palette },
  ] },
  { group: 'groupWorship', items: [
    { to: '/prayer', key: 'prayer', icon: Clock },
    { to: '/qibla', key: 'qibla', icon: Compass },
    { to: '/mosques', key: 'mosques', icon: Landmark },
    { to: '/adhkar', key: 'adhkar', icon: Sparkles },
    { to: '/duas', key: 'duas', icon: HandHeart },
    { to: '/hadith', key: 'hadith', icon: ScrollText },
    { to: '/for-the-deceased', key: 'forDeceased', icon: HeartHandshake },
    { to: '/tasbih', key: 'tasbih', icon: CircleDot },
    { to: '/my-adhkar', key: 'myAdhkar', icon: PenLine },
    { to: '/calendar', key: 'calendar', icon: CalendarDays },
  ] },
  { group: 'groupMore', items: [
    { to: '/progress', key: 'progress', icon: ChartColumn },
    { to: '/journey', key: 'journey', icon: Route },
    { to: '/assistant', key: 'assistant', icon: MessageCircleQuestion },
    { to: '/search', key: 'search', icon: Search },
    { to: '/reminders', key: 'reminders', icon: Bell },
    { to: '/settings', key: 'settings', icon: Settings },
    { to: '/about', key: 'about', icon: Heart },
  ] },
]

/** شريط التنقل السفلي على الجوال: الأقسام الأكثر استخدامًا، والباقي في «المزيد» */
export const TABS: (NavItem & { short: string; match: RegExp })[] = [
  { to: '/', key: 'home', icon: House, short: 'الرئيسية', match: /^\/$/ },
  { to: '/quran', key: 'quran', icon: BookOpen, short: 'القرآن', match: /^\/(quran|mushaf|memorize|listen|learn|stories|studio)/ },
  { to: '/prayer', key: 'prayer', icon: Clock, short: 'المواقيت', match: /^\/(prayer|qibla|calendar|mosques)/ },
  { to: '/adhkar', key: 'adhkar', icon: Sparkles, short: 'الأذكار', match: /^\/(adhkar|duas|hadith|tasbih|my-adhkar|for-the-deceased)/ },
  { to: '/more', key: 'groupMore', icon: LayoutGrid, short: 'المزيد', match: /^\/(more|wird|progress|journey|assistant|search|reminders|settings|plus|weather|ramadan|about)/ },
]

/** بيانات الاختصارات (العنوان القصير والأيقونة) لكل مسار يمكن وضعه في الوصول السريع */
export const LINK_META: Record<string, { label: string; icon: typeof House }> = {
  '/tasbih': { label: 'المسبحة', icon: CircleDot },
  '/qibla': { label: 'القبلة', icon: Compass },
  '/duas': { label: 'الأدعية', icon: HandHeart },
  '/calendar': { label: 'التقويم', icon: CalendarDays },
  '/adhkar': { label: 'الأذكار', icon: Sparkles },
  '/quran': { label: 'القرآن', icon: BookOpen },
  '/listen': { label: 'الاستماع', icon: Headphones },
  '/prayer': { label: 'المواقيت', icon: Clock },
  '/wird': { label: 'الختمة', icon: CalendarCheck },
  '/memorize': { label: 'الحفظ', icon: Brain },
  '/learn': { label: 'التفسير', icon: GraduationCap },
  '/my-adhkar': { label: 'أذكاري', icon: PenLine },
  '/search': { label: 'البحث', icon: Search },
  '/progress': { label: 'التقدم', icon: ChartColumn },
  '/reminders': { label: 'التذكير', icon: Bell },
  '/studio': { label: 'تصاميم الآيات', icon: Palette },
  '/mosques': { label: 'المساجد', icon: Landmark },
  '/hadith': { label: 'الأحاديث', icon: ScrollText },
  '/assistant': { label: 'المساعد', icon: MessageCircleQuestion },
}
