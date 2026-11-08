// صفحات إعدادات «رفيق المسلم TV بريميوم» (تظهر في نسخة بريميوم فقط): جداول العرض، وحماية الشاشة،
// وإضافات التلاوة. كلها بأزرار كبيرة تناسب جهاز التحكم، وتُحفظ مع إعدادات الشاشة.
import { GALLERY_CATS, type GalleryCat } from './gallery'
import { SCENES } from './scenes'
import { Choices, Stepper, Toggle } from './controls'
import { reciterById } from '../content/reciters'
import { TV_RECITERS } from './recite'
import type { TvSettings } from './state'
import {
  describeWhen, DAY_NAMES, normalizePremium, OCCASIONS, orderReciters, RULE_PRESETS, SPEEDS,
  type PremiumSettings, type ScenePick, type ScheduleRule, type ScheduleWhen, type SceneChoice, type TvPrayerName,
} from './premium'

type Props = { draft: TvSettings; set: (p: Partial<TvSettings>) => void }
function usePremium({ draft, set }: Props) {
  const p = normalizePremium(draft.premium)
  const setP = (patch: Partial<PremiumSettings>) => set({ premium: { ...p, ...patch } })
  return [p, setP] as const
}

/** خيارات المشهد للجداول: المشاهد الحالية كلها، والصور الجاهزة بتصنيفاتها، وصور الجوال */
const SCENE_OPTIONS: { id: string; label: string }[] = [
  { id: 'rotate|all', label: 'تنقل بين المشاهد' },
  { id: 'classic|all', label: 'الرسم الأصلي' },
  { id: 'photos|all', label: 'صوري من الجوال' },
  ...GALLERY_CATS.map((c) => ({ id: `gallery|${c.id}`, label: `صور جاهزة: ${c.label}` })),
  ...SCENES.map((x) => ({ id: `${x.id}|all`, label: x.name })),
]
const choiceId = (c: SceneChoice) => `${c.scene}|${c.scene === 'gallery' ? c.galleryCat : 'all'}`
const fromId = (id: string): SceneChoice => { const [scene, cat] = id.split('|'); return { scene: scene as ScenePick, galleryCat: (cat || 'all') as GalleryCat } }
export const sceneLabel = (c: SceneChoice) => SCENE_OPTIONS.find((o) => o.id === choiceId(c))?.label ?? ''

const PRAYER_OPTS: { id: TvPrayerName | 'all'; label: string }[] = [
  { id: 'all', label: 'كل صلاة' }, { id: 'fajr', label: 'الفجر' }, { id: 'dhuhr', label: 'الظهر' }, { id: 'asr', label: 'العصر' }, { id: 'maghrib', label: 'المغرب' }, { id: 'isha', label: 'العشاء' },
]
const MINUTES = [0, 5, 10, 15, 20, 30, 45, 60].map((m) => ({ id: m, label: `${m} د` }))

function RuleEditor({ r, onChange, onDelete }: { r: ScheduleRule; onChange: (r: ScheduleRule) => void; onDelete: () => void }) {
  const w = r.when
  const setWhen = (x: ScheduleWhen) => onChange({ ...r, when: x })
  return (
    <div className="tv-rule">
      <div className="tv-rule-head">
        <b>{describeWhen(w)}</b>
        <span className="tv-muted">← {sceneLabel(r.show)}</span>
      </div>
      <Toggle on={r.on} onChange={(on) => onChange({ ...r, on })} label="تشغيل هذا الجدول" />
      {w.kind === 'hours' && (
        <div className="tv-steppers">
          <Stepper label="من الساعة" min={0} max={23} value={w.from} onChange={(v) => setWhen({ ...w, from: v })} />
          <Stepper label="إلى الساعة" min={0} max={23} value={w.to} onChange={(v) => setWhen({ ...w, to: v })} />
        </div>
      )}
      {w.kind === 'prayer' && (
        <>
          <Choices label="الصلاة" cols={6} value={w.prayer} onChange={(v) => setWhen({ ...w, prayer: v })} options={PRAYER_OPTS} />
          <p className="tv-muted">قبل الأذان</p>
          <Choices label="قبل الأذان" cols={8} value={w.before} onChange={(v) => setWhen({ ...w, before: v })} options={MINUTES} />
          <p className="tv-muted">بعد الأذان</p>
          <Choices label="بعد الأذان" cols={8} value={w.after} onChange={(v) => setWhen({ ...w, after: v })} options={MINUTES} />
        </>
      )}
      {w.kind === 'weekday' && (
        <div className="tv-choices" role="group" aria-label="أيام الأسبوع" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {DAY_NAMES.map((n, i) => {
            const on = w.days.includes(i)
            return <button key={n} role="checkbox" aria-checked={on} className={'tv-choice' + (on ? ' on' : '')} onClick={() => setWhen({ ...w, days: on ? w.days.filter((d) => d !== i) : [...w.days, i] })}>{on ? '✓ ' : ''}{n}</button>
          })}
        </div>
      )}
      {w.kind === 'occasion' && <Choices label="المناسبة" cols={4} value={w.occ} onChange={(v) => setWhen({ ...w, occ: v })} options={OCCASIONS} />}
      <p className="tv-muted">ما يُعرض</p>
      <Choices label="ما يُعرض" cols={4} value={choiceId(r.show)} onChange={(v) => onChange({ ...r, show: fromId(v) })} options={SCENE_OPTIONS} />
      <button className="tv-choice danger" onClick={onDelete}>حذف هذا الجدول</button>
    </div>
  )
}

