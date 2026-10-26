// نظام «رفيق بلس» الاختياري: أنواع مشتركة بين مزوّدي الاشتراك (المتجر عبر RevenueCat، ومتجر الاختبار).

/** معرّف الاستحقاق في المتجر ولوحة RevenueCat، ومعرّف منتج الاشتراك الشهري */
export const ENTITLEMENT_ID = 'plus'
export const PRODUCT_ID = 'rafiq_plus_monthly'
export const APP_PACKAGE = 'org.rafiqalmuslim.plus'

/** حالة الاشتراك كما أكدها المتجر */
export interface Entitlement {
  active: boolean
  productId: string | null
  /** نهاية الفترة المدفوعة الحالية (ms) — null للاشتراك بلا نهاية معروفة */
  expiresAt: number | null
  /** سيتجدد تلقائيًا في نهاية الفترة */
  willRenew: boolean
  /** رابط إدارة الاشتراك أو إلغائه في المتجر */
  manageUrl: string | null
}

export const NO_ENTITLEMENT: Entitlement = { active: false, productId: null, expiresAt: null, willRenew: false, manageUrl: null }

/** عرض الاشتراك بالسعر الفعلي الذي يرسله المتجر للمستخدم (لا سعر ثابت في التطبيق) */
export interface Offer {
  productId: string
  /** السعر كما يعرضه المتجر بعملة المستخدم، مثل «‏9.99 ₪» */
  priceString: string
  currency: string
  /** مدة الفترة: شهرية */
  period: 'month'
  /** اشتراك متجدد تلقائيًا */
  renewing: boolean
}

export type BillingErrorKind = 'cancelled' | 'offline' | 'payment' | 'unavailable' | 'unknown'
export class BillingError extends Error {
  readonly kind: BillingErrorKind
  constructor(kind: BillingErrorKind, message: string) { super(message); this.kind = kind }
}

/** مزوّد الاشتراك: كل قراراته من المتجر، ولا يُعتمد على قيمة محفوظة محليًا وحدها */
export interface BillingProvider {
  readonly id: 'store' | 'sandbox' | 'none'
  /** وضع اختبار بلا أي دفع حقيقي */
  readonly test: boolean
  init(): Promise<void>
  getOffer(): Promise<Offer | null>
  /** يسأل المتجر عن حالة الاشتراك الآن */
  getEntitlement(): Promise<Entitlement>
  purchase(): Promise<Entitlement>
  restore(): Promise<Entitlement>
}
