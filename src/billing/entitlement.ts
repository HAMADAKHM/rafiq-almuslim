// قرار فتح مزايا «رفيق بلس»: المصدر هو المتجر دائمًا. النسخة المحفوظة على الجهاز تُستخدم فقط
// لفترة قصيرة دون إنترنت بعد آخر تحقق ناجح، ولا تفتح شيئًا بعد انتهاء الفترة المدفوعة.
import { NO_ENTITLEMENT, type Entitlement } from './types'

/** أقصى مدة يُعتمد فيها على آخر تحقق دون اتصال بالمتجر */
export const OFFLINE_GRACE_MS = 72 * 60 * 60_000

export interface CachedEntitlement { entitlement: Entitlement; verifiedAt: number }

/** هل الاستحقاق ساري الآن (نشط ولم تنتهِ فترته) */
export function isEntitled(e: Entitlement, now: number): boolean {
  return e.active && (e.expiresAt == null || e.expiresAt > now)
}

/** استحقاق محفوظ: لا يُقبل إلا إن كان التحقق حديثًا والفترة لم تنتهِ */
export function fromCache(c: CachedEntitlement | null, now: number): Entitlement {
  if (!c || !c.entitlement || typeof c.verifiedAt !== 'number') return NO_ENTITLEMENT
  if (c.verifiedAt > now || now - c.verifiedAt > OFFLINE_GRACE_MS) return NO_ENTITLEMENT
  return isEntitled(c.entitlement, now) ? c.entitlement : NO_ENTITLEMENT
}
