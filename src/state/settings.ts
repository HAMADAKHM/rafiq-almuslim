// إعدادات المستخدم: تُحفظ محليًا في IndexedDB.
import { DEFAULT_PRAYER_SETTINGS, type PrayerName, type PrayerSettings } from '../services/prayer'

export interface SavedLocation {
  name: string
  nameAr?: string
  country: string
  lat: number
  lng: number
  tz: string
  source: 'city' | 'gps' | 'manual'
}

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  lang: 'ar' | 'en'
  uiScale: number
  quranFontSize: number
  location: SavedLocation | null
  prayer: PrayerSettings
  notifications: {
    enabled: boolean
    perPrayer: Record<Exclude<PrayerName, 'sunrise'>, boolean>
    minutesBefore: number
    morningAdhkar: string | null // "HH:MM" أو null
    eveningAdhkar: string | null
  }
  hijriOffset: number
  reciterId: string
  tafsir: string
  showFooterDedication: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  lang: 'ar',
  uiScale: 1,
  quranFontSize: 30,
  location: null,
  prayer: DEFAULT_PRAYER_SETTINGS,
  notifications: {
    enabled: false,
    perPrayer: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    minutesBefore: 0,
    morningAdhkar: null,
    eveningAdhkar: null,
  },
  hijriOffset: 0,
  reciterId: 'alafasy',
  tafsir: 'ar-tafsir-muyassar',
  showFooterDedication: true,
}

/** دمج آمن مع القيم الافتراضية (عند إضافة إعدادات جديدة في إصدارات لاحقة) */
export function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  const s = saved ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    prayer: { ...DEFAULT_SETTINGS.prayer, ...s.prayer, adjustments: { ...DEFAULT_SETTINGS.prayer.adjustments, ...s.prayer?.adjustments } },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...s.notifications, perPrayer: { ...DEFAULT_SETTINGS.notifications.perPrayer, ...s.notifications?.perPrayer } },
  }
}
