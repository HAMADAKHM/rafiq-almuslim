// الإعلانات المحدودة في رفيق بلس: إعداد مركزي واحد. شريط إعلاني صغير فقط، في أربع صفحات غير تعبدية،
// لغير المشتركين فقط، ولا يُعرض أثناء تشغيل التلاوة. لا إعلانات منبثقة ولا تكافئية.
// VITE_ADS=0 يعطّل الإعلانات كلها دون تعديل أي شاشة.

/** الصفحات الوحيدة المسموح فيها بإعلان (وافق عليها صاحب التطبيق) */
export const AD_PAGES = { more: '/more', mosques: '/mosques', calendar: '/calendar', settings: '/settings' } as const
export type AdPlacement = keyof typeof AD_PAGES

/** حماية إضافية: لا إعلان أبدًا تحت هذه المسارات حتى لو أُضيف موضع بالخطأ */
export const NEVER_AD_PREFIXES = [
  '/quran', '/mushaf', '/adhkar', '/adhkar-alert', '/duas', '/hadith', '/listen', '/tasbih', '/memorize', '/my-adhkar',
  '/stories', '/learn', '/wird', '/prayer', '/qibla', '/plus', '/assistant',
]

export const adsEnabled = () => import.meta.env.VITE_ADS !== '0'
/** معاينة موضع الإعلان في المتصفح (للاختبار فقط؛ المتصفح لا يعرض إعلانات حقيقية) */
export const adsPreview = () => import.meta.env.VITE_ADS_PREVIEW === '1'

export function adAllowed(path: string, placement: AdPlacement, o: { entitled: boolean; audioPlaying: boolean }): boolean {
  if (!adsEnabled() || o.entitled || o.audioPlaying) return false
  if (NEVER_AD_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) return false
  return AD_PAGES[placement] === path
}

/** معرّفات Google التجريبية الرسمية (لا أرباح) حتى يُضاف حساب AdMob صاحب التطبيق */
const TEST_BANNER = { android: 'ca-app-pub-3940256099942544/9214589741', ios: 'ca-app-pub-3940256099942544/2435281174' }
export function bannerUnit(platform: 'android' | 'ios'): { id: string; testing: boolean } {
  const real = platform === 'android' ? import.meta.env.VITE_ADMOB_BANNER_ANDROID : import.meta.env.VITE_ADMOB_BANNER_IOS
  return typeof real === 'string' && real.startsWith('ca-app-pub-') ? { id: real, testing: false } : { id: TEST_BANNER[platform], testing: true }
}
