// بيانات ودجت الشاشة الرئيسية (Android): مواقيت 30 يومًا محسوبة مسبقًا ومنسقة بتوقيت المدينة،
// لأن الودجت لا يشغّل JavaScript. يختار الودجت الصلاة القادمة بنفسه ويُحدَّث عند كل فتح للتطبيق.
import { PRAYER_LABELS, prayerTimesFor } from './prayer'
import { addDays, dateParts, dayKey, formatHijri, formatTime } from '../lib/dates'
import { ayahOfDay, dhikrOfDay } from './daily'
import { ADHKAR } from '../content/adhkar'
import { DUAS } from '../content/duas'
import { AYAH_OF_DAY_REFS } from '../content/ayahOfDay'
import { TV_PHRASES } from '../content/tvPhrases'
import type { DhikrItem } from '../content/types'
import { toArabicDigits } from '../lib/arabic'
import type { QuranData } from './quran'
import type { PrayerKey, Settings } from '../state/settings'

// 30 يومًا: تبقى الودجتات صحيحة شهرًا كاملًا حتى لو لم يُفتح التطبيق
export const WIDGET_DAYS = 30
const FIVE: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

export interface WidgetData {
  v: 1
  city: string | null
  /** sunrise: الشروق (للعرض فقط في ودجتات المواقيت الكاملة؛ ليس صلاة) */
  days: { hijri: string; prayers: { key: PrayerKey; label: string; at: number; time: string }[]; sunrise?: { at: number; time: string } }[]
}

export function buildWidgetData(settings: Settings, now = new Date()): WidgetData {
  const loc = settings.location
  if (!loc) return { v: 1, city: null, days: [] }
  const days = Array.from({ length: WIDGET_DAYS }, (_, i) => {
    const date = addDays(now, i)
    const times = prayerTimesFor(loc, dateParts(date, loc.tz), settings.prayer)
    return {
      hijri: formatHijri(date, loc.tz, settings.hijriOffset),
      prayers: FIVE.map((key) => ({ key, label: PRAYER_LABELS[key], at: times[key].getTime(), time: formatTime(times[key], loc.tz) })),
      sunrise: { at: times.sunrise.getTime(), time: formatTime(times.sunrise, loc.tz) },
    }
  })
  return { v: 1, city: loc.nameAr ?? loc.name, days }
}

// ---------- ودجت «آية اليوم والورد» ----------
export const DAILY_AYAH_MAX_CHARS = 200

export interface DailyWidgetData {
  v: 1
  /** آية كل يوم للأيام السبعة القادمة (بتاريخ المدينة)؛ النص من المصحف كما هو، ويُترك فارغًا إن طال عن مساحة الودجت بدل قصّه */
  days: { date: string; text: string | null; ref: string }[]
  /** حالة الورد عند آخر فتح للتطبيق */
  wird: { date: string; label: string; done: boolean; percent: number } | null
}

export function buildDailyWidgetData(
  quran: Pick<QuranData, 'verses' | 'meta'>,
  wird: { from: number; to: number; doneToday: boolean; percent: number } | null,
  tz: string | undefined,
  now = new Date(),
): DailyWidgetData {
  const days = Array.from({ length: WIDGET_DAYS }, (_, i) => {
    const date = dayKey(addDays(now, i), tz)
    const a = ayahOfDay(date)
    const text = quran.verses[a.surah - 1][a.ayah - 1]
    return { date, text: text.length <= DAILY_AYAH_MAX_CHARS ? text : null, ref: `سورة ${quran.meta.surahs[a.surah - 1].name} • الآية ${toArabicDigits(a.ayah)}` }
  })
  const w = wird ? { date: dayKey(now, tz), label: `الصفحات ${wird.from}–${wird.to}`, done: wird.doneToday, percent: Math.round(Math.max(0, Math.min(100, wird.percent))) } : null
  return { v: 1, days, wird: w }
}


// ---------- ودجتات الأذكار والدعاء و«الكل في واحد» وتغيير الآية ----------
/** ذكر للودجت: النص كما هو في المصدر الموثق، وعدد التكرار حين ورد، والمصدر */
export interface WidgetDhikr { t: string; c: number; s: string }
export interface ExtraWidgetData {
  v: 1
  adhkar: Record<'morning' | 'evening' | 'sleep', WidgetDhikr[]>
  duas: WidgetDhikr[]
  /** آيات قصيرة (لزر «آية أخرى») من قائمة آية اليوم نفسها */
  ayat: { t: string; ref: string; s: number; a: number }[]
  /** ذكر اليوم لثلاثين يومًا (ودجت «الكل في واحد») */
  dhikrDays: { date: string; t: string; s: string }[]
  /** عبارات قصيرة لودجت «البطاقات العصرية» (من عبارات التطبيق) */
  phrases: string[]
  /** حالة أذكار اليوم لودجت «الأذكار اليومية» */
  done: { date: string; morning: boolean; evening: boolean }
}

/** نص الذكر: نصه، أو آياته من المصحف كما هي؛ وإلا null (لا نص من عندنا) */
export function dhikrText(item: DhikrItem, quran: Pick<QuranData, 'verses'> | null): string | null {
  if (item.text) return item.text
  if (item.quran && quran) return item.quran.map((r) => quran.verses[r.surah - 1].slice(r.from - 1, r.to).join(' ')).join(' ')
  return null
}

export function buildExtraWidgetData(quran: Pick<QuranData, 'verses' | 'meta'> | null, tz: string | undefined, now = new Date(), doneCats: string[] = []): ExtraWidgetData {
  const toW = (it: DhikrItem): WidgetDhikr | null => {
    const t = dhikrText(it, quran)
    return t ? { t, c: Math.max(1, it.count ?? 1), s: it.source } : null
  }
  const cat = (id: string) => (ADHKAR.find((c) => c.id === id)?.items ?? []).map(toW).filter((x): x is WidgetDhikr => !!x)
  const duas = DUAS.filter((c) => ['sunnah', 'quran', 'istighfar', 'distress', 'general'].includes(c.id)).flatMap((c) => c.items).map(toW)
    .filter((x): x is WidgetDhikr => !!x && x.t.length <= 420)
  const ayat = quran ? AYAH_OF_DAY_REFS.map(([s, a]) => ({ s, a, t: quran.verses[s - 1][a - 1] }))
    .filter((x) => x.t.length <= DAILY_AYAH_MAX_CHARS)
    .map((x) => ({ ...x, ref: `سورة ${quran.meta.surahs[x.s - 1].name} • الآية ${toArabicDigits(x.a)}` })) : []
  const dhikrDays = Array.from({ length: WIDGET_DAYS }, (_, i) => {
    const date = dayKey(addDays(now, i), tz)
    const d = dhikrOfDay(date).item
    return { date, t: d.text ?? '', s: d.source }
  })
  const phrases = TV_PHRASES.filter((p) => p.length <= 40)
  const done = { date: dayKey(now, tz), morning: doneCats.includes('morning'), evening: doneCats.includes('evening') }
  return { v: 1, adhkar: { morning: cat('morning'), evening: cat('evening'), sleep: cat('sleep') }, duas, ayat, dhikrDays, phrases, done }
}
