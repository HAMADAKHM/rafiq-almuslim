// اختيار مزوّد الاشتراك:
// - على الهاتف مع مفتاح RevenueCat العام: المتجر الحقيقي.
// - في التطوير ونسخ الاختبار (VITE_BILLING_SANDBOX=1): متجر الاختبار، بلا أي دفع.
// - غير ذلك: الاشتراك غير متاح، ولا تُفتح أي ميزة مدفوعة (والتطبيق المجاني يعمل كاملًا).
import { Capacitor } from '@capacitor/core'
import { createRevenueCat, storeKey } from './revenuecat'
import { createSandbox } from './sandbox'
import { BillingError, NO_ENTITLEMENT, type BillingProvider } from './types'

export const sandboxEnabled = () => import.meta.env.DEV || import.meta.env.VITE_BILLING_SANDBOX === '1'

const unavailable: BillingProvider = {
  id: 'none',
  test: false,
  async init() {},
  async getOffer() { return null },
  async getEntitlement() { return NO_ENTITLEMENT },
  async purchase() { throw new BillingError('unavailable', 'الاشتراك غير متاح بعد في هذه النسخة') },
  async restore() { return NO_ENTITLEMENT },
}

let provider: BillingProvider | null = null
export function billing(): BillingProvider {
  if (provider) return provider
  const key = Capacitor.isNativePlatform() ? storeKey() : null
  provider = key ? createRevenueCat(key) : sandboxEnabled() ? createSandbox() : unavailable
  return provider
}

/** للاختبارات فقط */
export function setBillingForTests(p: BillingProvider | null) { provider = p }

export * from './types'
