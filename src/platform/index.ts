// طبقة المنصة: كل ما يعتمد على قدرات الجهاز يمر من هنا.
// في نسخة الويب نستخدم واجهات المتصفح؛ في Android/iOS (عبر Capacitor) تُستبدل هذه الدوال
// بإضافات أصلية (Local Notifications, Geolocation, Background Audio) دون تعديل الصفحات.

export interface GeoResult { lat: number; lng: number; accuracy: number }

export function getCurrentPosition(): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('المتصفح لا يدعم تحديد الموقع'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? 'لم يُسمح بالوصول إلى الموقع. يمكنك اختيار المدينة يدويًا.' : 'تعذر تحديد الموقع حاليًا. حاول مجددًا أو اختر المدينة يدويًا.')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    )
  })
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// ---------- الإشعارات ----------
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function showNotification(title: string, body: string, tag?: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.getRegistration?.()
  if (reg) await reg.showNotification(title, { body, tag, icon: '/icon-192.png', lang: 'ar', dir: 'rtl' })
  else new Notification(title, { body, tag, lang: 'ar', dir: 'rtl' })
}

// ---------- المشاركة والنسخ ----------
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'failed'
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed'
}

// ---------- البوصلة ----------
type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number }

export function compassAvailable(): boolean {
  return typeof window !== 'undefined' && ('ondeviceorientationabsolute' in window || 'ondeviceorientation' in window)
}

/** يبدأ قراءة اتجاه الجهاز (بالدرجات من الشمال). يعيد دالة للإيقاف. */
export async function watchHeading(cb: (heading: number | null) => void): Promise<() => void> {
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
  if (DOE?.requestPermission) {
    const res = await DOE.requestPermission() // iOS يتطلب إذنًا صريحًا
    if (res !== 'granted') throw new Error('لم يُسمح بالوصول إلى مستشعر الاتجاه')
  }
  const handler = (e: Event) => {
    const ev = e as OrientationEventWithCompass
    if (typeof ev.webkitCompassHeading === 'number') cb(ev.webkitCompassHeading)
    else if (ev.absolute && typeof ev.alpha === 'number') cb((360 - ev.alpha) % 360)
    else cb(null)
  }
  const type = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
  window.addEventListener(type, handler)
  return () => window.removeEventListener(type, handler)
}
