// جدولة التذكيرات: دالة واحدة نقية تبني قائمة الإشعارات للأيام القادمة من إعدادات المستخدم.
// - في الويب: يعرضها التطبيق ما دام مفتوحًا.
// - في Android/iOS: تُسلَّم القائمة كاملة لنظام الإشعارات المحلية المجدولة (لا حساب في الخلفية).
// الرسائل قصيرة ومتنوعة، دون لوم ودون نسبة فضائل غير موثقة.
import { PRAYER_LABELS, prayerTimesFor } from './prayer'
import type { PrayerKey, Settings } from '../state/settings'
import { addDays, dateParts, dayKey } from '../lib/dates'
import { toHijri, occasionsFor } from './calendar'
import { plusActive } from '../billing/active'
import { HISN_AUDIO } from '../content/hisnAudio'
import { channelFlags, heardText, hisnClipChannel, SLOT_DEFS, voiceFor, type VoiceSlot } from './voiceSlots'
import { amountText, hisnChannel, companionPool, dhikrBody, intervalId, intervalMinutes, pickForSlot, positionRoute, positionText, prayerEnds, PRAYER_END_NOTE, travelActive, type QuranPosition } from './companion'

export type ReminderKind = 'prayer' | 'prayer-before' | 'morning' | 'evening' | 'sleep' | 'ayah' | 'dhikr' | 'wird' | 'memorize' | 'occasion' | 'summary' | 'custom' | 'ramadan' | 'fasting' | 'dhikr-interval' | 'quran-time' | 'prayer-end' | 'wake' | 'after-prayer' | 'share'

export interface Reminder {
  /** معرّف رقمي ثابت لنفس التذكير في نفس اليوم (يمنع التكرار ويسمح بالاستبدال) */
  id: number
  at: Date
  kind: ReminderKind
  title: string
  body: string
  /** المسار الذي يُفتح عند الضغط على الإشعار */
  route: string
  /** الصلاة المعنية (لتذكيرات دخول الوقت) */
  prayer?: PrayerKey
  /** قناة Android وصوت الإشعار (يُحددان عند الجدولة على الهاتف بحسب صوت الأذان المختار) */
  channelId?: string
  sound?: string
  /** أزرار الإشعار (Android/iOS): 'dhikr' افتح/تمّ، و'quran' افتح/ذكّرني لاحقًا */
  actions?: 'dhikr' | 'quran'
  /** false = إشعار مكتوب بلا صوت */
  silent?: boolean
  /** معرّف الذكر في التذكير الدوري */
  itemId?: string
}

/** معلومات من خارج الإعدادات تُعرض في الإشعارات (تُقرأ من الجهاز قبل الجدولة) */
export interface ScheduleContext {
  /** آخر موضع قراءة فعلية (أو آخر موضع مفتوح إن لم يوجد) */
  position?: QuranPosition | null
  /** الأذكار التي أكملها المستخدم اليوم من التذكير الدوري: لا تُعاد عليه في اليوم نفسه */
  doneToday?: { date: string; ids: string[] } | null
  /** قنوات صوت الهاتف أو تسجيل المستخدم لإشعار الصباح والمساء (timedVoice.prepareVoiceChannels) */
  voiceChannels?: Partial<Record<VoiceSlot, string>>
}

/** التذكير الدوري يغطي 48 ساعة فقط ويُعاد عند كل فتح؛ والتذكيرات الأخرى لها الأولوية في حد الإشعارات */
export const INTERVAL_HORIZON_MS = 48 * 3600_000

/** حد iOS للإشعارات المحلية المجدولة هو 64؛ نترك هامشًا */
export const MAX_SCHEDULED = 60
/** أقصى عدد للتذكيرات الخاصة (رفيق بلس) */
export const MAX_CUSTOM = 10

