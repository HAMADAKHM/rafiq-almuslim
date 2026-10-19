// أدوات معالجة النص العربي للبحث فقط. لا تُستخدم أبدًا لتعديل النص القرآني المعروض.

// علامات التشكيل وعلامات الضبط القرآنية (الوقف، الصلة، المد الصغير...) والتطويل
const MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]/g

/**
 * تطبيع "متساهل" يجعل البحث لا يتأثر بالتشكيل واختلاف الهمزات والرسم العثماني.
 * تُحذف الألفات كلها من الطرفين (السؤال والنص) لأن الرسم العثماني يحذف ألفات كثيرة
 * (مثل: الرحمٰن، ملك/مالك، الصلوٰة/الصلاة).
 */
export function searchSkeleton(input: string): string {
  return input
    .replace(/[\u0648\u064A\u0649]\u0670/g, 'ا') // الصلوٰة → الصلاة ، علىٰ → علا
    .replace(/[\u06E5\u06E6]/g, '') // الواو والياء الصغيرتان
    .replace(MARKS, '')
    .replace(/[\u0670\u0627\u0623\u0625\u0622\u0671\u0621\u0654\u0655]/g, '') // كل صور الألف والهمزة
    .replace(/\u0624/g, 'و')
    .replace(/[\u0626\u0649]/g, 'ي')
    .replace(/\u0629/g, 'ه')
    .replace(/[\u06DE\u06E9\u2009\u00A0]/g, ' ')
    .replace(/[^\u0600-\u06FFa-z0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** إزالة التشكيل فقط مع الإبقاء على الحروف (لعرض مقتطفات أو مقارنة دقيقة). */
export function stripDiacritics(input: string): string {
  return input.replace(/[\u06E5\u06E6]/g, '').replace(MARKS, '').replace(/\u0670/g, '').replace(/\u0671/g, 'ا')
}

/** تحويل الأرقام إلى الأرقام العربية المشرقية (٠١٢٣…) لعرض أرقام الآيات. */
export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}
