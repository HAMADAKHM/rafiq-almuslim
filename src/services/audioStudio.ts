// محرك «استوديو أصوات رفيق المسلم»:
// - مشغل المعاينة (عنصر صوت واحد، مع شريط التقدم والتكرار والتلاشي التدريجي)، ويوقف مشغل القرآن عند التشغيل حتى لا يتداخلا.
// - مؤثرات السبحة وإتمام الأذكار (Web Audio منخفض التأخير، وتحترم «إيقاف جميع الأصوات» ومستوى الصوت).
// - التنزيل عند الطلب: تخزين التطبيق (Cache Storage)، ونسبة التقدم، والإيقاف والاستكمال، والحذف، والتحقق من سلامة الملف.
import { ALL_STUDIO_SOUNDS, soundById, type StudioSound } from '../content/soundLibrary'
import { ayahAudioSources, reciterById } from '../content/reciters'
import { fetchBytes } from './studioVideo'
import { player as quranPlayer } from './audio'
import type { AudioStudioSettings } from '../state/settings'

export const SOUND_CACHE = 'rafiq-sounds-v1'
const base = () => (import.meta.env?.BASE_URL ?? '/')
export const bundledUrl = (s: StudioSound) => base() + (s.file ?? '')

// ---------------- الإعدادات الحالية (يحدّثها التطبيق) ----------------
let current: AudioStudioSettings | null = null
export function setStudioSettings(s: AudioStudioSettings | undefined) { current = s ?? null }
const vol = () => (current?.muteAll ? 0 : Math.max(0, Math.min(1, (current?.volume ?? 80) / 100)))

// ---------------- التحقق من سلامة الملف الصوتي ----------------
/** رأس MP3 صحيح (ID3 أو إطار MPEG) وحجم معقول */
export function looksLikeMp3(b: Uint8Array): boolean {
  if (b.length < 2000) return false
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true
  return b[0] === 0xff && (b[1] & 0xe0) === 0xe0
}

// ---------------- التنزيلات ----------------
export type DlStatus = 'none' | 'queued' | 'downloading' | 'done' | 'error'
export interface DlState { status: DlStatus; bytes?: number; error?: string }
const dl = new Map<string, DlState>()
const listeners = new Set<() => void>()
let version = 0
const emit = () => { version++; listeners.forEach((f) => f()) }
export const subscribeDownloads = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export const downloadsVersion = () => version
export const dlState = (key: string): DlState => dl.get(key) ?? { status: 'none' }

async function cache() { return typeof caches !== 'undefined' ? caches.open(SOUND_CACHE) : null }

/** يقرأ ما في التخزين (عند فتح الاستوديو) */
export async function scanDownloads(): Promise<void> {
  const c = await cache(); if (!c) return
  for (const req of await c.keys()) {
    const r = await c.match(req); const b = r ? await r.blob() : null
    dl.set(req.url, { status: 'done', bytes: b?.size })
  }
  emit()
}

/** تنزيل ملف واحد والتحقق منه ثم حفظه */
export async function downloadUrl(url: string): Promise<void> {
  const c = await cache(); if (!c) throw new Error('التخزين غير متاح')
  dl.set(url, { status: 'downloading' }); emit()
  try {
    const bytes = new Uint8Array(await fetchBytes(url))
    if (!looksLikeMp3(bytes)) throw new Error('الملف ليس تسجيلًا صوتيًا صالحًا')
    await c.put(url, new Response(new Blob([bytes], { type: 'audio/mpeg' }), { headers: { 'content-type': 'audio/mpeg', 'content-length': String(bytes.length) } }))
    dl.set(url, { status: 'done', bytes: bytes.length })
  } catch (e) {
    dl.set(url, { status: 'error', error: (e as Error).message || 'تعذر التنزيل' })
    throw e
  } finally { emit() }
}

export async function removeDownload(url: string) {
  const c = await cache(); await c?.delete(url); dl.delete(url); emit()
}