const MESSAGES: Record<Exclude<ReminderKind, 'prayer' | 'prayer-before' | 'occasion' | 'custom' | 'ramadan' | 'fasting' | 'dhikr-interval' | 'quran-time' | 'prayer-end' | 'after-prayer' | 'share'>, { title: string; body: string }[]> = {
  morning: [{ title: SLOT_DEFS.morning.title, body: SLOT_DEFS.morning.body }],
  evening: [{ title: SLOT_DEFS.evening.title, body: SLOT_DEFS.evening.body }],
  sleep: [{ title: SLOT_DEFS.sleep.title, body: SLOT_DEFS.sleep.body }],
  wake: [{ title: SLOT_DEFS.wake.title, body: SLOT_DEFS.wake.body }],
  ayah: [
    { title: 'آية اليوم', body: 'آية اليوم بانتظارك في رفيق المسلم' },
    { title: 'آية اليوم', body: 'اقرأ آية اليوم وتدبّرها' },
  ],
  dhikr: [
    { title: 'ذكر اليوم', body: 'ذكر قصير من السنة بانتظارك' },
    { title: 'دعاء اليوم', body: 'افتح رفيق المسلم لقراءة دعاء اليوم' },
  ],
  wird: [
    { title: 'حان وقت وردك اليومي', body: 'يمكنك متابعة قراءتك من حيث وصلت' },
    { title: 'وردك من القرآن الكريم', body: 'دقائق قليلة مع القرآن' },
    { title: 'ورد اليوم', body: 'صفحات اليوم بانتظارك' },
  ],
  memorize: [
    { title: 'وقت الحفظ والمراجعة', body: 'مقاطع اليوم بانتظارك' },
    { title: 'مراجعة الحفظ', body: 'جلسة قصيرة تثبّت ما حفظت' },
  ],
  summary: [
    { title: 'ملخص يومك', body: 'اطّلع على ما أنجزته اليوم' },
  ],
}

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length]
}

function hm(t: string): [number, number] {
  const [h, m] = t.split(':').map(Number)
  return [h, m]
}

/** يحوّل «الساعة:الدقيقة» في يوم محدد بتوقيت المدينة إلى لحظة زمنية */
export function atLocalTime(day: { y: number; m: number; d: number }, time: string, tz: string): Date {
  const [h, m] = hm(time)
  // تقريب أولي ثم تصحيح بفرق المنطقة الزمنية (مرتين لتجاوز حدود التوقيت الصيفي)
  let guess = Date.UTC(day.y, day.m - 1, day.d, h, m)
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(guess))
    const g = (t: string) => Number(parts.find((p) => p.type === t)!.value)
    const shown = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'))
    guess += Date.UTC(day.y, day.m - 1, day.d, h, m) - shown
  }
  return new Date(guess)
}

function minutesOfDay(d: Date, tz: string): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d).split(':').map(Number)
  return (h % 24) * 60 + m
}

export function inQuietHours(d: Date, tz: string, quiet: Settings['notifications']['quiet']): boolean {
  if (!quiet.enabled) return false
  const [sh, sm] = hm(quiet.start)
  const [eh, em] = hm(quiet.end)
  const s = sh * 60 + sm, e = eh * 60 + em, t = minutesOfDay(d, tz)
  return s <= e ? t >= s && t < e : t >= s || t < e
}

const KIND_CODE: Record<ReminderKind, number> = { prayer: 1, 'prayer-before': 2, morning: 3, evening: 4, sleep: 5, ayah: 6, dhikr: 7, wird: 8, memorize: 9, occasion: 10, summary: 11, custom: 12, ramadan: 13, fasting: 14, 'dhikr-interval': 15, 'quran-time': 16, 'prayer-end': 17, wake: 18, 'after-prayer': 19, share: 20 }
const PRAYER_CODE: Record<PrayerKey, number> = { fajr: 1, dhuhr: 2, asr: 3, maghrib: 4, isha: 5 }

function makeId(day: { y: number; m: number; d: number }, kind: ReminderKind, slot = 0): number {
  // YYMMDD × 1000 + نوع × 10 + فتحة — رقم صحيح أقل من 2^31 كما يتطلب Android
  return ((day.y % 100) * 10000 + day.m * 100 + day.d) * 1000 + KIND_CODE[kind] * 10 + slot
}

/** تذكيرات الأذكار المسموعة */
const ADHKAR_SLOT: Partial<Record<ReminderKind, VoiceSlot>> = { morning: 'morning', evening: 'evening', sleep: 'sleep', wake: 'wake' }

