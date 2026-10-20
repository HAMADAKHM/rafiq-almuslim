// جسر ودجت Android: يرسل بيانات المواقيت إلى الإضافة الأصلية PrayerWidget (android/app/.../WidgetBridgePlugin.java).
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'
import { buildDailyWidgetData, buildWidgetData } from '../services/widget'
import { loadQuran } from '../services/quran'
import { activePlan, dailyTarget, loadKhatmas, progress } from '../services/khatma'
import { dayKey } from '../lib/dates'
import type { Settings } from '../state/settings'

const PrayerWidget = registerPlugin<{ update(o: { data: string }): Promise<void>; updateDaily(o: { data: string }): Promise<void> }>('PrayerWidget')

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
