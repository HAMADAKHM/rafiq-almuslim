// مشغل التلاوة: قائمة تشغيل آية بآية (يسمح بالانتقال لآية محددة، وتكرار الآية أو المقطع، وتغيير السرعة).
// يعمل في الخلفية بقدر ما يسمح المتصفح، ويدعم أزرار التحكم في نظام التشغيل عبر Media Session.
import { ayahAudioSources, reciterById, RECITERS } from '../content/reciters'
import { kv, listening } from '../db/repos'
import { dayKey } from '../lib/dates'
import { BASMALA_SURAH_EXCEPTIONS } from './quran'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export interface PlayerState {
  status: PlayerStatus
  reciterId: string
  surah: number
  surahName: string
  ayah: number
  from: number
  to: number
  /** عدد مرات تكرار كل آية (1 = بدون تكرار) */
  repeatEach: number
  /** تكرار المقطع كاملًا عند انتهائه */
  repeatRange: boolean
  /** فاصل صامت بالثواني بين تكرارات الآية الواحدة (للحفظ) */
  repeatGap: number
  rate: number
  volume: number
  playingBasmala: boolean
  error?: string
}

export interface LastListen { reciterId: string; surah: number; ayah: number }

type Listener = () => void

class AudioPlayer {
  private el: HTMLAudioElement | null = null
  private listeners = new Set<Listener>()
  private repeatCounter = 0
  private gapTimer: ReturnType<typeof setTimeout> | undefined
  private gapPending = false
  state: PlayerState = {
    status: 'idle', reciterId: RECITERS[0].id, surah: 1, surahName: '', ayah: 1, from: 1, to: 7,
    repeatEach: 1, repeatRange: false, repeatGap: 0, rate: 1, volume: 1, playingBasmala: false,
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
  getSnapshot = () => this.state

  private set(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  private audio(): HTMLAudioElement {
    if (!this.el) {
      const el = new Audio()
      el.preload = 'auto'
      el.addEventListener('playing', () => this.set({ status: 'playing', error: undefined }))
      el.addEventListener('pause', () => { if (this.state.status === 'playing') this.set({ status: 'paused' }) })
      el.addEventListener('waiting', () => this.set({ status: 'loading' }))
      el.addEventListener('ended', () => this.onEnded())
      el.addEventListener('error', () => this.onError())
      this.el = el
      this.setupMediaSession()
    }
    return this.el
  }

  /** تشغيل نطاق من الآيات في سورة. */
  play(opts: { reciterId?: string; surah: number; surahName: string; from: number; to: number; startAt?: number; repeatEach?: number; repeatRange?: boolean }) {
    const start = opts.startAt ?? opts.from
    this.repeatCounter = 0
    this.set({
      reciterId: opts.reciterId ?? this.state.reciterId,
      surah: opts.surah, surahName: opts.surahName, from: opts.from, to: opts.to, ayah: start,
      repeatEach: opts.repeatEach ?? this.state.repeatEach, repeatRange: opts.repeatRange ?? this.state.repeatRange,
    })
    const withBasmala = start === 1 && !BASMALA_SURAH_EXCEPTIONS.has(opts.surah)
    this.load(start, withBasmala)
  }

  /** روابط الملف الحالي ومؤشر الرابط الذي نجربه (للانتقال تلقائيًا إلى المصدر البديل) */
  private sources: string[] = []
  private sourceIdx = 0

  private onError() {
    if (this.sourceIdx < this.sources.length - 1) {
      this.sourceIdx++
      const el = this.audio()
      el.src = this.sources[this.sourceIdx]
      el.playbackRate = this.state.rate
      el.play().catch(() => {})
      return
    }
    this.set({ status: 'error', error: playbackErrorMessage() })
  }

  private load(ayah: number, basmala = false) {
    const el = this.audio()
    const rec = reciterById(this.state.reciterId)
    this.sources = basmala ? ayahAudioSources(rec, 1, 1) : ayahAudioSources(rec, this.state.surah, ayah)
    this.sourceIdx = 0
    el.src = this.sources[0]
    el.playbackRate = this.state.rate
    el.volume = this.state.volume
    this.set({ ayah, playingBasmala: basmala, status: 'loading', error: undefined })
    el.play().catch((e: Error) => {
      if (e.name === 'NotAllowedError') this.set({ status: 'paused' })
      // أخطاء التحميل تُعالج عبر حدث error
    })
    this.updateMediaMetadata()
    if (!basmala) {
      const last: LastListen = { reciterId: this.state.reciterId, surah: this.state.surah, ayah }
      kv.set('listen:last', last).catch(() => {})
      listening.log(this.state.reciterId, this.state.surah, ayah, dayKey()).catch(() => {})
    }
  }

  private onEnded() {
    const s = this.state
    if (s.playingBasmala) return this.load(s.ayah, false)
    this.repeatCounter++
    if (this.repeatCounter < s.repeatEach) {
      if (s.repeatGap > 0) {
        // فاصل صامت قبل إعادة الآية: يتيح للحافظ ترديدها
        this.set({ status: 'paused' })
        this.gapPending = true
        this.gapTimer = setTimeout(() => { this.gapPending = false; this.load(s.ayah) }, s.repeatGap * 1000)
        return
      }
      return this.load(s.ayah)
    }
    this.repeatCounter = 0
    if (s.ayah < s.to) return this.load(s.ayah + 1)
    if (s.repeatRange) return this.load(s.from, s.from === 1 && !BASMALA_SURAH_EXCEPTIONS.has(s.surah))
    this.set({ status: 'idle' })
  }

  toggle() {
    const el = this.el
    if (!el || !el.src) return
    // أثناء الفاصل: التشغيل يتخطى الفاصل ويعيد الآية فورًا
    if (this.gapPending) { clearTimeout(this.gapTimer); this.gapPending = false; this.load(this.state.ayah); return }
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }
  pause() { this.el?.pause() }
  stop() {
    clearTimeout(this.gapTimer); this.gapPending = false
    if (this.el) { this.el.pause(); this.el.removeAttribute('src'); this.el.load() }
    this.set({ status: 'idle' })
  }
  next() { clearTimeout(this.gapTimer); this.gapPending = false; if (this.state.ayah < this.state.to) { this.repeatCounter = 0; this.load(this.state.ayah + 1) } }
  prev() { clearTimeout(this.gapTimer); this.gapPending = false; if (this.state.ayah > this.state.from) { this.repeatCounter = 0; this.load(this.state.ayah - 1) } }
  goTo(ayah: number) { clearTimeout(this.gapTimer); this.gapPending = false; if (ayah >= this.state.from && ayah <= this.state.to) { this.repeatCounter = 0; this.load(ayah) } }
  retry() { this.load(this.state.ayah, this.state.playingBasmala) }

  setRate(rate: number) { this.set({ rate }); if (this.el) this.el.playbackRate = rate }
  setVolume(volume: number) { this.set({ volume }); if (this.el) this.el.volume = volume }
  setRepeat(repeatEach: number, repeatRange: boolean, repeatGap = this.state.repeatGap) { this.set({ repeatEach, repeatRange, repeatGap: Math.max(0, Math.min(30, repeatGap)) }) }
  setReciter(reciterId: string) {
    this.set({ reciterId })
    if (this.state.status === 'playing' || this.state.status === 'loading') this.load(this.state.ayah)
  }

  private setupMediaSession() {
    const ms = navigator.mediaSession
    if (!ms) return
    ms.setActionHandler('play', () => this.toggle())
    ms.setActionHandler('pause', () => this.pause())
    ms.setActionHandler('previoustrack', () => this.prev())
    ms.setActionHandler('nexttrack', () => this.next())
  }
  private updateMediaMetadata() {
    if (!navigator.mediaSession || typeof MediaMetadata === 'undefined') return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `سورة ${this.state.surahName} — الآية ${this.state.ayah}`,
      artist: reciterById(this.state.reciterId).name,
      album: 'رفيق المسلم',
    })
  }
}

