// طبقة المنصة: كل ما يعتمد على قدرات الجهاز يمر من هنا.
// - في المتصفح: واجهات الويب.
// - في Android/iOS (Capacitor): الإضافات الأصلية (إشعارات محلية مجدولة، موقع، مشاركة، اهتزاز).
// الصفحات لا تعرف على أي منصة تعمل.
import { Capacitor } from '@capacitor/core'
import type { Reminder } from '../services/reminders'
import { SNOOZE_ID_BASE } from '../services/companion'

export const isNative = () => Capacitor.isNativePlatform()
export const platformName = () => Capacitor.getPlatform() as 'web' | 'android' | 'ios'

export interface GeoResult { lat: number; lng: number; accuracy: number }

export async function getCurrentPosition(): Promise<GeoResult> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    try {
      const perm = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] })
      if (perm.coarseLocation === 'denied' && perm.location === 'denied') throw new Error('denied')
      const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 })
      return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }
    } catch (e) {
      throw new Error((e as Error).message === 'denied' ? 'لم يُسمح بالوصول إلى الموقع. يمكنك اختيار المدينة يدويًا.' : 'تعذر تحديد الموقع حاليًا. حاول مجددًا أو اختر المدينة يدويًا.')
    }
  }
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
export type NotifPermission = NotificationPermission | 'unsupported'

export function notificationsSupported(): boolean {
  return isNative() || (typeof window !== 'undefined' && 'Notification' in window)
}

export async function notificationPermission(): Promise<NotifPermission> {
  if (isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const p = await LocalNotifications.checkPermissions()
    return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'default'
  }
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const p = await LocalNotifications.requestPermissions()
    return p.display === 'granted' ? 'granted' : 'denied'
  }
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function showNotification(title: string, body: string, tag?: string) {
  if (isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({ notifications: [{ id: Math.floor(Date.now() % 2_000_000_000), title, body }] })
    return
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.getRegistration?.()
  if (reg) await reg.showNotification(title, { body, tag, icon: import.meta.env.BASE_URL + 'icon-192.png', lang: 'ar', dir: 'rtl' })
  else new Notification(title, { body, tag, lang: 'ar', dir: 'rtl' })
}

/**
 * على الهاتف: يستبدل كل الإشعارات المجدولة بالجدول الجديد (يُستدعى عند فتح التطبيق، وعند تغيير المدينة
 * أو الإعدادات). Android يعيد جدولتها بعد إعادة تشغيل الجهاز عبر الإضافة نفسها.
 * في الويب لا يفعل شيئًا (التذكير يتم والتطبيق مفتوح).
 */
export async function replaceScheduledNotifications(list: Reminder[]): Promise<number> {
  if (!isNative()) return 0
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await registerNotificationActions()
  const pending = await LocalNotifications.getPending()
  // «ذكّرني لاحقًا» يبقى كما هو؛ كل ما عداه يُستبدل بالجدول الجديد (لا تكرار ولا مواعيد قديمة)
  const stale = pending.notifications.filter((n) => n.id < SNOOZE_ID_BASE)
  if (stale.length) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) })
  if (!list.length) return 0
  const android = platformName() === 'android'
  await LocalNotifications.schedule({
    notifications: list.map((r) => ({
      id: r.id, title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true },
      extra: { route: r.route, kind: r.kind, ...(r.itemId ? { itemId: r.itemId } : {}) },
      ...(r.actions ? { actionTypeId: ACTION_TYPES[r.actions] } : {}),
      ...(r.channelId ? { channelId: r.channelId } : android && r.actions ? { channelId: r.silent ? COMPANION_SILENT_CHANNEL : COMPANION_CHANNEL } : {}),
      ...(r.sound ? { sound: r.sound } : {}),
      ...(r.body.length > 60 ? { largeBody: r.body } : {}),
    })),
  })
  return list.length
}

export const COMPANION_CHANNEL = 'rafiq-companion-v1'
export const COMPANION_SILENT_CHANNEL = 'rafiq-companion-silent-v1'
const ACTION_TYPES = { dhikr: 'RAFIQ_DHIKR', quran: 'RAFIQ_QURAN' } as const
let actionsRegistered = false

/** أزرار الإشعارات وقناتا «رفيقي يذكّرني» (بصوت الإشعار الافتراضي في النظام، وبلا صوت) */
async function registerNotificationActions() {
  if (actionsRegistered) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.registerActionTypes({
    types: [
      { id: ACTION_TYPES.dhikr, actions: [{ id: 'open', title: 'افتح الذكر', foreground: true }, { id: 'done', title: 'تمّ' }] },
      { id: ACTION_TYPES.quran, actions: [{ id: 'open', title: 'افتح المصحف', foreground: true }, { id: 'snooze', title: 'ذكّرني لاحقًا' }] },
    ],
  }).catch(() => {})
  if (platformName() === 'android') {
    // بلا حقل sound تستخدم القناة نغمة الإشعار الافتراضية التي اختارها المستخدم في النظام
    await LocalNotifications.createChannel({ id: COMPANION_CHANNEL, name: 'رفيقي يذكّرني', description: 'تذكير الأذكار وموعد القرآن بنغمة الإشعار', importance: 4, visibility: 1, vibration: true }).catch(() => {})
    await LocalNotifications.createChannel({ id: COMPANION_SILENT_CHANNEL, name: 'رفيقي يذكّرني — بلا صوت', description: 'إشعار مكتوب فقط', importance: 2, visibility: 1, vibration: false }).catch(() => {})
  }
  actionsRegistered = true
}

