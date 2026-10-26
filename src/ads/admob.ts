// AdMob على الهاتف: تهيئة مرة واحدة عند أول إعلان (لا عند فتح التطبيق)، ثم طلب الموافقة (UMP)،
// وعلى iOS إذن التتبع (ATT). أي فشل يعني «لا إعلان» فقط، ولا يوقف أي شيء في التطبيق.
import { Capacitor } from '@capacitor/core'
import { bannerUnit } from './config'

type AdMobLib = typeof import('@capacitor-community/admob')
let ready: Promise<AdMobLib | null> | null = null

function init(): Promise<AdMobLib | null> {
  return (ready ??= (async () => {
    try {
      const lib = await import('@capacitor-community/admob')
      const { AdMob, MaxAdContentRating, AdmobConsentStatus } = lib
      const unit = bannerUnit(Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')
      // محتوى مناسب للعائلات فقط
      await AdMob.initialize({ initializeForTesting: unit.testing, maxAdContentRating: MaxAdContentRating.General, tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false })
      if (Capacitor.getPlatform() === 'ios') {
        const t = await AdMob.trackingAuthorizationStatus()
        if (t.status === 'notDetermined') await AdMob.requestTrackingAuthorization()
      }
      let consent = await AdMob.requestConsentInfo()
      if (consent.status === AdmobConsentStatus.REQUIRED && consent.isConsentFormAvailable) consent = await AdMob.showConsentForm()
      return consent.canRequestAds ? lib : null
    } catch { return null }
  })())
}

let shownBy: symbol | null = null

/** يعرض الشريط الإعلاني أسفل الشاشة فوق شريط التنقل؛ يعيد true إن ظهر */
export async function showBanner(owner: symbol, bottomMarginDp: number): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  const lib = await init()
  if (!lib) return false
  try {
    const unit = bannerUnit(Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')
    await lib.AdMob.showBanner({ adId: unit.id, isTesting: unit.testing, adSize: lib.BannerAdSize.ADAPTIVE_BANNER, position: lib.BannerAdPosition.BOTTOM_CENTER, margin: bottomMarginDp })
    shownBy = owner
    return true
  } catch { return false }
}

export async function removeBanner(owner: symbol): Promise<void> {
  if (shownBy !== owner) return
  shownBy = null
  try { const lib = await init(); await lib?.AdMob.removeBanner() } catch { /* لا شيء */ }
}

/** خيارات الخصوصية للإعلانات (تغيير الموافقة) — من صفحة الإعدادات */
export async function showAdPrivacyOptions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try { const lib = await init(); if (!lib) return false; await lib.AdMob.showPrivacyOptionsForm(); return true } catch { return false }
}
