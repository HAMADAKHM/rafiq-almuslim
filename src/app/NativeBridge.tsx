import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../state/SettingsContext'
import { onChange } from '../db/events'
import { isNative, onAppResume, onNotificationTap, scheduleSnooze } from '../platform'
import { markDhikrDone } from '../services/companionStore'
import { snoozeId } from '../services/companion'
import { toast } from '../hooks'
import { rescheduleNative } from '../services/notifications'
import { usePlus } from '../billing/PlusContext'
import { consumeWidgetRoute, updateDailyWidget, updatePlusWidgets, updatePrayerWidget, updateResumeWidget } from '../platform/widget'

/**
 * جسر المنصة الأصلية (Android/iOS) — لا يفعل شيئًا في المتصفح:
 * - يعيد جدولة الإشعارات عند تغيّر الإعدادات أو المدينة، وعند عودة التطبيق للواجهة
 *   (يغطي تغيّر التاريخ أو المنطقة الزمنية أو انتهاء الأيام المجدولة).
 * - يفتح الصفحة المناسبة عند الضغط على إشعار.
 * - يحدّث بيانات ودجت المواقيت وودجت «آية اليوم والورد» على Android.
 */
export function NativeBridge() {
  const nav = useNavigate()
  const { settings, ready } = useSettings()
  const { entitled } = usePlus()
  const latest = useRef(settings)
  useEffect(() => { latest.current = settings }, [settings])

  useEffect(() => {
    if (!ready || !isNative()) return
    const t = setTimeout(() => { rescheduleNative(settings).catch(() => {}); updatePrayerWidget(settings).catch(() => {}); updateDailyWidget(settings).catch(() => {}) }, 800)
    return () => clearTimeout(t)
  }, [ready, settings.notifications, settings.location, settings.prayer, settings.hijriOffset, settings.customReminders, settings.companion, entitled]) // eslint-disable-line react-hooks/exhaustive-deps

  // ودجتات رفيق بلس: عند تغيّر الاشتراك أو المدينة
  const plusRef = useRef(entitled)
  useEffect(() => { plusRef.current = entitled }, [entitled])
  useEffect(() => {
    if (!ready || !isNative()) return
    const t = setTimeout(() => { updatePlusWidgets(settings, entitled).catch(() => {}); updateResumeWidget(settings, entitled).catch(() => {}) }, 1200)
    return () => clearTimeout(t)
  }, [ready, entitled, settings.location]) // eslint-disable-line react-hooks/exhaustive-deps

  // تحديث ودجت الورد بعد تسجيل القراءة (بتأخير يجمع التغييرات المتتالية)
  useEffect(() => {
    if (!isNative()) return
    let t: ReturnType<typeof setTimeout> | undefined
    let r: ReturnType<typeof setTimeout> | undefined
    const off = onChange((topic) => {
      // موضع القراءة الفعلية والأذكار المكتملة يغيّران نص إشعارات «رفيقي يذكّرني»
      if (topic === 'kv:quran:actual' || topic === 'kv:companion:done') {
        clearTimeout(r)
        r = setTimeout(() => { rescheduleNative(latest.current).catch(() => {}); updateResumeWidget(latest.current, plusRef.current).catch(() => {}) }, 2500)
        return
      }
      if (topic !== 'kv:khatmas' && topic !== 'adhkarLog' && topic !== 'readLog') return
      clearTimeout(t)
      t = setTimeout(() => { updateDailyWidget(latest.current).catch(() => {}); updatePlusWidgets(latest.current, plusRef.current).catch(() => {}); updateResumeWidget(latest.current, plusRef.current).catch(() => {}) }, 1500)
    })
    return () => { off(); clearTimeout(t); clearTimeout(r) }
  }, [])

  useEffect(() => {
    if (!isNative()) return
    let offTap = () => {}
    let offResume = () => {}
    onNotificationTap((route, tap) => {
      if (tap.actionId === 'done' && tap.itemId) {
        markDhikrDone(tap.itemId, latest.current.location?.tz).then(() => toast('سُجّل الذكر — جزاك الله خيرًا')).catch(() => {})
        return
      }
      if (tap.actionId === 'snooze') {
        const mins = Math.max(5, latest.current.companion?.quran.snoozeMinutes ?? 15)
        const at = new Date(Date.now() + mins * 60_000)
        scheduleSnooze({ id: snoozeId(at), at, title: tap.title || 'حان موعدك مع القرآن', body: tap.body, route: route || '/quran', silent: !latest.current.companion?.quran.sound })
          .then(() => toast(`سنذكّرك بعد ${mins} دقيقة`)).catch(() => {})
        return
      }
      if (route) nav(route)
    }).then((f) => { offTap = f })
    // الضغط على ودجت «أكمل من حيث وصلت»: يفتح المصحف على الموضع المحفوظ (عند الفتح وعند العودة)
    const openWidgetRoute = () => { consumeWidgetRoute().then((r) => { if (r) nav(r) }).catch(() => {}) }
    openWidgetRoute()
    onAppResume(() => { openWidgetRoute(); rescheduleNative(latest.current).catch(() => {}); updatePrayerWidget(latest.current).catch(() => {}); updateDailyWidget(latest.current).catch(() => {}); updatePlusWidgets(latest.current, plusRef.current).catch(() => {}) }).then((f) => { offResume = f })
    return () => { offTap(); offResume() }
  }, [nav])

  return null
}
