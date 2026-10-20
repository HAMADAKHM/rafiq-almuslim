// أصوات الأذان المدمجة في التطبيق. تُضاف بالسكربت scripts/add-adhan.mjs من تسجيلات يملك صاحب المشروع حق استخدامها،
// ويُسجَّل لكل صوت مصدره وترخيصه. لا يُضاف صوت دون مصدر معروف.
import data from './adhan-voices.json'

export interface AdhanVoice {
  id: string
  /** الاسم الظاهر للمستخدم، مثل: أذان الحرم المكي */
  name: string
  muezzin?: string
  /** مصدر التسجيل وترخيصه أو إذن استخدامه */
  source: string
  license: string
  durationSec: number
  /** ملف الأذان كاملًا في جذر الأصول (للتشغيل داخل التطبيق ولإشعارات Android) */
  file: string
  /** مقطع لا يتجاوز 30 ثانية لإشعارات iOS (حد النظام) */
  iosFile: string
}

export const ADHAN_VOICES = data as AdhanVoice[]

/** نغمة الإشعار الافتراضية للنظام (بلا أذان) */
export const VOICE_TONE = 'tone'
/** صوت اختاره المستخدم من جهازه (يُشغَّل داخل التطبيق فقط) */
export const VOICE_DEVICE = 'device'
/** لصلاة الفجر: نفس صوت بقية الصلوات */
export const VOICE_SAME = 'same'

export function voiceById(id: string): AdhanVoice | undefined {
  return ADHAN_VOICES.find((v) => v.id === id)
}