/** جدولة إشعار «ذكّرني لاحقًا» منفصل لا تلغيه إعادة الجدولة */
export async function scheduleSnooze(r: { id: number; at: Date; title: string; body: string; route: string; silent?: boolean }) {
  if (!isNative()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await registerNotificationActions()
  await LocalNotifications.schedule({
    notifications: [{
      id: r.id, title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true }, extra: { route: r.route, kind: 'quran-time' }, actionTypeId: ACTION_TYPES.quran,
      ...(platformName() === 'android' ? { channelId: r.silent ? COMPANION_SILENT_CHANNEL : COMPANION_CHANNEL } : {}),
    }],
  })
}

/** إنشاء قنوات الإشعارات (Android فقط). إنشاء قناة موجودة لا يغيّرها، لذا تحمل المعرفات رقم إصدار. */
export async function ensureNotificationChannels(channels: { id: string; name: string; description: string; sound: string; importance: 5 }[]) {
  if (platformName() !== 'android' || !channels.length) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  for (const c of channels) await LocalNotifications.createChannel({ ...c, visibility: 1, vibration: true })
}

/** Android 12+: هل يُسمح بالتنبيه في الدقيقة المحددة؟ (بدونه قد يتأخر الإشعار دقائق) */
export async function exactAlarmStatus(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (platformName() !== 'android') return 'unsupported'
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const r = await LocalNotifications.checkExactNotificationSetting()
    return r.exact_alarm === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

/** يفتح إعداد النظام للسماح بالتنبيه في الوقت الدقيق */
export async function requestExactAlarm(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (platformName() !== 'android') return 'unsupported'
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const r = await LocalNotifications.changeExactNotificationSetting()
  return r.exact_alarm === 'granted' ? 'granted' : 'denied'
}

/** فتح الصفحة المناسبة عند الضغط على إشعار على الهاتف */
export interface NotificationTap { route?: string; kind?: string; itemId?: string; actionId: string; title: string; body: string }

export async function onNotificationTap(cb: (route: string, tap: NotificationTap) => void): Promise<() => void> {
  if (!isNative()) return () => {}
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const h = await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const extra = (e.notification.extra ?? {}) as { route?: string; kind?: string; itemId?: string }
    cb(extra.route ?? '', { ...extra, actionId: e.actionId, title: e.notification.title ?? '', body: e.notification.body ?? '' })
  })
  return () => { h.remove() }
}

/** تنفيذ دالة عند عودة التطبيق إلى الواجهة (لإعادة الجدولة بعد تغيّر التاريخ أو المنطقة الزمنية) */
export async function onAppResume(cb: () => void): Promise<() => void> {
  if (isNative()) {
    const { App } = await import('@capacitor/app')
    const h = await App.addListener('resume', cb)
    return () => { h.remove() }
  }
  const vis = () => { if (document.visibilityState === 'visible') cb() }
  document.addEventListener('visibilitychange', vis)
  return () => document.removeEventListener('visibilitychange', vis)
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
  if (isNative()) {
    const { Share } = await import('@capacitor/share')
    try { await Share.share({ title, text }); return 'shared' } catch { return 'failed' }
  }
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

/** مشاركة صورة (بطاقة) عبر واجهة المشاركة الأصلية، أو تنزيلها إن لم تتوفر المشاركة */
export async function shareImage(blob: Blob, fileName: string, title: string): Promise<'shared' | 'downloaded' | 'failed'> {
  if (isNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const data = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob) })
    const saved = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache })
    try { await Share.share({ title, files: [saved.uri] }); return 'shared' } catch { return 'failed' }
  }
  const file = new File([blob], fileName, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared' } catch (e) { if ((e as Error).name === 'AbortError') return 'failed' }
  }
  try {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

// ---------- الاهتزاز ----------
export async function vibrate(pattern: 'tap' | 'goal') {
  if (isNative()) {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (pattern === 'tap') await Haptics.impact({ style: ImpactStyle.Light })
    else await Haptics.notification({ type: NotificationType.Success })
    return
  }
  navigator.vibrate?.(pattern === 'tap' ? 15 : [60, 60, 120])
}

// ---------- البوصلة ----------
type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number }

export function compassAvailable(): boolean {
  return typeof window !== 'undefined' && ('ondeviceorientationabsolute' in window || 'ondeviceorientation' in window)
}

export interface HeadingReading { heading: number | null; accuracy: number | null; absolute: boolean }

/** يبدأ قراءة اتجاه الجهاز (بالدرجات من الشمال). يعيد دالة للإيقاف. */
export async function watchHeading(cb: (r: HeadingReading) => void): Promise<() => void> {
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
  if (DOE?.requestPermission) {
    const res = await DOE.requestPermission() // iOS يتطلب إذنًا صريحًا
    if (res !== 'granted') throw new Error('لم يُسمح بالوصول إلى مستشعر الاتجاه')
  }
  const handler = (e: Event) => {
    const ev = e as OrientationEventWithCompass
    if (typeof ev.webkitCompassHeading === 'number') cb({ heading: ev.webkitCompassHeading, accuracy: ev.webkitCompassAccuracy ?? null, absolute: true })
    else if (ev.absolute && typeof ev.alpha === 'number') cb({ heading: (360 - ev.alpha) % 360, accuracy: null, absolute: true })
    else cb({ heading: null, accuracy: null, absolute: false })
  }
  const type = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
  window.addEventListener(type, handler)
  return () => window.removeEventListener(type, handler)
}
