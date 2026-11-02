// مساحة الأطفال والرقابة الأبوية: ملفات الأطفال، والمحتوى المسموح، ووقت الاستخدام، ورمز PIN،
// ووضع الطفل الذي يقصر التطبيق على هذه المساحة (لا روابط خارجية ولا إعلانات).
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Baby, BookOpen, Clock3, Compass, Droplets, Heart, Landmark, Lock, LogOut, Plus, Sparkles, Star, Trash2, Type, UserRound } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { toast, useLive } from '../../hooks'
import { dayKey } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'
import { PROPHETS } from '../../content/academy/courses'
import { loadProgress } from '../../services/academy'
import {
  AGE_LABEL, KID_SECTIONS, activeKidId, addUsage, checkPin, enterKidMode, exitKidMode, extraMinutes, grantExtra, hasPin, loadKids, newKid, removeKid, saveKid, setPin, timeLeft, usedSeconds,
  type AgeGroup, type KidProfile, type KidSection,
} from '../../services/kids'
import { DailyQuizPage, LessonPage, LessonQuizPage } from './AcademyPages'

const n2 = (n: number) => toArabicDigits(n)

export function useActiveKid(): KidProfile | null {
  const id = useLive(() => activeKidId(), ['kv:kids:active'], null)
  const kids = useLive(() => loadKids(), ['kv:kids:profiles'], [])
  return kids.find((k) => k.id === id) ?? null
}

/** نافذة رمز الوالدين */
function PinGate({ onOk, label = 'رمز الوالدين' }: { onOk: () => void; label?: string }) {
  const [pin, setP] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <form className="card stack ac-pin" style={{ gap: 8 }} onSubmit={async (e) => { e.preventDefault(); const r = await checkPin(pin); if (r === 'ok') onOk(); else setMsg(r === 'locked' ? 'محاولات كثيرة: انتظر خمس دقائق ثم أعد المحاولة' : 'الرمز غير صحيح'); setP('') }}>
      <Lock size={22} />
      <label className="field"><span>{label}</span><input className="input" type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => setP(e.target.value.replace(/\D/g, ''))} aria-label={label} /></label>
      {msg && <p className="small" role="alert" style={{ margin: 0 }}>{msg}</p>}
      <button className="btn btn-primary" disabled={pin.length < 4}>متابعة</button>
    </form>
  )
}

/** يحسب وقت استخدام الطفل ويغلق المساحة عند انتهاء وقت اليوم */
function KidTimer({ kid, children }: { kid: KidProfile; children: ReactNode }) {
  const day = dayKey()
  const used = useLive(() => usedSeconds(kid.id, day), [`kv:kids:usage:${kid.id}:${day}`], 0, [kid.id, day])
  const extra = useLive(() => extraMinutes(kid.id, day), [`kv:kids:extra:${kid.id}:${day}`], 0, [kid.id, day])
  const [askPin, setAskPin] = useState(false)
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') addUsage(kid.id, day, 15).catch(() => {}) }, 15_000)
    return () => clearInterval(t)
  }, [kid.id, day])
  const left = timeLeft(kid, used, extra)
  if (left === 0) return (
    <div className="page kids-page">
      <section className="card kids-timeup"><Clock3 size={40} /><h2>انتهى وقت اليوم يا {kid.name}</h2><p>أحسنت! نلتقي غدًا إن شاء الله.</p></section>
      {askPin ? <PinGate onOk={async () => { await grantExtra(kid.id, day, 15); setAskPin(false); toast('أُضيفت 15 دقيقة') }} label="رمز الوالدين لإضافة وقت" />
        : <button className="btn" onClick={() => setAskPin(true)}>إضافة وقت (للوالدين)</button>}
    </div>
  )
  return <>{left != null && left < 300 && <p className="kids-left" role="status">بقي {n2(Math.ceil(left / 60))} دقائق</p>}{children}</>
}

