// المتجر الحقيقي (Google Play وApp Store) عبر RevenueCat: يتحقق من الإيصالات على خوادمه، فلا
// مفاتيح سرية في التطبيق. يكفي المفتاح العام للتطبيق (VITE_RC_ANDROID_KEY / VITE_RC_IOS_KEY).
import { Capacitor } from '@capacitor/core'
import { BillingError, ENTITLEMENT_ID, NO_ENTITLEMENT, PRODUCT_ID, APP_PACKAGE, type BillingProvider, type Entitlement, type Offer } from './types'

type RC = typeof import('@revenuecat/purchases-capacitor')
type CustomerInfo = import('@revenuecat/purchases-capacitor').CustomerInfo
type Pkg = import('@revenuecat/purchases-capacitor').PurchasesPackage

export function storeKey(): string | null {
  const p = Capacitor.getPlatform()
  const k = p === 'android' ? import.meta.env.VITE_RC_ANDROID_KEY : p === 'ios' ? import.meta.env.VITE_RC_IOS_KEY : undefined
  return typeof k === 'string' && k.length > 10 ? k : null
}

function manageUrlFor(info: CustomerInfo | null): string {
  if (info?.managementURL) return info.managementURL
  return Capacitor.getPlatform() === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : `https://play.google.com/store/account/subscriptions?sku=${PRODUCT_ID}&package=${APP_PACKAGE}`
}

function toEntitlement(info: CustomerInfo): Entitlement {
  const e = info.entitlements.active[ENTITLEMENT_ID]
  if (!e || !e.isActive) return { ...NO_ENTITLEMENT, manageUrl: manageUrlFor(info) }
  return {
    active: true,
    productId: e.productIdentifier,
    expiresAt: e.expirationDate ? Date.parse(e.expirationDate) : null,
    willRenew: e.willRenew,
    manageUrl: manageUrlFor(info),
  }
}

function toError(e: unknown): BillingError {
  const x = e as { code?: string | number; userCancelled?: boolean | null; message?: string }
  const code = String(x?.code ?? '')
  if (x?.userCancelled || code === '1') return new BillingError('cancelled', 'أُلغيت العملية')
  if (code === '10' || code === '35') return new BillingError('offline', 'تعذر الاتصال بالمتجر — تحقق من الإنترنت')
  if (code === '2' || code === '3' || code === '4' || code === '6') return new BillingError('payment', 'لم تكتمل عملية الدفع في المتجر')
  if (code === '5' || code === '9' || code === '23') return new BillingError('unavailable', 'الاشتراك غير متاح حاليًا في المتجر')
  return new BillingError('unknown', x?.message || 'حدث خطأ غير متوقع')
}

export function createRevenueCat(apiKey: string): BillingProvider {
  let rc: RC | null = null
  let pkg: Pkg | null = null
  const lib = async () => (rc ??= await import('@revenuecat/purchases-capacitor'))
  return {
    id: 'store',
    test: false,
    async init() {
      const { Purchases } = await lib()
      await Purchases.configure({ apiKey })
    },
    async getOffer(): Promise<Offer | null> {
      try {
        const { Purchases } = await lib()
        const offerings = await Purchases.getOfferings()
        const cur = offerings.current
        pkg = cur?.monthly ?? cur?.availablePackages.find((p) => p.product.identifier.startsWith(PRODUCT_ID)) ?? cur?.availablePackages[0] ?? null
        if (!pkg) return null
        return { productId: pkg.product.identifier, priceString: pkg.product.priceString, currency: pkg.product.currencyCode, period: 'month', renewing: true }
      } catch (e) { throw toError(e) }
    },
    async getEntitlement() {
      try {
        const { Purchases } = await lib()
        return toEntitlement((await Purchases.getCustomerInfo()).customerInfo)
      } catch (e) { throw toError(e) }
    },
    async purchase() {
      if (!pkg) await this.getOffer()
      if (!pkg) throw new BillingError('unavailable', 'الاشتراك غير متاح حاليًا في المتجر')
      try {
        const { Purchases } = await lib()
        return toEntitlement((await Purchases.purchasePackage({ aPackage: pkg })).customerInfo)
      } catch (e) { throw toError(e) }
    },
    async restore() {
      try {
        const { Purchases } = await lib()
        return toEntitlement((await Purchases.restorePurchases()).customerInfo)
      } catch (e) { throw toError(e) }
    },
  }
}
