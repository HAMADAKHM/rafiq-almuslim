// «رفيقي يذكّرني» (رفيق بلس): تذكير دوري بالأذكار، و«موعدي مع القرآن»، وتذكير قرب خروج وقت الصلاة.
// كل شيء إشعارات محلية مجدولة مسبقًا (لا خدمة خلفية ولا خادم)، والنصوص من محتوى التطبيق الموثّق فقط.
import { ADHKAR } from '../content/adhkar'
import { DUAS } from '../content/duas'
import type { DhikrItem } from '../content/types'
import { HISN_AUDIO } from '../content/hisnAudio'
import type { PrayerKey } from '../state/settings'

/** مجموعات الأذكار التي يمكن التذكير بها في أي وقت (لا أذكار الصباح والمساء ولا أذكار المناسبات كالمطر والعطاس) */
export const COMPANION_GROUPS: { id: string; label: string; source: 'adhkar' | 'duas'; category: string }[] = [
  { id: 'salawat', label: 'الاستغفار والصلاة على النبي ﷺ', source: 'adhkar', category: 'salawat' },
  { id: 'istighfar', label: 'أدعية الاستغفار والتوبة', source: 'duas', category: 'istighfar' },
  { id: 'sunnah', label: 'أدعية من السنة الصحيحة', source: 'duas', category: 'sunnah' },
  { id: 'relief', label: 'أدعية الفرج والصبر', source: 'duas', category: 'relief' },
  { id: 'distress', label: 'أدعية الكرب والهم والحزن', source: 'duas', category: 'distress' },
  { id: 'rizq', label: 'أدعية الرزق', source: 'duas', category: 'rizq' },
  { id: 'parents', label: 'أدعية للوالدين والأموات', source: 'duas', category: 'parents' },
  { id: 'general', label: 'أدعية عامة', source: 'duas', category: 'general' },
]
export const DEFAULT_COMPANION_GROUPS = ['salawat', 'istighfar', 'sunnah']

export interface PoolItem { group: string; item: DhikrItem }

/** الأذكار المختارة بترتيب متناوب بين المجموعات (لا يتتابع ذكران من مجموعة واحدة ما أمكن). عناصر القرآن تُستثنى لأن نص الإشعار يحتاج نصًا مكتوبًا */
export function companionPool(groups: string[], voicedOnly = false): PoolItem[] {
  const all = companionPoolAll(groups)
  if (!voicedOnly) return all
  const voiced = all.filter((p) => HISN_AUDIO[p.item.id])
  // إن لم يكن في المجموعات المختارة ذكر مسموع، يبقى التناوب على كل أذكارها
  return voiced.length ? voiced : all
}

function companionPoolAll(groups: string[]): PoolItem[] {
  const lists = COMPANION_GROUPS.filter((g) => groups.includes(g.id)).map((g) => {
    const cats = g.source === 'adhkar' ? ADHKAR : DUAS
    const cat = cats.find((c) => c.id === g.category)
    return (cat?.items ?? []).filter((it) => it.text && it.kind !== 'quran').map((item) => ({ group: g.id, item }))
  })
  const out: PoolItem[] = []
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i])
  return out
}

export function findPoolItem(id: string): PoolItem | null {
  return companionPool(COMPANION_GROUPS.map((g) => g.id)).find((p) => p.item.id === id) ?? null
}

/** فترات جاهزة بالدقائق */
export const INTERVAL_CHOICES = [15, 30, 60, 120]
export const MIN_INTERVAL = 10
export const MAX_INTERVAL = 720
export const clampInterval = (m: number) => Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.round(Number(m) || 60)))

/** أوقات التذكير الدوري في يوم واحد (دقائق من منتصف الليل)، من البداية حتى النهاية شاملة */
export function intervalMinutes(start: string, end: string, interval: number): number[] {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const s = toMin(start), e = toMin(end), step = clampInterval(interval)
  if (!(e > s)) return []
  const out: number[] = []
  for (let t = s; t <= e; t += step) out.push(t)
  return out
}

/** الذكر المناسب لفتحة زمنية: تسلسل ثابت عبر الأيام حتى لا يتكرر الذكر نفسه في فتحتين متتاليتين */
export function pickForSlot(pool: PoolItem[], seq: number, done: Set<string>): PoolItem | null {
  const fresh = pool.filter((p) => !done.has(p.item.id))
  const list = fresh.length ? fresh : pool
  if (!list.length) return null
  return list[((seq % list.length) + list.length) % list.length]
}

export function dhikrBody(item: DhikrItem): string {
  const text = (item.text ?? '').replace(/\s+/g, ' ').trim()
  const short = text.length > 150 ? text.slice(0, 147).trimEnd() + '…' : text
  return item.count && item.count > 1 ? `${short} (${item.count} ${item.count <= 10 ? 'مرات' : 'مرة'})` : short
}

/** نهاية وقت كل صلاة: الفجر بالشروق، والظهر بالعصر، والعصر بالمغرب، والمغرب بالعشاء، والعشاء بمنتصف الليل (بين المغرب والفجر التالي) */
export function prayerEnds(t: { fajr: Date; sunrise: Date; asr: Date; maghrib: Date; isha: Date }, nextFajr: Date): Record<PrayerKey, Date> {
  return {
    fajr: t.sunrise,
    dhuhr: t.asr,
    asr: t.maghrib,
    maghrib: t.isha,
    isha: new Date((t.maghrib.getTime() + nextFajr.getTime()) / 2),
  }
}

