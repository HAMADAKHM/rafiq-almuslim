// قراءة نصوص الأذكار بصوت عربي: محرك الكلام في تطبيق التلفاز (Android)، أو صوت المتصفح إن وُجد.
// قراءة آلية للنص الموثق كما هو؛ الآيات لا تُقرأ هنا بل تُتلى بأصوات القرّاء.

interface NativeVoice { status(): string; speak(text: string, id: string, volume: number): boolean; stop(): void }
type DoneFn = (id: string, ok: boolean) => void
const w = (typeof window !== 'undefined' ? window : {}) as unknown as { RafiqVoice?: NativeVoice; __rafiqVoiceDone?: DoneFn; speechSynthesis?: SpeechSynthesis }

const waiters = new Map<string, (ok: boolean) => void>()
w.__rafiqVoiceDone = (id, ok) => { waiters.get(id)?.(ok); waiters.delete(id) }

function webArabicVoice(): SpeechSynthesisVoice | null {
  try { return w.speechSynthesis?.getVoices().find((v) => v.lang.toLowerCase().startsWith('ar')) ?? null } catch { return null }
}

/** حالة الصوت: ok = متاح، missing = لا يوجد صوت عربي في الجهاز، init = يجهَّز */
export function voiceStatus(): 'ok' | 'missing' | 'init' {
  try {
    if (w.RafiqVoice) { const s = w.RafiqVoice.status(); return s === 'ok' || s === 'init' ? s : 'missing' }
  } catch { return 'missing' }
  return webArabicVoice() ? 'ok' : 'missing'
}

export function stopVoice() {
  try { w.RafiqVoice?.stop() } catch { /* لا شيء */ }
  try { w.speechSynthesis?.cancel() } catch { /* لا شيء */ }
  for (const r of waiters.values()) r(false)
  waiters.clear()
}

let seq = 0
/** يقرأ النص ويعود عند انتهائه؛ false إن لم يتوفر صوت عربي */
export async function speak(text: string, volume: number, alive: () => boolean): Promise<boolean> {
  for (let i = 0; i < 10 && voiceStatus() === 'init' && alive(); i++) await new Promise((r) => setTimeout(r, 500))
  if (!alive() || voiceStatus() !== 'ok') return false
  const limit = 15_000 + text.length * 220
  if (w.RafiqVoice) {
    const id = `d${++seq}`
    return new Promise<boolean>((resolve) => {
      const t = setTimeout(() => { waiters.delete(id); resolve(true) }, limit)
      waiters.set(id, (ok) => { clearTimeout(t); resolve(ok) })
      let started = false
      try { started = w.RafiqVoice!.speak(text, id, volume) } catch { started = false }
      if (!started) { clearTimeout(t); waiters.delete(id); resolve(false) }
    })
  }
  return new Promise<boolean>((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text)
      const v = webArabicVoice()
      if (v) u.voice = v
      u.lang = v?.lang ?? 'ar'
      u.rate = 0.85
      u.volume = volume
      const t = setTimeout(() => resolve(true), limit)
      u.onend = () => { clearTimeout(t); resolve(true) }
      u.onerror = () => { clearTimeout(t); resolve(false) }
      w.speechSynthesis!.speak(u)
    } catch { resolve(false) }
  })
}
