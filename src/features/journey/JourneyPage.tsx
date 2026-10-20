import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../../components/Common'
import { toast, useLive } from '../../hooks'
import { GOALS, suggestPlan, type Journey, type JourneyGoal } from '../../services/plans'
import { activePlan, createPlan, loadKhatmas, saveKhatmas } from '../../services/khatma'
import { kv } from '../../db/repos'
import { dayKey } from '../../lib/dates'

export function JourneyPage() {
  const saved = useLive(() => kv.get<Journey | null>('journey', null), ['kv:journey'], null)
  const [goal, setGoal] = useState<JourneyGoal | null>(null)
  const [minutes, setMinutes] = useState(15)
  const g = goal ?? saved?.goal ?? null
  const plan = g ? suggestPlan(g, minutes) : null

  const apply = async () => {
    if (!g || !plan) return
    const today = dayKey()
    await kv.set('journey', { goal: g, minutes, createdAt: today } satisfies Journey)
    // تعديل الخطة النشطة (دون فقد موضعها) أو إنشاء خطة جديدة
    const k = await loadKhatmas()
    const a = activePlan(k)
    await saveKhatmas(a
      ? { ...k, plans: k.plans.map((p) => (p.id === a.id ? { ...p, mode: 'pages' as const, pagesPerDay: plan.pagesPerDay } : p)) }
      : { ...k, plans: [...k.plans, createPlan({ mode: 'pages', pagesPerDay: plan.pagesPerDay, today, name: 'وردي اليومي' })] })
    if (plan.memorizeAyahs) await kv.set('memo:dailyNew', 1)
    toast('بدأت رحلتك — وفقك الله')
  }

  return (
    <>
      <PageHead title="ابدأ رحلتك" subtitle="اختر هدفك والوقت المتاح لك، وسنقترح برنامجًا بسيطًا يمكنك تعديله أو إيقافه في أي وقت." />
      {saved && <p className="alert alert-info">رحلتك الحالية: <strong>{GOALS.find((x) => x.id === saved.goal)?.title}</strong> منذ {saved.createdAt}. يمكنك تغييرها أو البدء من جديد متى شئت.</p>}
      <div className="grid grid-2" role="radiogroup" aria-label="الهدف">
        {GOALS.map((x) => (
          <button key={x.id} role="radio" aria-checked={g === x.id} className="card card-link" style={{ textAlign: 'start', cursor: 'pointer', borderColor: g === x.id ? 'var(--primary)' : undefined, borderWidth: g === x.id ? 2 : 1 }} onClick={() => setGoal(x.id)}>
            <h2>{x.title}</h2>
            <p className="small muted" style={{ margin: 0 }}>{x.desc}</p>
          </button>
        ))}
      </div>
      <section className="card" style={{ marginTop: '1rem' }}>
        <label className="field" style={{ maxWidth: 360 }}>
          <span>كم دقيقة يمكنك تخصيصها يوميًا؟ ({minutes} دقيقة)</span>
          <input type="range" min={5} max={90} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </label>
        {plan && (
          <div className="stack" style={{ marginTop: '1rem' }}>
            <h2>البرنامج المقترح</h2>
            <ul>
              <li>ورد القرآن: <strong>{plan.pagesPerDay} {plan.pagesPerDay <= 10 ? 'صفحات' : 'صفحة'}</strong> يوميًا</li>
              {plan.memorizeAyahs > 0 && <li>الحفظ: مقطع جديد يوميًا (نحو {plan.memorizeAyahs} آيات) مع المراجعة</li>}
              {plan.adhkar && <li>أذكار الصباح والمساء، وأذكار بعد الصلاة</li>}
            </ul>
            {plan.tips.map((t, i) => <p key={i} className="small muted" style={{ margin: 0 }}>• {t}</p>)}
            <div className="row">
              <button className="btn btn-primary" onClick={apply}>اعتماد البرنامج</button>
              <Link to="/wird" className="btn">اذهب إلى ورد اليوم</Link>
              {plan.memorizeAyahs > 0 && <Link to="/memorize" className="btn">اختر ما تحفظه</Link>}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