/** طابور تنزيل جماعي قابل للإيقاف والاستكمال */
export interface Batch { total: number; done: number; failed: number; running: boolean; paused: boolean }
let batch: Batch = { total: 0, done: 0, failed: 0, running: false, paused: false }
let queue: string[] = []
export const batchState = () => batch
export async function downloadAll(urls: string[]) {
  queue = urls.filter((u) => dlState(u).status !== 'done')
  batch = { total: queue.length, done: 0, failed: 0, running: true, paused: false }
  queue.forEach((u) => dl.set(u, { status: 'queued' })); emit()
  await runQueue()
}
async function runQueue() {
  while (queue.length && !batch.paused) {
    const u = queue.shift()!
    try { await downloadUrl(u); batch = { ...batch, done: batch.done + 1 } } catch { batch = { ...batch, failed: batch.failed + 1 } }
    emit()
  }
  batch = { ...batch, running: !batch.paused && queue.length > 0 }
  emit()
}
export function pauseBatch() { batch = { ...batch, paused: true, running: false }; emit() }
export function resumeBatch() { if (!queue.length) return; batch = { ...batch, paused: false, running: true }; emit(); void runQueue() }

/** حجم الملف قبل تنزيله (طلب HEAD عند الطلب فقط) */
export async function remoteSize(url: string): Promise<number | null> {
  try {
    const { Capacitor, CapacitorHttp } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const r = await CapacitorHttp.request({ url, method: 'HEAD' })
      const h = r.headers as Record<string, string>
      const v = h['content-length'] ?? h['Content-Length']
      return v ? Number(v) : null
    }
    const r = await fetch(url, { method: 'HEAD' })
    const v = r.headers.get('content-length'); return v ? Number(v) : null
  } catch { return null }
}

/** رابط قابل للتشغيل: المضمّن، أو المحفوظ في التخزين، أو المصدر على الإنترنت (للمعاينة) */
export async function playableUrl(url: string): Promise<{ src: string; revoke: boolean }> {
  const c = await cache(); const hit = await c?.match(url)
  if (hit) return { src: URL.createObjectURL(await hit.blob()), revoke: true }
  return { src: url, revoke: false }
}

// ---------------- مشغل المعاينة ----------------
export interface StudioPlayerState { id: string | null; title: string; playing: boolean; pos: number; dur: number; loop: boolean; queue: number; index: number }
let st: StudioPlayerState = { id: null, title: '', playing: false, pos: 0, dur: 0, loop: false, queue: 0, index: 0 }
const pl = new Set<() => void>()
const pEmit = () => pl.forEach((f) => f())
export const subscribePlayer = (f: () => void) => { pl.add(f); return () => { pl.delete(f) } }
export const playerState = () => st
let el: HTMLAudioElement | null = null
let revokeUrl: string | null = null
let items: { id: string; title: string; url: string }[] = []
let fadeTimer: ReturnType<typeof setInterval> | null = null

function audio(): HTMLAudioElement {
  if (el) return el
  el = new Audio()
  el.addEventListener('timeupdate', () => { st = { ...st, pos: el!.currentTime, dur: Number.isFinite(el!.duration) ? el!.duration : st.dur }; pEmit() })
  el.addEventListener('loadedmetadata', () => { st = { ...st, dur: el!.duration }; pEmit() })
  el.addEventListener('ended', () => { void next() })
  el.addEventListener('pause', () => { st = { ...st, playing: false }; pEmit() })
  el.addEventListener('play', () => { st = { ...st, playing: true }; pEmit() })
  return el
}

async function loadIndex(i: number) {
  const it = items[i]; if (!it) return
  const a = audio()
  if (revokeUrl) { URL.revokeObjectURL(revokeUrl); revokeUrl = null }
  const { src, revoke } = await playableUrl(it.url)
  if (revoke) revokeUrl = src
  a.src = src; a.volume = vol() || 0.0001; a.muted = vol() === 0
  st = { ...st, id: it.id, title: it.title, index: i, queue: items.length, pos: 0, dur: 0 }
  pEmit()
  await a.play()
}

async function next() {
  if (st.index + 1 < items.length) { await loadIndex(st.index + 1); return }
  if (st.loop && items.length) { await loadIndex(0); return }
  st = { ...st, playing: false, pos: 0 }; pEmit()
}

