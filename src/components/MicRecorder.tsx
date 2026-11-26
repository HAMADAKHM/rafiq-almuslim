// تسجيل صوت المستخدم مباشرة من الميكروفون (للفيديو): يعيد ملفًا صوتيًا يُفك مثل أي ملف يختاره.
import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

const MAX_SECONDS = 120

/** صيغة يدعمها المسجّل: MP4/AAC في الآيفون، وWebM/Opus في أندرويد والكمبيوتر */
export function pickAudioMime(isSupported: (t: string) => boolean = (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)): string {
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((t) => isSupported(t)) ?? ''
}

export const micSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

export function MicRecorder({ disabled, onDone, onError }: { disabled?: boolean; onDone: (file: File) => void; onError: (msg: string) => void }) {
  const [secs, setSecs] = useState<number | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const timer = useRef(0)

  const stop = () => { if (rec.current?.state === 'recording') rec.current.stop() }
  useEffect(() => () => { clearInterval(timer.current); stop() }, [])

  const start = async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch (e) {
      const name = (e as Error).name
      onError(name === 'NotAllowedError' || name === 'SecurityError'
        ? 'لم يُسمح باستخدام الميكروفون. اسمح به من إعدادات الجهاز (في الآيفون: الإعدادات ← Safari ← الميكروفون) ثم حاول مرة أخرى.'
        : 'تعذر تشغيل الميكروفون على هذا الجهاز.')
      return
    }
    const mime = pickAudioMime()
    const r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    const chunks: Blob[] = []
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    r.onstop = () => {
      clearInterval(timer.current)
      stream.getTracks().forEach((t) => t.stop())
      setSecs(null)
      const type = (r.mimeType || mime || 'audio/webm').split(';')[0]
      const blob = new Blob(chunks, { type })
      if (blob.size < 2000) { onError('التسجيل قصير جدًا — اضغط «سجّل بصوتك» واقرأ الدعاء ثم اضغط «إيقاف».'); return }
      onDone(new File([blob], `تسجيلي.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`, { type }))
    }
    rec.current = r
    r.start(250)
    const t0 = Date.now()
    setSecs(0)
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000)
      setSecs(s)
      if (s >= MAX_SECONDS) stop()
    }, 250)
  }

  if (!micSupported()) return null
  return secs === null
    ? <button type="button" className="btn btn-sm" disabled={disabled} onClick={start}><Mic size={14} aria-hidden="true" /> سجّل بصوتك</button>
    : <button type="button" className="btn btn-sm btn-primary" onClick={stop} aria-live="polite"><Square size={14} aria-hidden="true" /> إيقاف ({secs} ث)</button>
}
