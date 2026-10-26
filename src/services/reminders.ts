// جدولة التذكيرات: دالة واحدة نقية تبني قائمة الإشعارات للأيام القادمة من إعدادات المستخدم.
// - في الويب: يعرضها التطبيق ما دام مفتوحًا.
// - في Android/iOS: تُسلَّم القائمة كاملة لنظام الإشعارات المحلية المجدولة (لا حساب في الخلفية).
// الرسائل قصيرة ومتنوعة، دون لوم ودون نسبة فضائل غير موثقة.
import { PRAYER_LABELS, prayerTimesFor } from './prayer'
import type { PrayerKey, Settings } from '../state/settings'
import { addDays, dateParts, dayKey } from '../lib/dates'
import { toHijri, occasionsFor } from './calendar'
import { plusActive } from '../billing/active'

export type ReminderKind = 'prayer' | 'prayer-before' | 'morning' | 'evening' | 'sleep' | 'ayah' | 'dhikr' | 'wird' | 'memorize' | 'occasion' | 'summary' | 'custom' | 'ramadan' | 'fasting'

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
}

/** حد iOS للإشعارات المحلية المجدولة هو 64؛ نترك هامشًا */
export const MAX_SCHEDULED = 60
/** أقصى عدد للتذكيرات الخاصة (رفيق بلس) */
export const MAX_CUSTOM = 10

const MESSAGES: Record<Exclude<ReminderKind, 'prayer' | 'prayer-before' | 'occasion' | 'custom' | 'ramadan' | 'fasting'>, { title: string; body: string }[]> = {
  morning: [
    { title: 'حان وقت أذكار الصباح', body: 'دقائق قليلة تبدأ بها يومك' },
    { title: 'أذكار الصباح', body: 'أذكارك بانتظارك في رفيق المسلم' },
    { title: 'صباح مبارك', body: 'هل قرأت أذكار الصباح اليوم؟' },
  ],
  evening: [
    { title: 'لا تنسَ أذكار المساء', body: 'افتح رفيق المسلم لقراءتها' },
    { title: 'أذكار المساء', body: 'وقت مناسب لأذكار المساء' },
    { title: 'مساء مبارك', body: 'أذكار المساء بانتظارك' },
  ],
  sleep: [
    { title: 'أذكار النوم', body: 'قبل أن تنام: أذكار النوم في دقيقتين' },
    { title: 'قبل النوم', body: 'أذكار النوم بانتظارك' },
  ],
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

const KIND_CODE: Record<ReminderKind, number> = { prayer: 1, 'prayer-before': 2, morning: 3, evening: 4, sleep: 5, ayah: 6, dhikr: 7, wird: 8, memorize: 9, occasion: 10, summary: 11, custom: 12, ramadan: 13, fasting: 14 }
const PRAYER_CODE: Record<PrayerKey, number> = { fajr: 1, dhuhr: 2, asr: 3, maghrib: 4, isha: 5 }

function makeId(day: { y: number; m: number; d: number }, kind: ReminderKind, slot = 0): number {
  // YYMMDD × 1000 + نوع × 10 + فتحة — رقم صحيح أقل من 2^31 كما يتطلب Android
  return ((day.y % 100) * 10000 + day.m * 100 + day.d) * 1000 + KIND_CODE[kind] * 10 + slot
}

const ROUTES: Record<ReminderKind, string> = {
  prayer: '/prayer', 'prayer-before': '/prayer', morning: '/adhkar-alert/morning', evening: '/adhkar-alert/evening', sleep: '/adhkar-alert/sleep',
  ayah: '/', dhikr: '/', wird: '/wird', memorize: '/memorize', occasion: '/calendar', summary: '/progress', custom: '/', ramadan: '/ramadan', fasting: '/calendar',
}

/**
 * يبني جدول التذكيرات من `from` ولمدة `days` يومًا، مرتبًا زمنيًا، بلا تكرار، وبحد أقصى MAX_SCHEDULED.
 * التذكيرات التي مضى وقتها تُستبعد.
 */
export function buildSchedule(settings: Settings, from: Date, days = 7): Reminder[] {
  const n = settings.notifications
  const loc = settings.location
  if (!n.enabled || !loc) return []
  const out = new Map<number, Reminder>()
  const add = (r: Reminder) => {
    if (r.at.getTime() <= from.getTime() - 60_000) return
    if (r.kind !== 'prayer' && r.kind !== 'prayer-before' && inQuietHours(r.at, loc.tz, n.quiet)) return
    out.set(r.id, r)
  }
  const place = loc.nameAr ?? loc.name

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
      : [['morning', n.morningAdhkar], ['evening', n.eveningAdhkar], ['sleep', n.sleepAdhkar], ['ayah', n.ayahOfDay], ['dhikr', n.dhikrOfDay], ['wird', n.wird], ['memorize', n.memorize], ['summary', n.dailySummary]]
    for (const [kind, time] of timed) {
      if (!time) continue
      const msg = pick(MESSAGES[kind as keyof typeof MESSAGES], seed)
      add({ id: makeId(day, kind), at: atLocalTime(day, time, loc.tz), kind, title: msg.title, body: msg.body, route: ROUTES[kind] })
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
    // رفيق بلس: التذكيرات الخاصة (حتى 10)، في أيامها المختارة فقط، ومع اشتراك ساري فقط
    if (plusActive() && !n.reduce) {
      const weekday = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay()
      ;(settings.customReminders ?? []).slice(0, MAX_CUSTOM).forEach((c, slot) => {
        if (!c.enabled || !c.title.trim() || !/^\d{2}:\d{2}$/.test(c.time) || !c.days.includes(weekday)) return
        add({ id: makeId(day, 'custom', slot), at: atLocalTime(day, c.time, loc.tz), kind: 'custom', title: c.title.trim().slice(0, 80), body: 'تذكير خاص — رفيق بلس', route: c.route || '/' })
      })
    }
  }
  return [...out.values()].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED)
}

/** التذكيرات المستحقة الآن (خلال آخر 90 ثانية) — للويب عندما يكون التطبيق مفتوحًا */
export function dueReminders(settings: Settings, now: Date, alreadyFired: Set<number>): Reminder[] {
  return buildSchedule(settings, new Date(now.getTime() - 90_000), 1)
    .filter((r) => r.at.getTime() <= now.getTime() && now.getTime() - r.at.getTime() < 90_000 && !alreadyFired.has(r.id))
}

export function todayKey(settings: Settings, now = new Date()) {
  return dayKey(now, settings.location?.tz)
}
