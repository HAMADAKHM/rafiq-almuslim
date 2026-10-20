import {
  House, CalendarCheck, BookOpen, Brain, Headphones, Clock, Compass, Sparkles, HandHeart, GraduationCap,
  ChartColumn, Route, Search, Settings, Heart, CircleDot, CalendarDays, Bell, LayoutGrid, PenLine, Palette,
} from 'lucide-react'
import type { StringKey } from '../i18n/strings'

export type NavItem = { to: string; key: StringKey; icon: typeof House }

export const NAV: { group: StringKey; items: NavItem[] }[] = [
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
    { to: '/adhkar', key: 'adhkar', icon: Sparkles },
    { to: '/duas', key: 'duas', icon: HandHeart },
    { to: '/tasbih', key: 'tasbih', icon: CircleDot },
    { to: '/my-adhkar', key: 'myAdhkar', icon: PenLine },
    { to: '/calendar', key: 'calendar', icon: CalendarDays },
  ] },
  { group: 'groupMore', items: [
    { to: '/progress', key: 'progress', icon: ChartColumn },
    { to: '/journey', key: 'journey', icon: Route },
    { to: '/search', key: 'search', icon: Search },
    { to: '/reminders', key: 'reminders', icon: Bell },
    { to: '/settings', key: 'settings', icon: Settings },
    { to: '/about', key: 'about', icon: Heart },
  ] },
]

/** شريط التنقل السفلي على الجوال: الأقسام الأكثر استخدامًا، والباقي في «المزيد» */
export const TABS: (NavItem & { short: string; match: RegExp })[] = [
  { to: '/', key: 'home', icon: House, short: 'الرئيسية', match: /^\/$/ },
  { to: '/quran', key: 'quran', icon: BookOpen, short: 'القرآن', match: /^\/(quran|mushaf|memorize|listen|learn|studio)/ },
  { to: '/prayer', key: 'prayer', icon: Clock, short: 'المواقيت', match: /^\/(prayer|qibla|calendar)/ },
  { to: '/adhkar', key: 'adhkar', icon: Sparkles, short: 'الأذكار', match: /^\/(adhkar|duas|tasbih|my-adhkar)/ },
  { to: '/more', key: 'groupMore', icon: LayoutGrid, short: 'المزيد', match: /^\/(more|wird|progress|journey|search|reminders|settings|about)/ },
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
  '/wird': { label: 'الورد', icon: CalendarCheck },
  '/memorize': { label: 'الحفظ', icon: Brain },
  '/learn': { label: 'التفسير', icon: GraduationCap },
  '/my-adhkar': { label: 'أذكاري', icon: PenLine },
  '/search': { label: 'البحث', icon: Search },
  '/progress': { label: 'التقدم', icon: ChartColumn },
  '/reminders': { label: 'التذكير', icon: Bell },
  '/studio': { label: 'تصاميم الآيات', icon: Palette },
}
