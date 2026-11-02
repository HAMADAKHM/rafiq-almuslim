// «الأكاديمية الإسلامية»: المقررات والدروس والاختبارات والمسابقة اليومية والإنجازات، ونظام المصادر والاستيراد.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Award, BookOpen, Check, ChevronLeft, Droplets, FileDown, FileUp, GraduationCap, Landmark, Link2, ShieldCheck, Sparkles, Star, Trash2, Trophy, Users, Baby, Scale, Clock3, Compass } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { kv } from '../../db/repos'
import { toast, useLive } from '../../hooks'
import { dayKey } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'
import { COURSES, allLessons, findLesson } from '../../content/academy/courses'
import { STATUS_LABEL, type AcademyLesson, type Course, type QuizQ } from '../../content/academy/types'
import { BADGES, dailyQuestions, fillMatches, loadProgress, markLesson, recordDaily, recordQuiz } from '../../services/academy'
import { PACK_TEMPLATE, importFromUrl, importPack, importedLessons, importedQuiz, listPacks, loadShowUnreviewed, removePack, saveShowUnreviewed } from '../../services/contentStore'
import { loadKids } from '../../services/kids'
import { BlockView, ReviewBanner } from './blocks'

const n2 = (n: number) => toArabicDigits(n)
const ICONS: Record<Course['icon'], typeof BookOpen> = { prayer: Compass, water: Droplets, seerah: Clock3, prophets: BookOpen, companions: Users, aqidah: Landmark, fiqh: Scale, kids: Baby }

function usePacks() { return useLive(() => listPacks(), ['kv:content:packs'], []) }
function useShowUnreviewed() { return useLive(() => loadShowUnreviewed(), ['kv:content:showUnreviewed'], true) }

/** دروس المقرر مع المستوردة، مع إخفاء غير المعتمد إن اختار المستخدم ذلك */
function courseLessons(c: Course, packs: Awaited<ReturnType<typeof listPacks>>, showUnreviewed: boolean) {
  const units = [...c.units, ...(importedLessons(packs, c.id).length ? [{ id: 'imported', title: 'دروس مستوردة', lessons: importedLessons(packs, c.id) }] : [])]
  return units.map((u) => ({ ...u, lessons: u.lessons.filter((l) => showUnreviewed || l.review.status === 'approved') }))
}

export function AcademyHome() {
  const progress = useLive(() => loadProgress(), ['kv:academy:progress:self'], null)
  const total = allLessons().length
  return (
    <div className="page ac-page">
      <PageHead title="الأكاديمية الإسلامية" subtitle="مدرسة إسلامية مصغرة: دروس منظمة من القرآن والسنة، واختبارات ومسابقات" />
      <section className="card ac-me">
        <Trophy size={22} />
        <div style={{ flex: 1 }}><strong>{n2(progress?.points ?? 0)} نقطة</strong><small className="muted"> • {n2(Object.keys(progress?.lessons ?? {}).length)} من {n2(total)} درسًا • {n2(progress?.badges.length ?? 0)} إنجازات</small></div>
        <Link className="btn btn-sm" to="/academy/achievements">إنجازاتي</Link>
      </section>
      <Link to="/academy/daily" className="card ac-daily">
        <Sparkles size={22} /><span><strong>المسابقة اليومية</strong><small>خمسة أسئلة جديدة كل يوم مع شرح الإجابات</small></span><ChevronLeft size={18} />
      </Link>
      <div className="ac-courses">
        {COURSES.map((c) => {
          const Icon = ICONS[c.icon]
          const ls = c.units.flatMap((u) => u.lessons)
          const done = ls.filter((l) => progress?.lessons[`${c.id}/${l.id}`]).length
          return (
            <Link key={c.id} to={c.kids ? '/kids' : `/academy/course/${c.id}`} className="card ac-course" style={{ ['--c' as string]: c.color }}>
              <span className="ac-course-icon"><Icon size={22} /></span>
              <strong>{c.title}</strong>
              <small>{c.intro}</small>
              <small className="muted">{n2(ls.length)} درسًا{done ? ` • أنجزت ${n2(done)}` : ''}</small>
            </Link>
          )
        })}
      </div>
      <div className="hd-links">
        <Link className="list-card" to="/hadith"><span className="icon-chip"><BookOpen size={18} /></span><span className="lc-body"><strong>مكتبة الأحاديث</strong><small>الكتب السبعة بأحكامها</small></span><ChevronLeft size={18} /></Link>
        <Link className="list-card" to="/academy/sources"><span className="icon-chip"><ShieldCheck size={18} /></span><span className="lc-body"><strong>المصادر وحالة المراجعة</strong><small>ما اعتُمد وما هو قيد المراجعة، واستيراد محتوى موثق</small></span><ChevronLeft size={18} /></Link>
      </div>
    </div>
  )
}

