// صوت قراءة المعنى داخل فيديو «التفسير كالقصة»: محرك الكلام العربي في الهاتف يكتب الصوت إلى ملف
// (إضافة Narration الأصلية في Android)، ثم يُدمج مع التلاوة. قراءة آلية للنص المعتمد كما هو، على الجهاز فقط.
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'

const Narration = registerPlugin<{ status(): Promise<{ state: 'ok' | 'init' | 'missing' }>; synthesize(o: { text: string; rate?: number }): Promise<{ data: string }> }>('Narration')

/** هل يمكن إدخال صوت المعنى في الفيديو على هذا الجهاز */
export async function narrationAvailable(): Promise<boolean> {
  if (platformName() !== 'android') return false
  try {
    for (let i = 0; i < 12; i++) {
      const { state } = await Narration.status()
      if (state === 'ok') return true
      if (state === 'missing') return false
      await new Promise((r) => setTimeout(r, 400))
    }
  } catch { /* الإضافة غير موجودة */ }
  return false
}

/** يحوّل النص إلى صوت ويعيده جاهزًا للدمج في الفيديو */
export async function synthesizeNarration(actx: BaseAudioContext, text: string, rate = 0.85): Promise<AudioBuffer> {
  const { data } = await Narration.synthesize({ text, rate })
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return actx.decodeAudioData(bytes.buffer)
}
