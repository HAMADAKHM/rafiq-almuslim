// أصوات أذان تُنزَّل على جهاز المستخدم عند طلبه (لا تُدمج في ملف التطبيق).
// الرابط أضافه صاحب المشروع؛ والمصدر خادم AlAdhan التابع لـ Islamic Network.
export interface OnlineAdhan { id: string; name: string; url: string; source: string }

export const ONLINE_ADHANS: OnlineAdhan[] = [
  { id: 'zahrani', name: 'منصور الزهراني', url: 'https://cdn.aladhan.com/audio/adhans/a11-mansour-al-zahrani.mp3', source: 'AlAdhan — Islamic Network' },
]
