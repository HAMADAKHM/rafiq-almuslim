import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../state/SettingsContext'
import { onChange } from '../db/events'
import { isNative, onAppResume, onNotificationTap } from '../platform'
import { rescheduleNative } from '../services/notifications'
import { updateDailyWidget, updatePrayerWidget } from '../platform/widget'

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
  const latest = useRef(settings)
  useEffect(() => { latest.current = settings }, [settings])

  useEffect(() => {
    if (!ready || !isNative()) return
    const t = setTimeout(() => { rescheduleNative(settings).catch(() => {}); updatePrayerWidget(settings).catch(() => {}); updateDailyWidget(settings).catch(() => {}) }, 800)
    return () => clearTimeout(t)
  }, [ready, settings.notifications, settings.location, settings.prayer, settings.hijriOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  // تحديث ودجت الورد بعد تسجيل القراءة (بتأخير يجمع التغييرات المتتالية)
  useEffect(() => {
    if (!isNative()) return
    let t: ReturnType<typeof setTimeout> | undefined
    const off = onChange((topic) => {
      if (topic !== 'kv:khatmas') return
      clearTimeout(t)
      t = setTimeout(() => { updateDailyWidget(latest.current).catch(() => {}) }, 1500)
    })
    return () => { off(); clearTimeout(t) }
  }, [])

  useEffect(() => {
    if (!isNative()) return
    let offTap = () => {}
    let offResume = () => {}
    onNotificationTap((route) => nav(route)).then((f) => { offTap = f })
    onAppResume(() => { rescheduleNative(latest.current).catch(() => {}); updatePrayerWidget(latest.current).catch(() => {}); updateDailyWidget(latest.current).catch(() => {}) }).then((f) => { offResume = f })
    return () => { offTap(); offResume() }
  }, [nav])

  return null
}
