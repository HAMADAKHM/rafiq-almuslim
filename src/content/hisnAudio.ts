// تسجيلات «حصن المسلم» الصوتية (hisnmuslim.com) — بإذن مشروع حصن المسلم كما أفاد صاحب التطبيق.
// الربط بين أذكار التطبيق وملفات الموقع ناتج scripts/hisn-audio-map.mjs ثم مراجعة يدوية لكل اختلاف:
// يُربط الذكر فقط إذا طابق نصُّه نصَّ التسجيل (بعد إزالة التشكيل والترقيم)، أو كان الفرق تعليمات مثل
// «ثلاث مرات» أو «ﷺ» مكتوبة أو حرفًا واحدًا. استُبعدت الأذكار التي تختلف ألفاظها عن التسجيل
// (مثل «العافية» و«العفو والعافية»، أو صيغة المساء مقابل الصباح، أو اختلاف ترتيب الجمل).

export const HISN_AUDIO_CREDIT = 'التسجيل الصوتي: مشروع حصن المسلم (hisnmuslim.com) — بإذن المشروع'

/** معرّف الذكر في التطبيق → رقم الملف الصوتي في حصن المسلم */
export const HISN_AUDIO: Record<string, number> = {
  'm-asbahna': 77,
  'm-bika': 78,
  'm-sayyid': 79,
  'm-alim': 85,
  'm-bismillah': 86,
  'm-hayy': 88,
  'e-sayyid': 79,
  'e-alim': 85,
  'e-bismillah': 86,
  'e-hayy': 88,
  'p-istighfar': 66,
  'p-tahlil': 67,
  'p-zubayr': 68,
  'p-aini': 59,
  's-amut': 105,
  's-qini': 104,
  'w-ahyana': 1,
  'h-enter': 12,
  'h-exit': 16,
  'h-exit2': 17,
  'f-before': 12,
  'f-after': 180,
  'f-host': 182,
  'f-cloth': 5,
  't-manzil': 216,
  't-farewell': 212,
  'q-wudu': 13,
  'q-khala': 10,
  'q-khala-out': 11,
  'x-anger': 193,
  'x-rain': 172,
  'x-after-rain': 173,
  'x-majlis': 15,
  's-ibrahimiyya': 53,
  'dr-1': 95,
  'dr-2': 136,
  'df-1': 154,
  'dk-1': 122,
  'dk-3': 121,
  'dk-4': 120,
  'dk-5': 123,
  'dk-6': 125,
  'di-1': 79,
  'di-3': 57,
  'dh-5': 147,
  'dt-2': 216,
  'dg-1': 61,
  'dh-4': 148,
  's-short': 98,
  's-istighfar': 96,
  'di-2': 96,
  'm-tahlil': 93,
  'm-fitra': 90,
  's-bismika': 102,
  's-tasbih': 106,
}

export function hisnAudioUrl(itemId: string): string | null {
  const n = HISN_AUDIO[itemId]
  return n ? `https://www.hisnmuslim.com/audio/ar/${n}.mp3` : null
}