const TILES: { id: KidSection; title: string; to: string; icon: typeof Baby; color: string }[] = [
  { id: 'prayer', title: 'أتعلم الصلاة', to: '/kids/lesson/salah/salah-how', icon: Compass, color: '#2e8467' },
  { id: 'wudu', title: 'أتعلم الوضوء', to: '/kids/lesson/taharah/wudu-steps', icon: Droplets, color: '#1F6F8B' },
  { id: 'prophets', title: 'قصص الأنبياء', to: '/kids/prophets', icon: BookOpen, color: '#8A6A24' },
  { id: 'akhlaq', title: 'أخلاقي', to: '/kids/lesson/kids/kids-akhlaq', icon: Heart, color: '#b4536e' },
  { id: 'letters', title: 'الحروف العربية', to: '/kids/letters', icon: Type, color: '#6C4A8A' },
  { id: 'adhkar', title: 'أذكاري', to: '/kids-adhkar', icon: Sparkles, color: '#C8641E' },
  { id: 'aqidah', title: 'أركان الإسلام', to: '/kids/lesson/aqidah/pillars', icon: Landmark, color: '#0F6E70' },
  { id: 'quiz', title: 'مسابقة اليوم', to: '/kids/daily', icon: Star, color: '#d4a84f' },
]

export function KidsHome() {
  const kid = useActiveKid()
  const kids = useLive(() => loadKids(), ['kv:kids:profiles'], [])
  const progress = useLive(() => (kid ? loadProgress(kid.id) : Promise.resolve(null)), kid ? [`kv:academy:progress:${kid.id}`] : [], null, [kid?.id])
  const [exiting, setExiting] = useState(false)
  const nav = useNavigate()
  if (!kid) return (
    <div className="page kids-page">
      <PageHead title="مساحة الأطفال" subtitle="الصلاة والوضوء وقصص الأنبياء والأخلاق والحروف والأذكار، بأمان ودون إعلانات أو روابط خارجية" />
      {kids.length ? (
        <section className="stack" style={{ gap: 8 }} aria-label="ملفات الأطفال">
          <h2 className="hd-h2">من سيتعلم الآن؟</h2>
          {kids.map((k) => <button key={k.id} className="list-card" onClick={async () => { await enterKidMode(k.id); toast(`مرحبًا ${k.name}`) }}><span className="icon-chip"><UserRound size={18} /></span><span className="lc-body"><strong>{k.name}</strong><small>{AGE_LABEL[k.age]}{k.dailyMinutes ? ` • ${n2(k.dailyMinutes)} دقيقة يوميًا` : ''}</small></span></button>)}
        </section>
      ) : <div className="card">لم يُنشأ ملف لطفل بعد. ابدأ من «إعدادات الوالدين».</div>}
      <Link className="btn" to="/kids/parent"><Lock size={16} /> إعدادات الوالدين</Link>
    </div>
  )
  const tiles = TILES.filter((t) => kid.allowed.includes(t.id))
  return (
    <KidTimer kid={kid}>
      <div className="page kids-page">
        <header className="kids-head"><h1>أهلًا {kid.name} 🌟</h1><span className="kids-points"><Star size={16} /> {n2(progress?.points ?? 0)} نقطة</span></header>
        <div className="kids-tiles">{tiles.map((t) => { const I = t.icon; return <Link key={t.id} to={t.to} className="kids-tile" style={{ ['--c' as string]: t.color }}><I size={34} /><strong>{t.title}</strong></Link> })}</div>
        {progress && progress.badges.length > 0 && <p className="small" style={{ textAlign: 'center' }}>شاراتك: {n2(progress.badges.length)} 🏅</p>}
        {exiting ? <PinGate onOk={async () => { await exitKidMode(); setExiting(false); nav('/') }} label="رمز الوالدين للخروج" />
          : <button className="btn btn-ghost" onClick={async () => { if (await hasPin()) setExiting(true); else { await exitKidMode(); nav('/') } }}><LogOut size={16} /> خروج (للوالدين)</button>}
      </div>
    </KidTimer>
  )
}

/** صفحة داخل مساحة الطفل: تتحقق أن القسم مسموح، وتحسب الوقت */
function KidOnly({ section, children }: { section?: KidSection; children: ReactNode }) {
  const kid = useActiveKid()
  if (!kid) return <div className="page"><PageHead title="مساحة الأطفال" /><Link className="btn" to="/kids">اختر ملف الطفل أولًا</Link></div>
  if (section && !kid.allowed.includes(section)) return <div className="page"><PageHead title="هذا القسم غير متاح" /><Link className="btn" to="/kids">العودة</Link></div>
  return <KidTimer kid={kid}><div className="kids-page">{children}<Link className="btn btn-ghost" to="/kids">العودة إلى مساحتي</Link></div></KidTimer>
}

