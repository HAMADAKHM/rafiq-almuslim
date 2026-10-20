// تحويل الكلام إلى نص: إضافة أصلية على الهاتف (خدمة التعرف في Android/iOS)، وواجهة المتصفح على الويب.
// الصوت يعالجه نظام الجهاز أو المتصفح (وقد يُرسل إلى خوادم Google أو Apple)، ولا يحفظه التطبيق.
import { Capacitor } from '@capacitor/core'

type WebSR = {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
const webSR = (): (new () => WebSR) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => WebSR; webkitSpeechRecognition?: new () => WebSR }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function speechSupported(): boolean {
  return Capacitor.isNativePlatform() || !!webSR()
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'لم يُسمح باستخدام الميكروفون. فعّل الإذن من إعدادات الجهاز أو المتصفح.',
  'service-not-allowed': 'خدمة التعرف على الكلام غير متاحة في هذا المتصفح.',
  'no-speech': 'لم يُسمع صوت. اقترب من الميكروفون واقرأ بوضوح.',
  'audio-capture': 'لا يوجد ميكروفون متاح.',
  network: 'التعرف على الكلام يحتاج اتصالًا بالإنترنت.',
}

let stopCurrent: (() => void) | null = null
export function stopListening() { stopCurrent?.() }

/** يستمع لعبارة واحدة ويعيد بدائل النص المسموع (الأرجح أولًا) */
export async function listenOnce(lang = 'ar-SA'): Promise<string[]> {
  if (Capacitor.isNativePlatform()) {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
    const av = await SpeechRecognition.available().catch(() => ({ available: false }))
    if (!av.available) throw new Error('خدمة التعرف على الكلام غير موجودة على هذا الجهاز. ثبّت تطبيق Google (أو فعّل «الكتابة بالصوت من Google») ثم أعد المحاولة، أو اكتب جزءًا من الآية.')
    let perm = await SpeechRecognition.checkPermissions().catch(() => null)
    if (perm?.speechRecognition !== 'granted') perm = await SpeechRecognition.requestPermissions()
    if (perm.speechRecognition !== 'granted') throw new Error(ERRORS['not-allowed'])
    stopCurrent = () => { SpeechRecognition.stop().catch(() => {}) }
    try {
      // على Android نافذة Google للتعرف على الكلام أكثر ثباتًا من الاستماع داخل التطبيق
      const android = Capacitor.getPlatform() === 'android'
      const r = await SpeechRecognition.start({ language: lang, maxResults: 5, partialResults: false, popup: android, prompt: 'اقرأ الآية أو جزءًا منها' })
      return r.matches ?? []
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      // إغلاق نافذة Google دون كلام يعيد رمز إلغاء (0)
      if (/^0$|cancel/i.test(msg)) return []
      if (/no match|didn't understand|7/i.test(msg)) throw new Error('لم أتمكن من فهم الكلام. اقرأ بوضوح وببطء، أو اكتب جزءًا من الآية.')
      throw new Error(`تعذر التعرف على الكلام (${msg}). يمكنك كتابة جزء من الآية بدلًا من ذلك.`)
    } finally {
      stopCurrent = null
    }
  }
  const SR = webSR()
  if (!SR) throw new Error('هذا المتصفح لا يدعم البحث بالصوت. جرّب Chrome أو تطبيق الجوال.')
  return new Promise((resolve, reject) => {
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 5
    rec.continuous = false
    let done = false
    rec.onresult = (e) => {
      done = true
      const alts = Array.from(e.results[0] ?? []).map((x) => x.transcript)
      resolve(alts)
    }
    rec.onerror = (e) => { done = true; reject(new Error(ERRORS[e.error] ?? 'تعذر التعرف على الكلام.')) }
    rec.onend = () => { stopCurrent = null; if (!done) resolve([]) }
    stopCurrent = () => rec.stop()
    rec.start()
  })
}