export function CoursePage() {
  const { courseId = '' } = useParams()
  const c = COURSES.find((x) => x.id === courseId)
  const packs = usePacks()
  const show = useShowUnreviewed()
  const progress = useLive(() => loadProgress(), ['kv:academy:progress:self'], null)
  if (!c) return <div className="page"><PageHead title="المقرر غير موجود" /><Link to="/academy">الأكاديمية</Link></div>
  return (
    <div className="page ac-page">
      <PageHead title={c.title} subtitle={c.intro} />
      {courseLessons(c, packs, show).map((u) => (
        <section key={u.id} aria-label={u.title}>
          <h2 className="hd-h2">{u.title}</h2>
          {!u.lessons.length ? <p className="small muted">لا توجد دروس معتمدة في هذه الوحدة بعد. يمكنك إظهار المحتوى قيد المراجعة من «المصادر وحالة المراجعة».</p> : (
            <ul className="plain stack" style={{ gap: 6 }}>
              {u.lessons.map((l) => {
                const done = !!progress?.lessons[`${c.id}/${l.id}`]
                return (
                  <li key={l.id}><Link className="list-card" to={`/academy/lesson/${c.id}/${encodeURIComponent(l.id)}`}>
                    <span className={'icon-chip' + (done ? ' green' : '')}>{done ? <Check size={18} /> : <GraduationCap size={18} />}</span>
                    <span className="lc-body"><strong>{l.title}</strong><small>{l.summary}</small><small className={'ac-status ' + l.review.status}>{STATUS_LABEL[l.review.status]}{l.quiz?.length ? ` • اختبار من ${n2(l.quiz.length)} أسئلة` : ''}</small></span>
                    <ChevronLeft size={18} />
                  </Link></li>
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

function lessonOf(courseId: string, lessonId: string, packs: Awaited<ReturnType<typeof listPacks>>): { course: Course; lesson: AcademyLesson } | null {
  const f = findLesson(courseId, lessonId)
  if (f) return f
  const c = COURSES.find((x) => x.id === courseId)
  const l = c && importedLessons(packs, c.id).find((x) => x.id === lessonId)
  return c && l ? { course: c, lesson: l } : null
}

export function LessonPage({ kidId }: { kidId?: string }) {
  const { courseId = '', lessonId = '' } = useParams()
  const packs = usePacks()
  const f = lessonOf(courseId, decodeURIComponent(lessonId), packs)
  const pid = kidId ?? 'self'
  const progress = useLive(() => loadProgress(pid), [`kv:academy:progress:${pid}`], null, [pid])
  if (!f) return <div className="page"><PageHead title="الدرس غير موجود" /><Link to={kidId ? '/kids' : '/academy'}>رجوع</Link></div>
  const { course, lesson } = f
  const lkey = `${course.id}/${lesson.id}`
  const done = !!progress?.lessons[lkey]
  const quizLen = (lesson.quiz?.length ?? 0) + importedQuiz(packs, course.id, lesson.id).length
  const base = kidId ? '/kids' : '/academy'
  return (
    <div className="page ac-page">
      <PageHead title={lesson.title} subtitle={lesson.summary} />
      <ReviewBanner review={lesson.review} sources={lesson.sources} />
      <div className="stack" style={{ gap: 10 }}>{lesson.blocks.map((b, i) => <BlockView key={i} b={b} kid={!!kidId} />)}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className={'btn' + (done ? '' : ' btn-primary')} disabled={done} onClick={async () => { const got = await markLesson(lkey, dayKey(), pid); toast(got.length ? `أحسنت! إنجاز جديد: ${BADGES[got[0]]?.title}` : 'أحسنت! سُجّل إنهاء الدرس (+5 نقاط)') }}>
          <Check size={16} /> {done ? 'أنهيت هذا الدرس' : 'أنهيت الدرس'}
        </button>
        {quizLen > 0 && <Link className="btn btn-primary" to={`${base}/quiz/${course.id}/${encodeURIComponent(lesson.id)}`}><Star size={16} /> الاختبار ({n2(quizLen)} أسئلة)</Link>}
      </div>
    </div>
  )
}

// ---------- الاختبارات ----------
export function QuizRunner({ questions, onFinish, title }: { questions: QuizQ[]; onFinish: (correct: number) => Promise<string>; title: string }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [fill, setFill] = useState('')
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const q = questions[i]
  if (!questions.length) return <div className="card">لا توجد أسئلة.</div>
  if (result != null) return (
    <section className="card ac-result" aria-live="polite">
      <Trophy size={32} />
      <h2>النتيجة: {n2(score)} من {n2(questions.length)}</h2>
      <p>{result}</p>
    </section>
  )
  const correct = q.kind === 'fill' ? fillMatches(fill, String(q.answer)) : picked === q.answer
  const check = () => { setChecked(true); if (correct) setScore((s) => s + 1) }
  const next = async () => {
    if (i + 1 < questions.length) { setI(i + 1); setPicked(null); setFill(''); setChecked(false); return }
    setResult(await onFinish(score))
  }
  return (
    <section className="card ac-quiz" aria-label={title}>
      <div className="spread"><small className="muted">السؤال {n2(i + 1)} من {n2(questions.length)}</small><small className="muted">{['سهل', 'متوسط', 'متقدم'][q.level - 1]}</small></div>
      <h2 className="ac-q">{q.q}</h2>
      {q.kind === 'fill' ? (
        <input className="input" value={fill} disabled={checked} onChange={(e) => setFill(e.target.value)} placeholder="اكتب الإجابة" aria-label="الإجابة" />
      ) : (
        <div className="stack" style={{ gap: 8 }} role="radiogroup">
          {q.options!.map((o, k) => (
            <button key={k} type="button" role="radio" aria-checked={picked === k} disabled={checked}
              className={'ac-opt' + (picked === k ? ' on' : '') + (checked && k === q.answer ? ' right' : '') + (checked && picked === k && k !== q.answer ? ' wrong' : '')}
              onClick={() => setPicked(k)}>{o}</button>
          ))}
        </div>
      )}
      {checked && (
        <div className={'alert ' + (correct ? 'alert-ok' : 'alert-gold')} role="status">
          <strong>{correct ? 'إجابة صحيحة ✓' : `الإجابة الصحيحة: ${q.kind === 'fill' ? q.answer : q.options![q.answer as number]}`}</strong>
          <p style={{ margin: '4px 0 0' }}>{q.explain}{q.ref ? ` (${q.ref})` : ''}</p>
        </div>
      )}
      {!checked
        ? <button className="btn btn-primary" disabled={q.kind === 'fill' ? !fill.trim() : picked == null} onClick={check}>تحقق</button>
        : <button className="btn btn-primary" onClick={next}>{i + 1 < questions.length ? 'السؤال التالي' : 'النتيجة'}</button>}
    </section>
  )
}

export function LessonQuizPage({ kidId }: { kidId?: string }) {
  const { courseId = '', lessonId = '' } = useParams()
  const packs = usePacks()
  const f = lessonOf(courseId, decodeURIComponent(lessonId), packs)
  const pid = kidId ?? 'self'
  const qs = useMemo(() => (f ? [...(f.lesson.quiz ?? []), ...importedQuiz(packs, f.course.id, f.lesson.id)] : []), [f, packs])
  if (!f) return <div className="page"><PageHead title="غير موجود" /></div>
  return (
    <div className="page ac-page">
      <PageHead title={`اختبار: ${f.lesson.title}`} subtitle="أجب ثم اضغط «تحقق» لترى الشرح" />
      <QuizRunner title={f.lesson.title} questions={qs} onFinish={async (c) => {
        const r = await recordQuiz(`${f.course.id}/${f.lesson.id}`, c, qs.length, dayKey(), pid)
        return `${r.gained ? `+${n2(r.gained)} نقطة. ` : 'لا نقاط إضافية (النقاط عن التحسن فقط). '}${r.badges.length ? `إنجاز جديد: ${r.badges.map((b) => BADGES[b]?.title).join('، ')}` : ''}`
      }} />
      <Link className="btn" to={`${kidId ? '/kids' : '/academy'}/lesson/${f.course.id}/${encodeURIComponent(f.lesson.id)}`}>العودة إلى الدرس</Link>
    </div>
  )
}

export function DailyQuizPage({ kidId }: { kidId?: string }) {
  const day = dayKey()
  const qs = useMemo(() => dailyQuestions(day, !!kidId), [day, kidId])
  const pid = kidId ?? 'self'
  const progress = useLive(() => loadProgress(pid), [`kv:academy:progress:${pid}`], null, [pid])
  return (
    <div className="page ac-page">
      <PageHead title="المسابقة اليومية" subtitle="أسئلة اليوم من دروس الأكاديمية، وتتجدد كل يوم" />
      {progress?.daily[day] != null && <p className="small muted">شاركت اليوم ({n2(progress.daily[day])} من {n2(qs.length)}). يمكنك الإعادة للتدرب؛ النقاط تُحتسب مرة واحدة في اليوم.</p>}
      <QuizRunner title="المسابقة اليومية" questions={qs} onFinish={async (c) => {
        const r = await recordDaily(day, c, pid)
        return `${r.gained ? `+${n2(r.gained)} نقطة. ` : ''}عد غدًا لأسئلة جديدة.${r.badges.length ? ` إنجاز جديد: ${r.badges.map((b) => BADGES[b]?.title).join('، ')}` : ''}`
      }} />
    </div>
  )
}

export function AchievementsPage() {
  const progress = useLive(() => loadProgress(), ['kv:academy:progress:self'], null)
  const kids = useLive(() => loadKids(), ['kv:kids:profiles'], [])
  const showBoard = useLive(() => kv.get<boolean>('academy:board', false), ['kv:academy:board'], false)
  const [board, setBoard] = useState<{ name: string; points: number }[]>([])
  useEffect(() => {
    if (!showBoard) return
    Promise.all([loadProgress('self').then((p) => ({ name: 'أنا', points: p.points })), ...kids.map((k) => loadProgress(k.id).then((p) => ({ name: k.name, points: p.points })))]).then((l) => setBoard(l.sort((a, b) => b.points - a.points)))
  }, [showBoard, kids])
  return (
    <div className="page ac-page">
      <PageHead title="إنجازاتي" subtitle="النقاط والشارات من الدروس والاختبارات" />
      <section className="card ac-me"><Trophy size={22} /><strong>{n2(progress?.points ?? 0)} نقطة</strong><small className="muted">أيام متتالية: {n2(progress?.streak.count ?? 0)}</small></section>
      <div className="ac-badges">
        {Object.entries(BADGES).map(([id, b]) => {
          const on = progress?.badges.includes(id)
          return <div key={id} className={'card ac-badge' + (on ? ' on' : '')}><Award size={26} /><strong>{b.title}</strong><small>{b.hint}</small></div>
        })}
      </div>
      <section className="card">
        <label className="check"><input type="checkbox" className="switch-input" checked={showBoard} onChange={(e) => kv.set('academy:board', e.target.checked)} /> ترتيب أفراد العائلة على هذا الجهاز (اختياري)</label>
        {showBoard && (board.length > 1 ? <ol>{board.map((r, i) => <li key={i}>{r.name}: {n2(r.points)} نقطة</li>)}</ol> : <p className="small muted">أضف ملفات الأطفال من «مساحة الأطفال» ليظهر الترتيب بينكم.</p>)}
        <p className="small muted" style={{ margin: 0 }}>الترتيب على هذا الجهاز فقط، ولا يُرسل إلى أي خادم.</p>
      </section>
    </div>
  )
}

// ---------- المصادر وحالة المراجعة والاستيراد ----------
export function SourcesPage() {
  const packs = usePacks()
  const show = useShowUnreviewed()
  const [url, setUrl] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const file = useRef<HTMLInputElement>(null)
  const nav = useNavigate()
  const all = allLessons()
  const count = (fn: (l: AcademyLesson) => boolean) => all.filter(({ lesson }) => fn(lesson)).length
  const done = (r: Awaited<ReturnType<typeof importPack>>) => {
    if (r.ok) { setErrors([]); toast(`${r.replaced ? 'حُدّثت' : 'استُوردت'} الحزمة «${r.pack.title}» (${n2(r.pack.items.length)} عنصرًا)`) } else setErrors(r.errors)
  }
  const download = () => {
    const blob = new Blob([JSON.stringify(PACK_TEMPLATE, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rafiq-content-pack-template.json'; a.click(); URL.revokeObjectURL(a.href)
  }
  return (
    <div className="page ac-page">
      <PageHead title="المصادر وحالة المراجعة" subtitle="الفصل بين المحتوى المعتمد والمحتوى الذي لم يُراجع بعد، واستيراد محتوى موثق" />
      <section className="card stack" style={{ gap: 6 }}>
        <h2 className="hd-h2" style={{ marginTop: 0 }}>محتوى الأكاديمية المضمّن</h2>
        <p className="small" style={{ margin: 0 }}>{n2(all.length)} درسًا: {n2(count((l) => l.review.status === 'approved'))} معتمد، {n2(count((l) => l.review.status === 'review'))} قيد المراجعة، {n2(count((l) => l.review.status === 'incomplete'))} غير مكتمل.</p>
        <p className="small" style={{ margin: 0 }}>منها {n2(count((l) => l.review.verification === 'primary'))} درسًا من نصوص أصلية فقط (آيات بمواضعها وأحاديث بأرقامها)، و{n2(count((l) => l.review.verification === 'secondary'))} تلخيصًا تعليميًا ينتظر مراجعة متخصص شرعي.</p>
        <p className="small muted" style={{ margin: 0 }}>لا يُعتمد أي درس إلا بذكر اسم المراجع العلمي وتاريخ المراجعة. لم يُستعمل الذكاء الاصطناعي لاختلاق أحاديث أو أحكام: الآيات من المصحف المضمّن، والأحاديث من قاعدة الكتب السبعة بأرقامها المتحقق منها.</p>
        <label className="check"><input type="checkbox" className="switch-input" checked={show} onChange={(e) => saveShowUnreviewed(e.target.checked)} /> إظهار المحتوى قيد المراجعة (بعلامة واضحة)</label>
      </section>
      <section className="card stack" style={{ gap: 8 }}>
        <h2 className="hd-h2" style={{ marginTop: 0 }}>استيراد حزمة محتوى</h2>
        <p className="small muted" style={{ margin: 0 }}>شروح الأحاديث وفوائدها، ودروس وأسئلة إضافية، من ملف أو رابط https — دون تحديث التطبيق. كل عنصر يجب أن يذكر مصدره وحالة مراجعته، والمعتمد منه يذكر اسم المراجع، وإلا رُفضت الحزمة.</p>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { done(await importPack(JSON.parse(await f.text()), f.name)) } catch { setErrors(['الملف ليس JSON صالحًا']) } e.target.value = '' }} />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-primary" onClick={() => file.current?.click()}><FileUp size={14} /> من ملف</button>
          <button className="btn btn-sm" onClick={download}><FileDown size={14} /> تنزيل قالب الصيغة</button>
        </div>
        <div className="row">
          <input className="input" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/pack.json" aria-label="رابط الحزمة" />
          <button className="btn btn-sm" disabled={!url.trim()} onClick={async () => done(await importFromUrl(url.trim()))}><Link2 size={14} /> من رابط</button>
        </div>
        {errors.length > 0 && <div className="alert alert-gold small" role="alert"><strong>رُفضت الحزمة:</strong><ul style={{ margin: 0 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
      </section>
      <section className="card stack" style={{ gap: 6 }}>
        <h2 className="hd-h2" style={{ marginTop: 0 }}>الحزم المستوردة</h2>
        {packs.length ? packs.map((p) => (
          <div key={p.id} className="spread small">
            <span><strong>{p.title}</strong>{p.publisher ? ` — ${p.publisher}` : ''} • {n2(p.items.length)} عنصرًا • {p.items.filter((i) => (i.kind === 'lesson' ? i.lesson.review : i.review).status === 'approved').length ? 'فيها معتمد' : 'كلها غير معتمدة'}</span>
            <button className="btn btn-ghost btn-sm icon-btn" aria-label={`حذف ${p.title}`} onClick={async () => { await removePack(p.id); toast('حُذفت الحزمة') }}><Trash2 size={14} /></button>
          </div>
        )) : <p className="small muted" style={{ margin: 0 }}>لا توجد حزم مستوردة.</p>}
      </section>
      <button className="btn btn-ghost" style={{ alignSelf: 'start' }} onClick={() => nav('/academy')}>العودة إلى الأكاديمية</button>
    </div>
  )
}
