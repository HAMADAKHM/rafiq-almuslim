import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../state/SettingsContext'
import { isNative, onAppResume, onNotificationTap } from '../platform'
import { rescheduleNative } from '../services/notifications'

/**
 * جسر المنصة الأصلية (Android/iOS) — لا يفعل شيئًا في المتصفح:
 * - يعيد جدولة الإشعارات عند تغيّر الإعدادات أو المدينة، وعند عودة التطبيق للواجهة
 *   (يغطي تغيّر التاريخ أو المنطقة الزمنية أو انتهاء الأيام المجدولة).
 * - يفتح الصفحة المناسبة عند الضغط على إشعار.
 */
export function NativeBridge() {
  const nav = useNavigate()
  const { settings, ready } = useSettings()
  const latest = useRef(settings)
  useEffect(() => { latest.current = settings }, [settings])

  useEffect(() => {
    if (!ready || !isNative()) return
    const t = setTimeout(() => { rescheduleNative(settings).catch(() => {}) }, 800)
    return () => clearTimeout(t)
  }, [ready, settings.notifications, settings.location, settings.prayer, settings.hijriOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isNative()) return
    let offTap = () => {}
    let offResume = () => {}
    onNotificationTap((route) => nav(route)).then((f) => { offTap = f })
    onAppResume(() => { rescheduleNative(latest.current).catch(() => {}) }).then((f) => { offResume = f })
    return () => { offTap(); offResume() }
  }, [nav])

  return null
}