/** هل يعمل التطبيق داخل صفحة معاينة مضمّنة (مثل رابط المعاينة)؟ سياسة الأمان فيها تمنع الصوت الخارجي */
export function isEmbeddedPreview(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

export function playbackErrorMessage(): string {
  if (!navigator.onLine) return 'لا يوجد اتصال بالإنترنت، وهذه التلاوة غير منزّلة على الجهاز.'
  if (isEmbeddedPreview()) return 'تشغيل التلاوات غير متاح في رابط المعاينة لأن سياسة الأمان فيه تمنع تحميل الصوت من مواقع خارجية. افتح ملف التطبيق RafiqAlMuslim.html في المتصفح أو استخدم نسخة الجوال.'
  return 'تعذر تحميل ملف التلاوة من الخادمين المتاحين. تأكد من الاتصال بالإنترنت، أو جرّب قارئًا آخر.'
}

export const player = new AudioPlayer()

// ---------------- التنزيل للاستماع دون إنترنت ----------------
export const AUDIO_CACHE = 'audio-offline'

function dlKey(reciterId: string, surah: number) { return `dl:${reciterId}:${surah}` }

export async function isSurahDownloaded(reciterId: string, surah: number): Promise<boolean> {
  return kv.get<boolean>(dlKey(reciterId, surah), false)
}

/**
 * تنزيل ملفات سورة كاملة إلى ذاكرة المتصفح للاستماع الشخصي دون اتصال.
 * لا يُعاد توزيع الملفات؛ تبقى على جهاز المستخدم فقط.
 */
export async function downloadSurah(reciterId: string, surah: number, count: number, onProgress?: (done: number, total: number) => void, signal?: AbortSignal) {
  if (!('caches' in window)) throw new Error('المتصفح لا يدعم التخزين دون اتصال')
  const cache = await caches.open(AUDIO_CACHE)
  const rec = reciterById(reciterId)
  const files = [...(BASMALA_SURAH_EXCEPTIONS.has(surah) ? [] : [ayahAudioSources(rec, 1, 1)]), ...Array.from({ length: count }, (_, i) => ayahAudioSources(rec, surah, i + 1))]
  let done = 0
  for (const sources of files) {
    if (signal?.aborted) throw new Error('أُلغي التنزيل')
    let saved = false
    for (const url of sources) {
      if (await cache.match(url)) { saved = true; break }
      try {
        let res: Response
        try {
          res = await fetch(url, { mode: 'cors', signal })
        } catch {
          res = await fetch(url, { mode: 'no-cors', signal }) // بعض الخوادم لا ترسل ترويسات CORS
        }
        if (res.type !== 'opaque' && !res.ok) continue
        await cache.put(url, res)
        saved = true
        break
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw new Error('أُلغي التنزيل')
      }
    }
    if (!saved) throw new Error('تعذر تنزيل أحد الملفات من الخادمين. تحقق من الاتصال وأعد المحاولة.')
    onProgress?.(++done, files.length)
  }
  await kv.set(dlKey(reciterId, surah), true)
}

export async function removeSurahDownload(reciterId: string, surah: number, count: number) {
  const cache = await caches.open(AUDIO_CACHE)
  const rec = reciterById(reciterId)
  for (let a = 1; a <= count; a++) for (const url of ayahAudioSources(rec, surah, a)) await cache.delete(url)
  await kv.set(dlKey(reciterId, surah), false)
}