/** منشور اليوم للمشاركة (بالتناوب) — النص يُجلب في الاستوديو من المصحف والمكتبة الموثقة كما هو */
export function shareOfDay(seed: number): { title: string; body: string; route: string } {
  const k = ((seed % 3) + 3) % 3
  if (k === 0) return { title: 'شارك آية اليوم', body: 'صمّم بطاقة أو مقطعًا بخلفيتك وخطك، وانشر الخير — اضغط للبدء', route: '/studio?src=ayah&daily=1' }
  if (k === 1) return { title: 'شارك دعاءً اليوم', body: 'دعاء من القرآن والسنة بتصميم تختاره، بصورة أو فيديو من جوالك', route: '/studio?src=duas' }
  return { title: 'شارك دعاءً لمتوفى', body: 'ادعُ لأحبتك الراحلين وشارك الدعاء مع أهلك — صدقة جارية', route: '/studio?src=deceased' }
}

const ROUTES: Record<ReminderKind, string> = {
  prayer: '/prayer', 'prayer-before': '/prayer', morning: '/adhkar-alert/morning', evening: '/adhkar-alert/evening', sleep: '/adhkar-alert/sleep',
  ayah: '/', dhikr: '/', wird: '/wird', memorize: '/memorize', occasion: '/calendar', summary: '/progress', custom: '/', share: '/studio', ramadan: '/ramadan', fasting: '/calendar',
  'dhikr-interval': '/companion', 'quran-time': '/quran', 'prayer-end': '/prayer', wake: SLOT_DEFS.wake.route, 'after-prayer': SLOT_DEFS.afterPrayer.route,
}

/**
 * يبني جدول التذكيرات من `from` ولمدة `days` يومًا، مرتبًا زمنيًا، بلا تكرار، وبحد أقصى MAX_SCHEDULED.
 * التذكيرات التي مضى وقتها تُستبعد.
 */
