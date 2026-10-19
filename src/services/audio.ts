// مشغل التلاوة: قائمة تشغيل آية بآية (يسمح بالانتقال لآية محددة، وتكرار الآية أو المقطع، وتغيير السرعة).
// يعمل في الخلفية بقدر ما يسمح المتصفح، ويدعم أزرار التحكم في نظام التشغيل عبر Media Session.
import { ayahAudioUrl, reciterById, RECITERS } from '../content/reciters'
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
  state: PlayerState = {
    status: 'idle', reciterId: RECITERS[0].id, surah: 1, surahName: '', ayah: 1, from: 1, to: 7,
    repeatEach: 1, repeatRange: false, rate: 1, volume: 1, playingBasmala: false,
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
      el.addEventListener('error', () => this.set({
        status: 'error',
        error: navigator.onLine ? 'تعذر تحميل ملف التلاوة من الخادم. جرّب قارئًا آخر أو أعد المحاولة لاحقًا.' : 'لا يوجد اتصال بالإنترنت، وهذه التلاوة غير منزّلة على الجهاز.',
      }))
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

  private load(ayah: number, basmala = false) {
    const el = this.audio()
    const rec = reciterById(this.state.reciterId)
    el.src = basmala ? ayahAudioUrl(rec, 1, 1) : ayahAudioUrl(rec, this.state.surah, ayah)
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
    if (this.repeatCounter < s.repeatEach) return this.load(s.ayah)
    this.repeatCounter = 0
    if (s.ayah < s.to) return this.load(s.ayah + 1)
    if (s.repeatRange) return this.load(s.from, s.from === 1 && !BASMALA_SURAH_EXCEPTIONS.has(s.surah))
    this.set({ status: 'idle' })
  }

  toggle() {
    const el = this.el
    if (!el || !el.src) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }
  pause() { this.el?.pause() }
  stop() {
    if (this.el) { this.el.pause(); this.el.removeAttribute('src'); this.el.load() }
    this.set({ status: 'idle' })
  }
  next() { if (this.state.ayah < this.state.to) { this.repeatCounter = 0; this.load(this.state.ayah + 1) } }
  prev() { if (this.state.ayah > this.state.from) { this.repeatCounter = 0; this.load(this.state.ayah - 1) } }
  goTo(ayah: number) { if (ayah >= this.state.from && ayah <= this.state.to) { this.repeatCounter = 0; this.load(ayah) } }
  retry() { this.load(this.state.ayah, this.state.playingBasmala) }

  setRate(rate: number) { this.set({ rate }); if (this.el) this.el.playbackRate = rate }
  setVolume(volume: number) { this.set({ volume }); if (this.el) this.el.volume = volume }
  setRepeat(repeatEach: number, repeatRange: boolean) { this.set({ repeatEach, repeatRange }) }
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
  const urls = [...(BASMALA_SURAH_EXCEPTIONS.has(surah) ? [] : [ayahAudioUrl(rec, 1, 1)]), ...Array.from({ length: count }, (_, i) => ayahAudioUrl(rec, surah, i + 1))]
  let done = 0
  for (const url of urls) {
    if (signal?.aborted) throw new Error('أُلغي التنزيل')
    if (!(await cache.match(url))) {
      let res: Response
      try {
        res = await fetch(url, { mode: 'cors', signal })
      } catch {
        res = await fetch(url, { mode: 'no-cors', signal }) // بعض الخوادم لا ترسل ترويسات CORS
      }
      if (res.type !== 'opaque' && !res.ok) throw new Error('فشل تنزيل أحد الملفات (HTTP ' + res.status + ')')
      await cache.put(url, res)
    }
    onProgress?.(++done, urls.length)
  }
  await kv.set(dlKey(reciterId, surah), true)
}

export async function removeSurahDownload(reciterId: string, surah: number, count: number) {
  const cache = await caches.open(AUDIO_CACHE)
  const rec = reciterById(reciterId)
  for (let a = 1; a <= count; a++) await cache.delete(ayahAudioUrl(rec, surah, a))
  await kv.set(dlKey(reciterId, surah), false)
}
