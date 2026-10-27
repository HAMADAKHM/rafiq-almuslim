// بطاقة «رفيقي اليومي» (رفيق بلس) في الرئيسية: الورد التالي، وآخر موضع، والذكر التالي، والهدف الصغير، وزر متابعة واحد.
// لا تظهر دون اشتراك (الرئيسية صفحة مجانية ولا يوضع فيها قفل).
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, BookOpen, Settings2, Target } from 'lucide-react'
import { usePlus } from '../../billing/PlusContext'
import { useSettings } from '../../state/SettingsContext'
import { useKhatmas } from '../wird/KhatmaCard'
import { activePlan, dailyTarget } from '../../services/khatma'
import { buildSchedule } from '../../services/reminders'
import { goalProgress, positionRoute, positionText } from '../../services/companion'
import { loadActualDays, loadDoneToday, loadPosition } from '../../services/companionStore'
import { adhkarLog, reading } from '../../db/repos'
import { dayKey } from '../../lib/dates'
import { useLive, useNow } from '../../hooks'
import { toArabicDigits } from '../../lib/arabic'
import { ProgressBar } from '../../components/Common'

export function DailyCompanionCard() {
  const { entitled } = usePlus()
  const { settings } = useSettings()
  const now = useNow(60_000)
  const tz = settings.location?.tz
  const today = dayKey(now, tz)
  const c = settings.companion
  const khatmas = useKhatmas()
  const pos = useLive(() => loadPosition(), ['kv:quran:actual', 'kv:quran:last'], null)
  const actualDays = useLive(() => loadActualDays(), ['kv:quran:actualDays'], {} as Record<string, number[]>)
  const done = useLive(() => loadDoneToday(tz), ['kv:companion:done'], { date: '', ids: [] as string[] }, [tz])
  const reads = useLive(() => reading.forDay(today), ['readLog'], [], [today])
  const adh = useLive(() => adhkarLog.forDay(today), ['adhkarLog'], [], [today])
  const next = useMemo(() => {
    if (!settings.notifications.enabled || !settings.location) return null
    return buildSchedule(settings, now, 1).find((r) => r.kind === 'dhikr-interval') ?? null
  }, [settings, now])
  if (!entitled) return null

  const plan = khatmas ? activePlan(khatmas) : null
  const tgt = plan ? dailyTarget(plan, today) : null
  const goal = goalProgress(c.goal, { pages: [...(actualDays[today] ?? []), ...reads.flatMap((r) => r.pages)], adhkar: done.ids.length + new Set(adh.map((a) => a.category)).size })
  const fmt = (d: Date) => new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(d)
  // زر واحد للمتابعة: القراءة إن لم يكتمل هدفها، ثم الذكر
  const cont = goal.pagesDone < goal.pagesGoal || !next ? { to: positionRoute(pos), label: 'تابِع القراءة' } : { to: next.route, label: 'اقرأ الذكر التالي' }

  return (
    <section className="card companion-card" aria-label="رفيقي اليومي">
      <div className="spread">
        <h2 style={{ margin: 0 }}>رفيقي اليومي</h2>
        <Link className="btn btn-ghost btn-sm icon-btn" to="/companion" aria-label="تخصيص رفيقي اليومي"><Settings2 size={16} /></Link>
      </div>
      <ul className="plain companion-rows">
        {c.card.wird && (
          <li><BookOpen size={16} aria-hidden="true" />
            <span>{plan && tgt ? (tgt.doneToday >= tgt.pages ? 'أتممت ورد اليوم — بارك الله فيك' : `الورد التالي: الصفحات ${toArabicDigits(tgt.from)}–${toArabicDigits(tgt.to)}`) : <>لا توجد ختمة نشطة — <Link to="/wird">ابدأ ختمة</Link></>}</span>
          </li>
        )}
        {c.card.position && (
          <li><BookOpen size={16} aria-hidden="true" /><span>{pos ? positionText(pos) : 'لم تبدأ القراءة بعد'}</span></li>
        )}
        {c.card.dhikr && (
          <li><BellRing size={16} aria-hidden="true" />
            <span>{next ? <>الذكر التالي {fmt(next.at)}: <Link to={next.route}>{next.body.length > 50 ? next.body.slice(0, 50) + '…' : next.body}</Link></> : <>لا تذكير قادم بالأذكار — <Link to="/companion">اضبط «رفيقي يذكّرني»</Link></>}</span>
          </li>
        )}
        {c.card.goal && (
          <li className="companion-goal"><Target size={16} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              هدفي اليوم: {toArabicDigits(goal.pagesDone)}/{toArabicDigits(goal.pagesGoal)} صفحة، و{toArabicDigits(goal.adhkarDone)}/{toArabicDigits(goal.adhkarGoal)} أذكار
              <ProgressBar value={goal.percent} label={`إنجاز الهدف ${toArabicDigits(Math.round(goal.percent * 100))}٪`} />
            </span>
          </li>
        )}
      </ul>
      <Link className="btn btn-primary" to={cont.to} style={{ alignSelf: 'stretch', justifyContent: 'center' }}>{cont.label}</Link>
    </section>
  )
}
