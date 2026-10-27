// صوت الذكر البشري: تسجيل أضافه المستخدم بترخيصه أولًا، ثم تسجيل «حصن المسلم» إن طابق النص، وإلا لا شيء
// (فيستعمل المستدعي صوت الجهاز الآلي).
import { hisnAudioUrl } from '../content/hisnAudio'
import { getRecording } from './dhikrAudio'

export type DhikrAudio = { kind: 'recording'; blob: Blob; credit: string } | { kind: 'hisn'; url: string; credit: string }

export async function dhikrAudio(itemId: string): Promise<DhikrAudio | null> {
  const rec = await getRecording(itemId).catch(() => null)
  if (rec) return { kind: 'recording', blob: rec.blob, credit: `بصوت ${rec.reciter} — ${rec.source}` }
  const url = hisnAudioUrl(itemId)
  return url ? { kind: 'hisn', url, credit: 'حصن المسلم (hisnmuslim.com)' } : null
}

export const hasHumanAudio = (itemId: string) => !!hisnAudioUrl(itemId)

/** يشغّل الصوت حتى نهايته أو الإيقاف؛ يعيد false إن تعذر التشغيل (انقطاع الإنترنت مثلًا) */
export function playDhikrAudio(a: DhikrAudio, holder: { current: HTMLAudioElement | null }, alive: () => boolean, volume = 1): Promise<boolean> {
  return new Promise((resolve) => {
    if (!alive()) return resolve(true)
    const url = a.kind === 'recording' ? URL.createObjectURL(a.blob) : a.url
    const el = new Audio(url)
    el.volume = Math.max(0, Math.min(1, volume))
    holder.current = el
    let settled = false
    const done = (ok: boolean) => { if (settled) return; settled = true; if (a.kind === 'recording') URL.revokeObjectURL(url); resolve(ok) }
    el.onended = () => done(true)
    el.onerror = () => done(false)
    el.onpause = () => { if (!alive()) done(true) }
    el.play().catch(() => done(false))
  })
}
