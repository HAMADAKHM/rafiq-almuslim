// تشغيل التذكيرات:
// - الويب: حلقة كل 20 ثانية تعرض التذكيرات المستحقة ما دام التطبيق مفتوحًا.
// - الهاتف: جدولة الأيام القادمة دفعة واحدة في نظام الإشعارات المحلية، وإعادة الجدولة عند الفتح وتغيير الإعدادات.
import { ensureNotificationChannels, isNative, platformName, replaceScheduledNotifications, showNotification } from '../platform'
import { channelsFor, loadDeviceNative, withAdhanSounds } from './adhan'
import { buildSchedule, dueReminders } from './reminders'
import type { Settings } from '../state/settings'
import { loadDoneToday, loadPosition } from './companionStore'

const fired = new Set<number>()

/** للاختبارات وللتوافق مع الإصدار 0.1: التذكيرات المستحقة الآن بصيغة مبسطة */
export function checkReminders(settings: Settings, now = new Date()): { title: string; body: string; tag: string }[] {
  const due = dueReminders(settings, now, fired)
  due.forEach((r) => fired.add(r.id))
  return due.map((r) => ({ title: r.title, body: r.body, tag: String(r.id) }))
}

export async function rescheduleNative(settings: Settings): Promise<number> {
  if (!isNative()) return 0
  // 7 أيام تكفي، وتُعاد الجدولة عند كل فتح للتطبيق (حد iOS: 64 إشعارًا)
  const platform = platformName() === 'ios' ? 'ios' : 'android'
  if (platform === 'android') await ensureNotificationChannels(channelsFor(settings))
  const device = await loadDeviceNative().catch(() => null)
  const [position, doneToday] = await Promise.all([loadPosition().catch(() => null), loadDoneToday(settings.location?.tz).catch(() => null)])
  return replaceScheduledNotifications(withAdhanSounds(buildSchedule(settings, new Date(), 7, { position, doneToday }), settings, platform, device))
}

export function startReminderLoop(getSettings: () => Settings): () => void {
  if (isNative()) return () => {}
  const tick = () => {
    try {
      for (const r of checkReminders(getSettings())) showNotification(r.title, r.body, r.tag)
    } catch {
      // لا نوقف الحلقة بسبب خطأ عابر
    }
  }
  tick()
  const id = window.setInterval(tick, 20_000)
  return () => window.clearInterval(id)
}
