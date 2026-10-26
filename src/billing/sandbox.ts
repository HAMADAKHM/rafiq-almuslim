// متجر الاختبار: يحاكي اشتراك المتجر الشهري دون أي دفع حقيقي، لتجربة الشراء والاستعادة والإلغاء والانتهاء.
// مثل حسابات الاختبار في Google Play: «الشهر» يُختصر إلى 5 دقائق، ويتجدد حتى يُلغى.
// لا يعمل في النسخ المنشورة: يُفعَّل فقط في بيئة التطوير أو نسخ الاختبار (VITE_BILLING_SANDBOX=1).
import { kv } from '../db/repos'
import { BillingError, NO_ENTITLEMENT, PRODUCT_ID, type BillingProvider, type Entitlement, type Offer } from './types'

export const SANDBOX_PERIOD_MS = 5 * 60_000
const STORE_KEY = 'billing:sandbox-store'

/** «سجل المتجر» (يقابل خادم المتجر): بداية الاشتراك، وهل أُلغي التجديد */
interface SandboxRecord { startedAt: number; cancelledAt: number | null }
/** أعطال يُطلب محاكاتها في الاختبار */
export interface SandboxFaults { offline: boolean; declined: boolean }

export function sandboxEntitlement(r: SandboxRecord | null, now: number): Entitlement {
  if (!r) return NO_ENTITLEMENT
  // يتجدد كل فترة ما لم يُلغَ؛ بعد الإلغاء ينتهي في نهاية الفترة الجارية
  const end = (t: number) => r.startedAt + Math.ceil(Math.max(1, t - r.startedAt) / SANDBOX_PERIOD_MS) * SANDBOX_PERIOD_MS
  const expiresAt = r.cancelledAt != null ? end(r.cancelledAt) : end(now)
  return { active: expiresAt > now, productId: PRODUCT_ID, expiresAt, willRenew: r.cancelledAt == null, manageUrl: null }
}

export function createSandbox(clock: () => number = Date.now): BillingProvider & {
  faults: SandboxFaults
  cancel(): Promise<void>
  reset(): Promise<void>
} {
  const faults: SandboxFaults = { offline: false, declined: false }
  const read = () => kv.get<SandboxRecord | null>(STORE_KEY, null)
  const check = () => { if (faults.offline) throw new BillingError('offline', 'لا يوجد اتصال بالإنترنت') }
  return {
    id: 'sandbox',
    test: true,
    faults,
    async init() {},
    async getOffer(): Promise<Offer> {
      check()
      return { productId: PRODUCT_ID, priceString: '9.99 ₪', currency: 'ILS', period: 'month', renewing: true }
    },
    async getEntitlement() { check(); return sandboxEntitlement(await read(), clock()) },
    async purchase() {
      check()
      if (faults.declined) throw new BillingError('payment', 'رُفضت عملية الدفع')
      const cur = sandboxEntitlement(await read(), clock())
      if (!cur.active || !cur.willRenew) await kv.set(STORE_KEY, { startedAt: clock(), cancelledAt: null } satisfies SandboxRecord)
      return sandboxEntitlement(await read(), clock())
    },
    async restore() { check(); return sandboxEntitlement(await read(), clock()) },
    /** يقابل «إلغاء الاشتراك» من إعدادات المتجر */
    async cancel() {
      const r = await read()
      if (r && r.cancelledAt == null) await kv.set(STORE_KEY, { ...r, cancelledAt: clock() })
    },
    async reset() { await kv.set(STORE_KEY, null) },
  }
}
