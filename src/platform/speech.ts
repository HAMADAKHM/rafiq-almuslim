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
    if (!av.available) throw new Error('التعرف على الكلام غير متاح على هذا الجهاز.')
    const perm = await SpeechRecognition.requestPermissions()
    if (perm.speechRecognition !== 'granted') throw new Error(ERRORS['not-allowed'])
    stopCurrent = () => { SpeechRecognition.stop().catch(() => {}) }
    try {
      const r = await SpeechRecognition.start({ language: lang, maxResults: 5, partialResults: false, popup: false })
      return r.matches ?? []
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
