// جسر ودجت Android: يرسل بيانات المواقيت إلى الإضافة الأصلية PrayerWidget (android/app/.../WidgetBridgePlugin.java).
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'
import { buildWidgetData } from '../services/widget'
import type { Settings } from '../state/settings'

const PrayerWidget = registerPlugin<{ update(o: { data: string }): Promise<void> }>('PrayerWidget')

export async function updatePrayerWidget(settings: Settings): Promise<void> {
  if (platformName() !== 'android') return
  await PrayerWidget.update({ data: JSON.stringify(buildWidgetData(settings)) })
}
