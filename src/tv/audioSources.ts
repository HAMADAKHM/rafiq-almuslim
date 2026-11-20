// مصادر الصوت على التلفاز: الرابط المباشر أولًا (كما في النسخ السابقة)، ثم الطريق البديل داخل تطبيق التلفاز
// ‎/__audio?u=…‎ الذي يحمّل الملف عبر شبكة Android مع جذور الشهادات الحديثة (لأجهزة التلفاز القديمة)،
// وللأذان من نسخته المحفوظة على التلفاز. في المتصفح العادي لا يوجد طريق بديل.
const inApp = () => typeof window !== 'undefined' && !!(window as unknown as { RafiqTV?: unknown }).RafiqTV

export const proxied = (url: string) => `/__audio?u=${encodeURIComponent(url)}`

export function withFallback(urls: string[]): string[] {
  if (!inApp()) return urls
  return [...urls, ...urls.filter((u) => u.startsWith('https://')).map(proxied)]
}