/** جداول العرض الذكية: مشهد لكل وقت أو صلاة أو يوم أو مناسبة، وانتقال ناعم */
export function SmartDisplayPage(props: Props) {
  const [p, setP] = usePremium(props)
  const rules = p.schedule.rules
  const setRules = (next: ScheduleRule[]) => setP({ schedule: { ...p.schedule, rules: next } })
  return (
    <>
      <h2>جداول العرض الذكية</h2>
      <p className="tv-muted">اختر ما يظهر على الشاشة بحسب الساعة، أو حول أوقات الصلاة، أو الليل، أو أيام الأسبوع، أو المناسبات الإسلامية. إن انطبق أكثر من جدول يُقدَّم الأخص: المناسبة ثم الصلاة ثم الليل ثم الأيام ثم الساعات. وفي غير أوقات الجداول يبقى المشهد المختار في «المشاهد».</p>
      <Toggle on={p.schedule.on} onChange={(on) => setP({ schedule: { ...p.schedule, on } })} label="تشغيل جداول العرض" />
      <h2>الانتقال بين المشاهد</h2>
      <Choices label="نوع الانتقال" cols={3} value={p.transition.style} onChange={(style) => setP({ transition: { ...p.transition, style } })} options={[{ id: 'fade', label: 'تلاشٍ ناعم' }, { id: 'zoom', label: 'تلاشٍ مع اقتراب' }, { id: 'none', label: 'بلا انتقال' }]} />
      {p.transition.style !== 'none' && <Choices label="مدة الانتقال" cols={5} value={p.transition.seconds} onChange={(seconds) => setP({ transition: { ...p.transition, seconds } })} options={[1, 2, 3, 5, 8].map((x) => ({ id: x, label: `${x} ث` }))} />}
      <h2>الجداول ({rules.length})</h2>
      {rules.length === 0 && <p className="tv-muted">لا جداول بعد. أضف جدولًا جاهزًا ثم عدّله.</p>}
      {rules.map((r, i) => <RuleEditor key={r.id} r={r} onChange={(x) => setRules(rules.map((y, k) => (k === i ? x : y)))} onDelete={() => setRules(rules.filter((_, k) => k !== i))} />)}
      {rules.length < 20 && (
        <>
          <h2>إضافة جدول</h2>
          <div className="tv-choices" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {RULE_PRESETS.map((pr) => <button key={pr.label} className="tv-choice" onClick={() => setP({ schedule: { on: true, rules: [...rules, { id: `r${Date.now().toString(36)}${rules.length}`, on: true, when: pr.when, show: pr.show }] } })}>+ {pr.label}</button>)}
          </div>
        </>
      )}
    </>
  )
}