export function buildSchedule(settings: Settings, from: Date, days = 7, ctx: ScheduleContext = {}): Reminder[] {
  const n = settings.notifications
  const loc = settings.location
  if (!n.enabled || !loc) return []
  const out = new Map<number, Reminder>()
  const add = (r: Reminder) => {
    if (r.at.getTime() <= from.getTime() - 60_000) return
    if (r.kind !== 'prayer' && r.kind !== 'prayer-before' && r.kind !== 'prayer-end' && inQuietHours(r.at, loc.tz, n.quiet)) return
    out.set(r.id, r)
  }
  const place = loc.nameAr ?? loc.name
  const intervals: Reminder[] = []
  const comp = settings.companion
  const plus = plusActive()
  const pool = plus && comp?.adhkar.enabled && !n.reduce ? companionPool(comp.adhkar.groups, comp.adhkar.voicedOnly !== false) : []
  // تذكير الأذكار المسموع: صوت الإشعار جملة من الذكر نفسه، والنص يطابق ما يُسمع
  const flags = channelFlags(n)
  const voiced = (slot: VoiceSlot, msg: { title: string; body: string }) => {
    const opt = n.adhkarVoice === false ? 'tone' : voiceFor(n, slot)
    if (opt === 'tone') return { title: msg.title, body: msg.body }
    const custom = opt === 'device' || opt === 'mine' ? ctx.voiceChannels?.[slot] : undefined
    const heard = heardText(slot, opt, !!custom)
    return { title: msg.title, body: `🔊 ${heard} — ${msg.body}`, channelId: custom ?? hisnClipChannel(SLOT_DEFS[slot].hisn, flags) }
  }

  for (let i = 0; i < days; i++) {
    const day = dateParts(addDays(from, i), loc.tz)
    const seed = day.y * 400 + day.m * 31 + day.d
    const times = prayerTimesFor(loc, day, settings.prayer)
    for (const p of Object.keys(PRAYER_CODE) as PrayerKey[]) {
      if (!n.perPrayer[p]) continue
      if (n.atAdhan) add({ id: makeId(day, 'prayer', PRAYER_CODE[p]), at: times[p], kind: 'prayer', prayer: p, title: `حان الآن وقت صلاة ${PRAYER_LABELS[p]}`, body: place, route: ROUTES.prayer })
      if (n.minutesBefore > 0 && !n.reduce) {
        add({ id: makeId(day, 'prayer-before', PRAYER_CODE[p]), at: new Date(times[p].getTime() - n.minutesBefore * 60_000), kind: 'prayer-before', title: `اقترب وقت صلاة ${PRAYER_LABELS[p]}`, body: `بعد ${n.minutesBefore} دقيقة — ${place}`, route: ROUTES.prayer })
      }
    }
    const timed: [ReminderKind, string | null][] = n.reduce
      ? [['wird', n.wird]]
      : [['wake', n.wakeAdhkar ?? null], ['morning', n.morningAdhkar], ['evening', n.eveningAdhkar], ['sleep', n.sleepAdhkar], ['ayah', n.ayahOfDay], ['dhikr', n.dhikrOfDay], ['wird', n.wird], ['memorize', n.memorize], ['summary', n.dailySummary]]
    const weekday = new Date(Date.UTC(day.y, day.m - 1, day.d, 12)).getUTCDay()
    for (const [kind, time] of timed) {
      if (!time) continue
      const slot = ADHKAR_SLOT[kind]
      // أيام الأسبوع المختارة لتذكير الأذكار (غير المحدد = كل الأيام)
      const days = slot && slot !== 'afterPrayer' ? n.adhkarDays?.[slot] : undefined
      if (days && days.length && !days.includes(weekday)) continue
      const msg = pick(MESSAGES[kind as keyof typeof MESSAGES], seed)
      add({ id: makeId(day, kind), at: atLocalTime(day, time, loc.tz), kind, route: ROUTES[kind], ...(slot ? voiced(slot, msg) : { title: msg.title, body: msg.body }) })
    }
    // «شارك منشورًا»: كل يوم بالتناوب آية اليوم، ثم دعاء، ثم دعاء لمتوفى — يفتح الاستوديو بالمحتوى جاهزًا للتعديل
    if (n.shareDaily && !n.reduce) {
      const share = shareOfDay(seed)
      add({ id: makeId(day, 'share'), at: atLocalTime(day, n.shareDaily, loc.tz), kind: 'share', title: share.title, body: share.body, route: share.route })
    }
    // أذكار ما بعد الصلاة: بعد الأذان بدقائق للصلوات المختارة
    const ap = n.afterPrayer
    if (ap?.enabled && !n.reduce) {
      const msg = { title: SLOT_DEFS.afterPrayer.title, body: SLOT_DEFS.afterPrayer.body }
      for (const p of ap.prayers) {
        if (!(p in PRAYER_CODE)) continue
        add({ id: makeId(day, 'after-prayer', PRAYER_CODE[p]), at: new Date(times[p].getTime() + Math.max(1, Math.min(60, ap.minutes)) * 60_000), kind: 'after-prayer', prayer: p, route: ROUTES['after-prayer'], ...voiced('afterPrayer', { ...msg, title: `${msg.title} — ${PRAYER_LABELS[p]}` }) })
      }
    }
    if (n.occasions && !n.reduce) {
      // تذكير مساء اليوم السابق بالمناسبة القادمة
      const tomorrow = addDays(new Date(Date.UTC(day.y, day.m - 1, day.d, 12)), 1)
      const occ = occasionsFor(toHijri(tomorrow, 'UTC', settings.hijriOffset), tomorrow.getUTCDay())
      const main = occ.find((o) => !o.title.startsWith('يوم الاثنين') && !o.title.startsWith('يوم الخميس')) ?? occ[0]
      if (main) add({ id: makeId(day, 'occasion'), at: atLocalTime(day, n.occasions, loc.tz), kind: 'occasion', title: `غدًا: ${main.title}`, body: main.note ? `${main.note} — بحسب التقويم المحسوب، وقد يختلف بحسب الرؤية` : 'بحسب التقويم المحسوب', route: ROUTES.occasion })
    }
    // رفيق بلس: وضع رمضان (السحور والإفطار) وتذكيرات الصيام في الليلة السابقة
    if (plusActive() && !n.reduce) {
      const noon = atLocalTime(day, '12:00', loc.tz)
      const h = toHijri(noon, loc.tz, settings.hijriOffset)
      const rm = settings.ramadan
      if (h.month === 9 && rm) {
        if (rm.suhoorMinutes > 0) add({ id: makeId(day, 'ramadan', 0), at: new Date(times.fajr.getTime() - rm.suhoorMinutes * 60_000), kind: 'ramadan', title: 'وقت السحور', body: `بقي ${rm.suhoorMinutes} دقيقة على أذان الفجر — «تسحّروا فإن في السحور بركة» (متفق عليه)`, route: ROUTES.ramadan })
        if (rm.iftarMinutes > 0) add({ id: makeId(day, 'ramadan', 1), at: new Date(times.maghrib.getTime() - rm.iftarMinutes * 60_000), kind: 'ramadan', title: 'اقترب موعد الإفطار', body: `بعد ${rm.iftarMinutes} دقائق — ${place}`, route: ROUTES.ramadan })
      }
      const f = settings.fasting
      if (f?.enabled) {
        const next = addDays(noon, 1)
        const h2 = toHijri(next, loc.tz, settings.hijriOffset)
        const wd = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay()
        const tomorrowWd = (wd + 1) % 7
        // لا تذكير بصيام في يومي العيد وأيام التشريق
        const forbidden = (h2.month === 10 && h2.day === 1) || (h2.month === 12 && h2.day >= 10 && h2.day <= 13)
        let msg: { title: string; body: string } | null = null
        if (!forbidden) {
          if (f.arafah && h2.month === 12 && h2.day === 9) msg = { title: 'غدًا يوم عرفة', body: '«صيام يوم عرفة، أحتسب على الله أن يكفّر السنة التي قبله والسنة التي بعده» — رواه مسلم (1162)' }
          else if (f.ashura && h2.month === 1 && (h2.day === 9 || h2.day === 10)) msg = { title: h2.day === 10 ? 'غدًا يوم عاشوراء' : 'غدًا تاسوعاء (التاسع من محرم)', body: '«صيام يوم عاشوراء، أحتسب على الله أن يكفّر السنة التي قبله» — رواه مسلم (1162)' }
          else if (f.shawwal && h2.month === 10 && h2.day === 2) msg = { title: 'صيام الست من شوال', body: 'تبدأ من الغد لمن أراد صيامها — «من صام رمضان ثم أتبعه ستًّا من شوال كان كصيام الدهر» رواه مسلم (1164)' }
          else if (f.beed && h2.month !== 9 && h2.day >= 13 && h2.day <= 15) msg = { title: 'غدًا من الأيام البيض', body: `اليوم ${h2.day} من الشهر الهجري (بحسب التقويم المحسوب)` }
          else if (f.monThu && h2.month !== 9 && (tomorrowWd === 1 || tomorrowWd === 4)) msg = { title: tomorrowWd === 1 ? 'غدًا الاثنين' : 'غدًا الخميس', body: 'يوم صيام تطوّع لمن أراد' }
        }
        if (msg && /^\d{2}:\d{2}$/.test(f.time)) add({ id: makeId(day, 'fasting'), at: atLocalTime(day, f.time, loc.tz), kind: 'fasting', title: msg.title, body: msg.body, route: ROUTES.fasting })
      }
    }
    // رفيق بلس — «رفيقي يذكّرني»
    if (plus && comp) {
      const weekday = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay()
      const today = dayKey(atLocalTime(day, '12:00', loc.tz), loc.tz)
      // قرب خروج وقت الصلاة
      const pe = comp.prayerEnd
      if (pe.enabled && pe.minutesBefore > 0 && !n.reduce) {
        const nd = dateParts(addDays(atLocalTime(day, '12:00', loc.tz), 1), loc.tz)
        const ends = prayerEnds(times, prayerTimesFor(loc, nd, settings.prayer).fajr)
        for (const p of Object.keys(PRAYER_CODE) as PrayerKey[]) {
          if (!pe.perPrayer[p]) continue
          const at = new Date(ends[p].getTime() - pe.minutesBefore * 60_000)
          // لا معنى للتذكير قبل دخول الوقت نفسه
          if (at.getTime() <= times[p].getTime()) continue
          add({ id: makeId(day, 'prayer-end', PRAYER_CODE[p]), at, kind: 'prayer-end', prayer: p, title: `اقترب خروج وقت صلاة ${PRAYER_LABELS[p]}`, body: `بقي ${pe.minutesBefore} دقيقة تقريبًا — ${PRAYER_END_NOTE[p]} (بحسب طريقة الحساب)`, route: ROUTES['prayer-end'] })
        }
      }
      // موعدي مع القرآن
      const q = comp.quran
      if (q.enabled && q.days.includes(weekday)) {
        q.times.slice(0, 4).forEach((t, slot) => {
          if (!/^\d{2}:\d{2}$/.test(t)) return
          if (travelActive(comp.travel, atLocalTime(day, t, loc.tz))) return
          add({ id: makeId(day, 'quran-time', slot), at: atLocalTime(day, t, loc.tz), kind: 'quran-time', title: 'حان موعدك مع القرآن', body: `${positionText(ctx.position)} — ${amountText(q.amount)}`, route: positionRoute(ctx.position), actions: 'quran', silent: !q.sound })
        })
      }
      // الذكر الدوري: داخل ساعات المستخدم وأيامه، خارج فترة الإيقاف المؤقت، ولمدة 48 ساعة
      const a = comp.adhkar
      if (pool.length && a.days.includes(weekday)) {
        const done = new Set(ctx.doneToday && ctx.doneToday.date === today ? ctx.doneToday.ids : [])
        intervalMinutes(a.start, a.end, a.interval).forEach((mins, slot) => {
          const at = atLocalTime(day, `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`, loc.tz)
          if (at.getTime() <= from.getTime() || at.getTime() > from.getTime() + INTERVAL_HORIZON_MS) return
          if (a.pausedUntil && at.getTime() < a.pausedUntil) return
          if (travelActive(comp.travel, at)) return
          if (inQuietHours(at, loc.tz, n.quiet)) return
          const seq = Math.floor(at.getTime() / 60_000 / Math.max(1, a.interval))
          const p = pickForSlot(pool, seq, done)
          if (!p) return
          // يُقرأ الذكر نفسه في الإشعار بتسجيل حصن المسلم (قناة صوتها الملف) إن وُجد
          const voiceN = a.sound && a.voice !== false ? HISN_AUDIO[p.item.id] : undefined
          intervals.push({ id: intervalId(day, slot), at, kind: 'dhikr-interval', title: voiceN ? 'رفيقي يذكّرني 🔊' : 'رفيقي يذكّرني', body: dhikrBody(p.item), route: `/companion/dhikr/${p.item.id}`, actions: 'dhikr', silent: !a.sound, itemId: p.item.id, ...(voiceN ? { channelId: hisnChannel(voiceN) } : {}) })
        })
      }
    }
    // رفيق بلس: التذكيرات الخاصة (حتى 10)، في أيامها المختارة فقط، ومع اشتراك ساري فقط
    if (plusActive() && !n.reduce) {
      const weekday = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay()
      ;(settings.customReminders ?? []).slice(0, MAX_CUSTOM).forEach((c, slot) => {
        if (!c.enabled || !c.title.trim() || !/^\d{2}:\d{2}$/.test(c.time) || !c.days.includes(weekday)) return
        add({ id: makeId(day, 'custom', slot), at: atLocalTime(day, c.time, loc.tz), kind: 'custom', title: c.title.trim().slice(0, 80), body: 'تذكير خاص — رفيق بلس', route: c.route || '/' })
      })
    }
  }
  const byTime = (a: Reminder, b: Reminder) => a.at.getTime() - b.at.getTime()
  const base = [...out.values()].sort(byTime)
  if (!intervals.length) return base.slice(0, MAX_SCHEDULED)
  // الأولوية لتذكيرات الـ48 ساعة القادمة (الصلاة وغيرها)، ثم الذكر الدوري، ثم ما بعدها من الأيام
  const horizon = from.getTime() + INTERVAL_HORIZON_MS
  const near = base.filter((r) => r.at.getTime() <= horizon).slice(0, MAX_SCHEDULED)
  const ivs = intervals.sort(byTime).slice(0, Math.max(0, MAX_SCHEDULED - near.length))
  const later = base.filter((r) => r.at.getTime() > horizon).slice(0, Math.max(0, MAX_SCHEDULED - near.length - ivs.length))
  return [...near, ...ivs, ...later].sort(byTime)
}

/** التذكيرات المستحقة الآن (خلال آخر 90 ثانية) — للويب عندما يكون التطبيق مفتوحًا */
export function dueReminders(settings: Settings, now: Date, alreadyFired: Set<number>): Reminder[] {
  return buildSchedule(settings, new Date(now.getTime() - 90_000), 1)
    .filter((r) => r.at.getTime() <= now.getTime() && now.getTime() - r.at.getTime() < 90_000 && !alreadyFired.has(r.id))
}

export function todayKey(settings: Settings, now = new Date()) {
  return dayKey(now, settings.location?.tz)
}