const SECTION_OF: Record<string, KidSection> = { 'salah-how': 'prayer', tashahhud: 'prayer', 'salah-adhkar': 'adhkar', 'wudu-steps': 'wudu', 'kids-akhlaq': 'akhlaq', 'kids-letters': 'letters', 'kids-adhkar': 'adhkar', pillars: 'aqidah' }

export function KidLessonPage() {
  const kid = useActiveKid()
  const { lessonId = '' } = useParams()
  const sec = lessonId.startsWith('prophet-') ? 'prophets' : SECTION_OF[decodeURIComponent(lessonId)]
  return <KidOnly section={sec}>{kid && <LessonPage kidId={kid.id} />}</KidOnly>
}
export function KidQuizPage() { const kid = useActiveKid(); return <KidOnly section="quiz">{kid && <LessonQuizPage kidId={kid.id} />}</KidOnly> }
export function KidDailyPage() { const kid = useActiveKid(); return <KidOnly section="quiz">{kid && <DailyQuizPage kidId={kid.id} />}</KidOnly> }

export function KidProphetsPage() {
  return (
    <KidOnly section="prophets">
      <div className="page">
        <PageHead title="قصص الأنبياء" subtitle="من آيات القرآن الكريم" />
        <div className="kids-tiles small-tiles">{PROPHETS.map((p) => <Link key={p.id} to={`/kids/lesson/prophets/prophet-${p.id}`} className="kids-tile" style={{ ['--c' as string]: '#8A6A24' }}><BookOpen size={24} /><strong>{p.name}{p.id === 'muhammad' ? ' ﷺ' : ' عليه السلام'}</strong></Link>)}</div>
      </div>
    </KidOnly>
  )
}

/** الحروف العربية الثمانية والعشرون: الشكل والاسم، والنطق بصوت الجهاز إن توفر */
export const LETTERS: [string, string][] = [['ا', 'ألف'], ['ب', 'باء'], ['ت', 'تاء'], ['ث', 'ثاء'], ['ج', 'جيم'], ['ح', 'حاء'], ['خ', 'خاء'], ['د', 'دال'], ['ذ', 'ذال'], ['ر', 'راء'], ['ز', 'زاي'], ['س', 'سين'], ['ش', 'شين'], ['ص', 'صاد'], ['ض', 'ضاد'], ['ط', 'طاء'], ['ظ', 'ظاء'], ['ع', 'عين'], ['غ', 'غين'], ['ف', 'فاء'], ['ق', 'قاف'], ['ك', 'كاف'], ['ل', 'لام'], ['م', 'ميم'], ['ن', 'نون'], ['ه', 'هاء'], ['و', 'واو'], ['ي', 'ياء']]
function say(t: string) {
  try {
    const u = new SpeechSynthesisUtterance(t); u.lang = 'ar'; u.rate = 0.8
    const v = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith('ar')); if (v) u.voice = v
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  } catch { /* لا صوت */ }
}
export function LettersBoard() {
  const [on, setOn] = useState<number | null>(null)
  return (
    <div className="page">
      <PageHead title="الحروف العربية" subtitle="اضغط على الحرف لتسمع اسمه" />
      <div className="kids-letters" dir="rtl">{LETTERS.map(([l, n], i) => <button key={l} className={'kids-letter' + (on === i ? ' on' : '')} onClick={() => { setOn(i); say(n) }} aria-label={`حرف ${n}`}><span>{l}</span><small>{n}</small></button>)}</div>
      <p className="small muted">يعتمد النطق على صوت عربي في الجهاز إن توفر.</p>
    </div>
  )
}
export function KidLettersPage() { return <KidOnly section="letters"><LettersBoard /></KidOnly> }

