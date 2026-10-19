// منبّه الصلاة والأذكار في نسخة الويب.
// قيد مهم: المتصفح لا يسمح بجدولة إشعارات موثوقة والتطبيق مغلق. لذلك تعمل التنبيهات هنا
// ما دام التطبيق مفتوحًا (ولو في تبويب بالخلفية). في Android/iOS ستُستبدل بإشعارات محلية مجدولة.
import { showNotification } from '../platform'
import { nextPrayer, PRAYER_LABELS, todayTimes, type PrayerName } from './prayer'
import type { Settings } from '../state/settings'
import { dayKey } from '../lib/dates'

const fired = new Set<string>()

export function checkReminders(settings: Settings, now = new Date()): { title: string; body: string; tag: string }[] {
  const out: { title: string; body: string; tag: string }[] = []
  const n = settings.notifications
  const loc = settings.location
  if (!n.enabled || !loc) return out
  const times = todayTimes(loc, settings.prayer, now)
  const today = dayKey(now, loc.tz)
  for (const p of Object.keys(n.perPrayer) as Exclude<PrayerName, 'sunrise'>[]) {
    if (!n.perPrayer[p]) continue
    const at = times[p].getTime() - n.minutesBefore * 60_000
    const diff = now.getTime() - at
    const tag = `${today}:${p}`
    if (diff >= 0 && diff < 90_000 && !fired.has(tag)) {
      fired.add(tag)
      out.push({
        title: n.minutesBefore ? `اقترب وقت صلاة ${PRAYER_LABELS[p]}` : `حان الآن وقت صلاة ${PRAYER_LABELS[p]}`,
        body: n.minutesBefore ? `بعد ${n.minutesBefore} دقيقة — ${loc.nameAr ?? loc.name}` : `${loc.nameAr ?? loc.name}`,
        tag,
      })
    }
  }
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: loc.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  for (const [key, label] of [['morningAdhkar', 'أذكار الصباح'], ['eveningAdhkar', 'أذكار المساء']] as const) {
    const t = n[key]
    const tag = `${today}:${key}`
    if (t && hm === t && !fired.has(tag)) {
      fired.add(tag)
      out.push({ title: `تذكير: ${label}`, body: 'افتح رفيق المسلم لقراءة الأذكار', tag })
    }
  }
  return out
}

export function startReminderLoop(getSettings: () => Settings): () => void {
  const tick = () => {
    try {
      for (const r of checkReminders(getSettings())) showNotification(r.title, r.body, r.tag)
    } catch {
      // لا نوقف الحلقة بسبب خطأ عابر
    }
  }
  tick()
  const id = window.setInterval(tick, 20_000)
  return () => window.clearInterval(id)
}

export { nextPrayer }