/** حماية الشاشة (OLED) والوضع الاقتصادي */
export function OledPage(props: Props) {
  const [p, setP] = usePremium(props)
  const o = p.oled
  const setO = (x: Partial<PremiumSettings['oled']>) => setP({ oled: { ...o, ...x } })
  return (
    <>
      <h2>حماية الشاشة</h2>
      <p className="tv-muted">شاشات OLED وبعض شاشات LED قد يبقى فيها أثر للعناصر الثابتة الساطعة إن بقيت في مكانها ساعات طويلة. هذه الخيارات تحرك العناصر وتخفف الإضاءة دون أن تلاحظ ذلك أثناء المشاهدة.</p>
      <Toggle on={o.shift} onChange={(shift) => setO({ shift })} label="إزاحة العناصر قليلًا كل دقيقتين (Pixel Shifting)" />
      <Toggle on={o.swap} onChange={(swap) => setO({ swap })} label="تبديل مكان الساعة والبطاقة كل ساعة" />
      <Toggle on={o.dim} onChange={(dim) => setO({ dim })} label="تخفيض الإضاءة ليلًا (بعد العشاء حتى قبيل الفجر)" />
      {o.dim && <Choices label="درجة التخفيض" cols={4} value={o.dimLevel} onChange={(dimLevel) => setO({ dimLevel })} options={[{ id: 0.2, label: 'خفيف' }, { id: 0.35, label: 'متوسط' }, { id: 0.5, label: 'قوي' }, { id: 0.65, label: 'أقوى' }]} />}
      <h2>الوضع الاقتصادي</h2>
      <Toggle on={o.eco} onChange={(eco) => setO({ eco })} label="وضع اقتصادي للشاشات والأجهزة الضعيفة" />
      <p className="tv-muted">يوقف الحركة في الخلفية ويخفض جودة الرسم، فيقل استهلاك المعالج والذاكرة وتبقى المواقيت والأذان كما هي.</p>
    </>
  )
}

/** القراء المفضلون (يظهرون أولًا) وسرعة التلاوة — ضمن صفحة «القارئ والصوت» */
export function ReciterExtras(props: Props) {
  const [p, setP] = usePremium(props)
  const q = p.quran
  return (
    <>
      <h2>القراء المفضلون</h2>
      <p className="tv-muted">اضغط على القارئ ليصير مفضلًا (★)، فيظهر أول القائمة. لا يُحذف أي قارئ.</p>
      <div className="tv-choices" role="group" aria-label="القراء المفضلون" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {orderReciters(TV_RECITERS, q.fav).map((id) => {
          const on = q.fav.includes(id)
          return <button key={id} role="checkbox" aria-checked={on} className={'tv-choice' + (on ? ' on' : '')} onClick={() => setP({ quran: { ...q, fav: on ? q.fav.filter((x) => x !== id) : [...q.fav, id] } })}>{on ? '★ ' : '☆ '}{reciterById(id).name}</button>
        })}
      </div>
      <h2>سرعة التلاوة</h2>
      <Choices label="سرعة التلاوة" cols={4} value={q.speed} onChange={(speed) => setP({ quran: { ...q, speed } })} options={SPEEDS.map((x) => ({ id: x, label: x === 1 ? 'عادية' : `×${x}` }))} />
      <p className="tv-muted">تعمل مع ملفات التلاوة المباشرة (EveryAyah وIslamic Network) في متصفح التلفاز؛ إن لم يدعمها جهازك تبقى السرعة العادية.</p>
    </>
  )
}

/** قائمة تشغيل السور — ضمن صفحة «القراءة» في التلاوة المتواصلة */
export function PlaylistExtras(props: Props & { surahs: { name: string }[]; quick: number[] }) {
  const [p, setP] = usePremium(props)
  const q = p.quran
  const setList = (playlist: number[]) => setP({ quran: { ...q, playlist } })
  const name = (n: number) => props.surahs[n - 1]?.name ?? String(n)
  return (
    <>
      <h2>قائمة تشغيل السور ({q.playlist.length})</h2>
      <p className="tv-muted">إن أضفت سورًا تُتلى بالترتيب ثم تعود لأولها، ويُحفظ الموضع كما هو. دون قائمة تستمر التلاوة إلى السورة التالية.</p>
      {q.playlist.length > 0 && (
        <div className="tv-choices" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {q.playlist.map((n, i) => <button key={`${n}-${i}`} className="tv-choice on" aria-label={`إزالة سورة ${name(n)} من القائمة`} onClick={() => setList(q.playlist.filter((_, k) => k !== i))}>✕ {i + 1}. {name(n)}</button>)}
        </div>
      )}
      <div className="tv-choices" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <button className="tv-choice" onClick={() => !q.playlist.includes(props.draft.reciteSurah) && setList([...q.playlist, props.draft.reciteSurah])}>+ سورة {name(props.draft.reciteSurah)}</button>
        {props.quick.filter((n) => !q.playlist.includes(n)).map((n) => <button key={n} className="tv-choice" onClick={() => setList([...q.playlist, n])}>+ {name(n)}</button>)}
        {q.playlist.length > 0 && <button className="tv-choice danger" onClick={() => setList([])}>مسح القائمة</button>}
      </div>
    </>
  )
}
