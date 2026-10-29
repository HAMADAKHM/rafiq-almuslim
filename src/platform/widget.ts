// جسر ودجت Android: يرسل بيانات المواقيت إلى الإضافة الأصلية PrayerWidget (android/app/.../WidgetBridgePlugin.java).
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'
import { buildDailyWidgetData, buildWidgetData } from '../services/widget'
import { loadQuran } from '../services/quran'
import { activePlan, dailyTarget, loadKhatmas, progress } from '../services/khatma'
import { dayKey } from '../lib/dates'
import { toArabicDigits } from '../lib/arabic'
import type { Settings } from '../state/settings'

const PrayerWidget = registerPlugin<{
  update(o: { data: string }): Promise<void>; updateDaily(o: { data: string }): Promise<void>; updatePlus(o: { data: string }): Promise<void>
  updateResume(o: { data: string }): Promise<void>; consumeRoute(): Promise<{ route?: string | null }>
  setStyle(o: { style: string }): Promise<void>; getStyle(): Promise<{ style: string }>
}>('PrayerWidget')

/** «تصميم الودجت» (رفيق بلس): خلفية كل ودجتات Android */
export async function getWidgetStyle(): Promise<string> {
  if (platformName() !== 'android') return 'emerald'
  try { return (await PrayerWidget.getStyle()).style || 'emerald' } catch { return 'emerald' }
}
export async function setWidgetStyle(style: string): Promise<boolean> {
  if (platformName() !== 'android') return false
  try { await PrayerWidget.setStyle({ style }); return true } catch { return false }
}

/** ودجت «أكمل من حيث وصلت» (رفيق بلس): آخر قراءة فعلية وتقدّم الختمة */
export async function updateResumeWidget(settings: Settings, entitled: boolean): Promise<void> {
  if (platformName() !== 'android') return
  const [{ loadPosition }, { buildResumeWidgetData }, k] = await Promise.all([import('../services/companionStore'), import('../services/companion'), loadKhatmas()])
  const plan = activePlan(k)
  const pos = entitled ? await loadPosition() : null
  await PrayerWidget.updateResume({ data: JSON.stringify(buildResumeWidgetData(pos, plan ? progress(plan) * 100 : null, entitled, settings.location?.tz)) })
}

/** المسار الذي فتحه الضغط على ودجت (مرة واحدة) */
export async function consumeWidgetRoute(): Promise<string | null> {
  if (platformName() !== 'android') return null
  try {
    const r = await PrayerWidget.consumeRoute()
    return r.route && r.route.startsWith('/') && !r.route.startsWith('//') ? r.route : null
  } catch {
    return null
  }
}

export async function updatePrayerWidget(settings: Settings): Promise<void> {
  if (platformName() !== 'android') return
  await PrayerWidget.update({ data: JSON.stringify(buildWidgetData(settings)) })
}

/** ودجت «آية اليوم والورد»: آيات الأيام السبعة القادمة وحالة ورد اليوم */
export async function updateDailyWidget(settings: Settings): Promise<void> {
  if (platformName() !== 'android') return
  const tz = settings.location?.tz
  const [quran, k] = await Promise.all([loadQuran(), loadKhatmas()])
  const plan = activePlan(k)
  const t = plan ? dailyTarget(plan, dayKey(new Date(), tz)) : null
  const wird = plan && t ? { from: t.from, to: t.to, doneToday: t.doneToday >= t.pages, percent: progress(plan) * 100 } : null
  await PrayerWidget.updateDaily({ data: JSON.stringify(buildDailyWidgetData(quran, wird, tz)) })
}

/** ودجتات رفيق بلس: الطقس والصلاة القادمة، والتقدّم (الأيام المتتالية والورد والأذكار). دون اشتراك تعرض «من مزايا رفيق بلس» */
export async function updatePlusWidgets(settings: Settings, entitled: boolean): Promise<void> {
  if (platformName() !== 'android') return
  if (!entitled) { await PrayerWidget.updatePlus({ data: JSON.stringify({ entitled: false }) }); return }
  const tz = settings.location?.tz
  const today = dayKey(new Date(), tz)
  const [{ getWeather }, { computeInsights }, repos, k, quran] = await Promise.all([
    import('../services/weather'), import('../services/insights'), import('../db/repos'), loadKhatmas(), loadQuran(),
  ])
  let weather: Record<string, string> | null = null
  if (settings.location) {
    try {
      const w = await getWeather(settings.location.lat, settings.location.lng)
      weather = { icon: w.icon, temp: toArabicDigits(w.temp), label: w.label, range: `${toArabicDigits(w.high)}° / ${toArabicDigits(w.low)}°`, city: settings.location.nameAr ?? settings.location.name }
    } catch { weather = null }
  }
  const [read, listen, adhkar, memoLogs] = await Promise.all([repos.reading.all(), repos.listening.all(), repos.adhkarLog.all(), repos.memo.logs()])
  const ins = computeInsights({ read, listen, adhkar, memo: memoLogs }, today, quran.meta.surahs.map((x) => x.count))
  const plan = activePlan(k)
  const t = plan ? dailyTarget(plan, today) : null
  const todays = new Set(adhkar.filter((a) => a.date === today).map((a) => a.category))
  const progressData = {
    date: today,
    streak: toArabicDigits(ins.currentStreak),
    wird: plan && t ? `الصفحات ${toArabicDigits(t.from)}–${toArabicDigits(t.to)}` : null,
    wirdDone: !!(t && t.doneToday >= t.pages),
    percent: plan ? Math.round(progress(plan) * 100) : 0,
    morning: todays.has('morning'),
    evening: todays.has('evening'),
  }
  // رمضان: أيام الشهر المتبقية (الفجر والمغرب) ليحسب الودجت العدّ بنفسه، وخارجه الأيام المتبقية
  const { ramadanStatus, ramadanTable } = await import('../services/ramadan')
  const { formatTime } = await import('../lib/dates')
  const rs = ramadanStatus(new Date(), tz, settings.hijriOffset)
  const rt = rs.inRamadan ? ramadanTable(settings, rs.start, 0).filter((d) => d.maghrib.getTime() > Date.now()) : []
  const ramadan = {
    label: rs.inRamadan ? '' : rs.daysUntil != null ? `بقي نحو ${toArabicDigits(rs.daysUntil)} يومًا` : '',
    days: rt.map((d) => ({ day: d.day, fajr: d.fajr.getTime(), maghrib: d.maghrib.getTime(), fajrTime: formatTime(d.fajr, tz), maghribTime: formatTime(d.maghrib, tz) })),
  }
  await PrayerWidget.updatePlus({ data: JSON.stringify({ entitled: true, weather, progress: progressData, ramadan }) })
}
