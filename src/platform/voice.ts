// قراءة النص بصوت الجهاز (للأذكار غير القرآنية): Android/iOS عبر محرك النطق في النظام، والمتصفح عبر speechSynthesis.
// النص يُقرأ كما هو من المكتبة الموثقة؛ والآيات لا تُقرأ آليًا بل بأصوات القرّاء.
import { isNative } from './index'

// مرجع للعبارة الجارية (يمنع المتصفح من التخلص منها قبل انتهائها)
let webUtter: SpeechSynthesisUtterance | null = null

export async function voiceAvailable(): Promise<boolean> {
  if (isNative()) {
    try {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
      const { languages } = await TextToSpeech.getSupportedLanguages()
      return languages.some((l) => l.toLowerCase().startsWith('ar'))
    } catch { return false }
  }
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** يقرأ النص ويعود عند انتهاء القراءة (أو عند الإيقاف) */
export async function speakArabic(text: string, rate = 0.85): Promise<void> {
  if (isNative()) {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
    await TextToSpeech.speak({ text, lang: 'ar-SA', rate, pitch: 1, volume: 1, category: 'playback' })
    return
  }
  if (!('speechSynthesis' in window)) throw new Error('القراءة الصوتية غير مدعومة في هذا المتصفح')
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ar-SA'
    u.rate = rate
    const ar = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ar'))
    if (ar) u.voice = ar
    u.onend = () => resolve()
    u.onerror = () => resolve()
    webUtter = u
    speechSynthesis.speak(u)
  })
}

export async function stopSpeaking(): Promise<void> {
  if (isNative()) {
    try { const { TextToSpeech } = await import('@capacitor-community/text-to-speech'); await TextToSpeech.stop() } catch { /* لا شيء يُقرأ */ }
    return
  }
  // الإلغاء يستدعي onend/onerror فتنتهي القراءة الجارية
  if ('speechSynthesis' in window && (webUtter || speechSynthesis.speaking)) speechSynthesis.cancel()
  webUtter = null
}