export const PRAYER_END_NOTE: Record<PrayerKey, string> = {
  fajr: 'يخرج وقته بشروق الشمس',
  dhuhr: 'يخرج وقته بدخول العصر',
  asr: 'يخرج وقته بغروب الشمس، ولا يُؤخَّر إلى اصفرارها',
  maghrib: 'يخرج وقته بدخول العشاء',
  isha: 'وقته المختار إلى منتصف الليل',
}

/** موضع القراءة المعروض في إشعار «موعدي مع القرآن» */
export interface QuranPosition { surah: number; ayah: number; page?: number; juz?: number; surahName?: string; at: number }

export function positionText(p: QuranPosition | null | undefined): string {
  if (!p) return 'ابدأ وردك من حيث تحب'
  const parts = [p.surahName ? `سورة ${p.surahName}` : `السورة ${p.surah}`]
  if (p.page) parts.push(`صفحة ${p.page}`)
  parts.push(`الآية ${p.ayah}`)
  return 'تابع من ' + parts.join('، ')
}

export function positionRoute(p: QuranPosition | null | undefined): string {
  if (!p) return '/quran'
  return p.page ? `/mushaf/${p.page}?s=${p.surah}&a=${p.ayah}` : `/quran/${p.surah}?ayah=${p.ayah}`
}

export function amountText(a: { unit: 'pages' | 'ayahs' | 'juz'; value: number }): string {
  const v = Math.max(1, Math.round(a.value))
  if (a.unit === 'juz') return v === 1 ? 'وردك: جزء واحد' : `وردك: ${v} أجزاء`
  if (a.unit === 'ayahs') return `وردك: ${v} ${v <= 10 ? 'آيات' : 'آية'}`
  return v === 1 ? 'وردك: صفحة واحدة' : `وردك: ${v} ${v <= 10 ? 'صفحات' : 'صفحة'}`
}

// معرّفات الإشعارات: التذكيرات اليومية تستخدم YYMMDD×1000 (< 10^9)، والتذكير الدوري نطاقًا مستقلًا فوق 10^9،
// وتأجيل «ذكّرني لاحقًا» نطاقًا فوق 2.1×10^9 لا تلغيه إعادة الجدولة.
export const INTERVAL_ID_BASE = 1_000_000_000
export const SNOOZE_ID_BASE = 2_100_000_000
export function intervalId(day: { y: number; m: number; d: number }, slot: number): number {
  return INTERVAL_ID_BASE + ((day.y % 100) * 10000 + day.m * 100 + day.d) * 1000 + (slot % 1000)
}
export function snoozeId(at: Date): number {
  return SNOOZE_ID_BASE + (Math.floor(at.getTime() / 60_000) % 40_000_000)
}
export const isSnoozeId = (id: number) => id >= SNOOZE_ID_BASE

/** بيانات ودجت «أكمل من حيث وصلت» (نصوص جاهزة يعرضها Android كما هي) */
export function buildResumeWidgetData(pos: QuranPosition | null, khatmaPercent: number | null, entitled: boolean, tz?: string, now = new Date()) {
  if (!entitled) return { entitled: false }
  const ar = (n: number) => n.toLocaleString('ar-EG', { useGrouping: false })
  if (!pos) return { entitled: true, surah: null, route: '/quran' }
  const where = [pos.page ? `صفحة ${ar(pos.page)}` : '', pos.juz ? `الجزء ${ar(pos.juz)}` : '', `الآية ${ar(pos.ayah)}`].filter(Boolean).join(' • ')
  const dayFmt = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const at = new Date(pos.at)
  const yesterday = new Date(now.getTime() - 86_400_000)
  const date = dayFmt(at) === dayFmt(now) ? 'آخر قراءة: اليوم' : dayFmt(at) === dayFmt(yesterday) ? 'آخر قراءة: أمس' : `آخر قراءة: ${new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', timeZone: tz }).format(at)}`
  return {
    entitled: true,
    surah: pos.surahName ? `سورة ${pos.surahName}` : `السورة ${ar(pos.surah)}`,
    where,
    date,
    percent: khatmaPercent == null ? null : Math.round(khatmaPercent),
    percentLabel: khatmaPercent == null ? '' : `الختمة ${ar(Math.round(khatmaPercent))}٪`,
    route: positionRoute(pos),
  }
}

/** «هدف صغير»: صفحات مختلفة قُرئت فعلًا اليوم، وأذكار مكتملة. النسبة 0..1 (متوسط الهدفين) */
export function goalProgress(goal: { pages: number; adhkar: number }, today: { pages: number[]; adhkar: number }) {
  const pagesGoal = Math.max(0, Math.round(goal.pages))
  const adhkarGoal = Math.max(0, Math.round(goal.adhkar))
  const pagesDone = new Set(today.pages).size
  const adhkarDone = Math.max(0, today.adhkar)
  const parts = [pagesGoal ? Math.min(1, pagesDone / pagesGoal) : null, adhkarGoal ? Math.min(1, adhkarDone / adhkarGoal) : null].filter((x): x is number => x !== null)
  return { pagesGoal, adhkarGoal, pagesDone, adhkarDone, percent: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0 }
}

/** «وضع السفر» فعّال الآن؟ */
export function travelActive(t: { enabled: boolean; until: number | null } | undefined, at: Date): boolean {
  return !!t?.enabled && (!t.until || at.getTime() < t.until)
}

/** قناة Android التي صوتها تسجيل الذكر (res/raw/hisn_N.mp3) */
export const hisnChannel = (n: number | string) => `rafiq-hisn-${n}-v1`
export const HISN_SOUND_PREFIX = 'rafiq-hisn-'
export const HISN_SOUND_NAME_RE = /^rafiq-hisn-([0-9a-z]+)-([vn][1p])$/