/** تشغيل صوت أو قائمة (أذكار كاملة) في المشغل المصغر */
export async function playList(list: { id: string; title: string; url: string }[], opts: { loop?: boolean } = {}) {
  if (!list.length) return
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null }
  // لا تداخل مع مشغل القرآن
  if (quranPlayer.getSnapshot().status === 'playing') quranPlayer.pause()
  items = list
  st = { ...st, loop: opts.loop ?? (current?.repeat === 'loop') }
  const a = audio(); a.loop = false
  await loadIndex(0)
}
export async function playSound(s: StudioSound) {
  const url = s.file ? bundledUrl(s) : s.url!
  await playList([{ id: s.id, title: s.name, url }], { loop: s.loop ? true : undefined })
}
export function togglePlay() { const a = audio(); if (a.paused) void a.play(); else a.pause() }
export function seek(t: number) { const a = audio(); a.currentTime = t }
export function setLoop(loop: boolean) { st = { ...st, loop }; pEmit() }
export function applyVolume() { if (el) { el.volume = vol() || 0.0001; el.muted = vol() === 0 } }
/** إيقاف بتلاشٍ تدريجي (1.2 ثانية) أو فوري */
export function stopPlayer(fade = true) {
  const a = el; if (!a) return
  const done = () => { a.pause(); a.currentTime = 0; a.volume = vol() || 0.0001; st = { ...st, playing: false, pos: 0 }; pEmit() }
  if (!fade || a.paused) { done(); return }
  if (fadeTimer) clearInterval(fadeTimer)
  const start = a.volume; let k = 0
  fadeTimer = setInterval(() => { k++; a.volume = Math.max(0, start * (1 - k / 12)); if (k >= 12) { clearInterval(fadeTimer!); fadeTimer = null; done() } }, 100)
}

// ---------------- المؤثرات (السبحة وإتمام الأذكار) ----------------
let actx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
async function bufferOf(id: string): Promise<AudioBuffer | null> {
  const s = soundById(id); if (!s?.file) return null
  if (buffers.has(id)) return buffers.get(id)!
  actx ??= new AudioContext()
  const r = await fetch(bundledUrl(s)); const b = await actx.decodeAudioData(await r.arrayBuffer())
  buffers.set(id, b); return b
}
/** تحميل مسبق لأصوات السبحة لتُسمع فورًا مع الضغط */
export function preloadEffects(ids: string[]) { ids.forEach((id) => { void bufferOf(id).catch(() => null) }) }
export async function playEffect(id: string | null | undefined, gain = 1) {
  if (!id || current?.muteAll) return
  try {
    const b = await bufferOf(id); if (!b || !actx) return
    if (actx.state === 'suspended') await actx.resume()
    const src = actx.createBufferSource(); src.buffer = b
    const g = actx.createGain(); g.gain.value = vol() * gain
    src.connect(g).connect(actx.destination); src.start()
  } catch { /* لا صوت */ }
}

/** أصوات السبحة للحدث الحالي: نقرة، أو تمام 33، أو تمام 100، أو إكمال الهدف */
export function tasbihEvent(count: number, target: number, s: AudioStudioSettings | undefined): string | null {
  const t = s?.tasbih
  if (!t) return null
  if (target > 0 && count > 0 && count % target === 0) return t.done
  if (count > 0 && count % 100 === 0) return t.m100
  if (count > 0 && count % 33 === 0) return t.m33
  return t.clickOn ? t.click : null
}

// ---------------- القرّاء (آيات الأذكار) ----------------
export function ayahUrls(reciterId: string, ranges: { surah: number; from: number; to: number }[]): string[] {
  const r = reciterById(reciterId)
  return ranges.flatMap((g) => Array.from({ length: g.to - g.from + 1 }, (_, i) => ayahAudioSources(r, g.surah, g.from + i)[0]))
}

export const remoteUrls = () => ALL_STUDIO_SOUNDS.filter((s) => s.url).map((s) => s.url!)
export const fmtBytes = (n?: number | null) => (n == null ? '—' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} ك.ب` : `${(n / 1024 / 1024).toFixed(1)} م.ب`)