// ---------- إعدادات الوالدين ----------
export function ParentPanel() {
  const pinSet = useLive(() => hasPin(), ['kv:kids:pin'], false)
  const [unlocked, setUnlocked] = useState(false)
  const kids = useLive(() => loadKids(), ['kv:kids:profiles'], [])
  const [name, setName] = useState('')
  const [age, setAge] = useState<AgeGroup>('7-9')
  const [pin1, setPin1] = useState('')
  const nav = useNavigate()
  if (pinSet && !unlocked) return <div className="page"><PageHead title="إعدادات الوالدين" subtitle="محمية برمز PIN" /><PinGate onOk={() => setUnlocked(true)} /></div>
  return (
    <div className="page ac-page">
      <PageHead title="إعدادات الوالدين" subtitle="ملفات الأطفال، والمحتوى المسموح، ووقت الاستخدام، ومتابعة التقدم — على هذا الجهاز فقط" />
      <section className="card stack" style={{ gap: 8 }}>
        <h2 className="hd-h2" style={{ marginTop: 0 }}>رمز PIN للوالدين</h2>
        <p className="small muted" style={{ margin: 0 }}>{pinSet ? 'الرمز مفعّل: يُطلب للخروج من وضع الطفل ولفتح هذه الصفحة ولإضافة الوقت.' : 'لم يُضبط رمز بعد. اضبطه ليُطلب للخروج من وضع الطفل.'}</p>
        <div className="row"><input className="input" type="password" inputMode="numeric" maxLength={8} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ''))} placeholder="من 4 إلى 8 أرقام" aria-label="رمز جديد" style={{ maxWidth: 200 }} />
          <button className="btn btn-sm btn-primary" disabled={pin1.length < 4} onClick={async () => { setUnlocked(true); await setPin(pin1); setPin1(''); toast('حُفظ رمز الوالدين') }}>{pinSet ? 'تغيير الرمز' : 'حفظ الرمز'}</button></div>
      </section>
      <section className="card stack" style={{ gap: 8 }}>
        <h2 className="hd-h2" style={{ marginTop: 0 }}>إضافة طفل</h2>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الطفل" aria-label="اسم الطفل" maxLength={30} />
        <div className="chips" role="radiogroup" aria-label="الفئة العمرية">{(Object.keys(AGE_LABEL) as AgeGroup[]).map((a) => <button key={a} type="button" role="radio" aria-checked={age === a} className={'chip' + (age === a ? ' active' : '')} onClick={() => setAge(a)}>{AGE_LABEL[a]}</button>)}</div>
        <button className="btn btn-sm btn-primary" style={{ alignSelf: 'start' }} disabled={!name.trim()} onClick={async () => { await saveKid(newKid(name, age)); setName(''); toast('أُضيف ملف الطفل') }}><Plus size={14} /> إضافة</button>
      </section>
      {kids.map((k) => <KidEditor key={k.id} kid={k} onStart={async () => { await enterKidMode(k.id); nav('/kids') }} />)}
    </div>
  )
}

function KidEditor({ kid, onStart }: { kid: KidProfile; onStart: () => void }) {
  const day = dayKey()
  const used = useLive(() => usedSeconds(kid.id, day), [`kv:kids:usage:${kid.id}:${day}`], 0, [kid.id])
  const progress = useLive(() => loadProgress(kid.id), [`kv:academy:progress:${kid.id}`], null, [kid.id])
  const set = (patch: Partial<KidProfile>) => saveKid({ ...kid, ...patch })
  return (
    <section className="card stack" style={{ gap: 8 }} aria-label={`ملف ${kid.name}`}>
      <div className="spread"><h2 className="hd-h2" style={{ margin: 0 }}><UserRound size={16} /> {kid.name}</h2><small className="muted">{AGE_LABEL[kid.age]}</small></div>
      <p className="small" style={{ margin: 0 }}>التقدم: {n2(progress?.points ?? 0)} نقطة • {n2(Object.keys(progress?.lessons ?? {}).length)} درسًا • {n2(Object.keys(progress?.quizzes ?? {}).length)} اختبارًا • اليوم {n2(Math.round(used / 60))} دقيقة</p>
      <div className="small muted">المحتوى المسموح:</div>
      <div className="chips">{KID_SECTIONS.map((s) => { const on = kid.allowed.includes(s.id); return <button key={s.id} type="button" aria-pressed={on} className={'chip' + (on ? ' active' : '')} onClick={() => set({ allowed: on ? kid.allowed.filter((x) => x !== s.id) : [...kid.allowed, s.id] })}>{s.label}</button> })}</div>
      <div className="small muted">وقت الاستخدام اليومي:</div>
      <div className="chips">{[0, 15, 20, 30, 45, 60].map((m) => <button key={m} type="button" aria-pressed={kid.dailyMinutes === m} className={'chip' + (kid.dailyMinutes === m ? ' active' : '')} onClick={() => set({ dailyMinutes: m })}>{m ? `${n2(m)} دقيقة` : 'بلا حد'}</button>)}</div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" onClick={onStart}><Baby size={14} /> بدء وضع الطفل</button>
        <button className="btn btn-sm btn-ghost" onClick={async () => { await removeKid(kid.id); toast('حُذف الملف') }}><Trash2 size={14} /> حذف</button>
      </div>
    </section>
  )
}
