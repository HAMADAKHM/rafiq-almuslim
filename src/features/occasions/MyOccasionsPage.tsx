// «مناسباتي الشخصية»: عيد ميلاد وذكرى زواج ومناسبات يكتبها المستخدم، بتذكير سنوي قبلها بأيام،
// ومنشور تهنئة جاهز للمشاركة بالاسم الذي يختاره ونص يعدّله، على صور بطاقات التطبيق أو صورة من الجوال.
import { useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource/aref-ruqaa/arabic-700.css'
import '@fontsource/reem-kufi-ink/arabic-400.css'
import { Link, useSearchParams } from 'react-router-dom'
import { Cake, Heart, Sparkles, Plus, Trash2, Share2, Shuffle, Type, ImagePlus, X, Pencil, RotateCcw } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { useSettings } from '../../state/SettingsContext'
import type { OccasionType, PersonalOccasion } from '../../state/settings'
import { toast } from '../../hooks'
import { shareImage } from '../../platform'
import { canvasToBlob } from '../../services/studio'
import { CARD_PHOTOS } from '../../content/cards'
import { drawPosterText, loadPosterFonts, type PosterText } from '../../services/posterArt'
import { MAX_PERSONAL, OCCASION_TYPES, defaultPost, newOccasion, nextOccurrence, occasionTitle, postHeadline, postText, yearsAt } from '../../services/personalOccasions'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const BEFORE = [0, 1, 2, 3, 7]
const ICON: Record<OccasionType, typeof Cake> = { birthday: Cake, wedding: Heart, custom: Sparkles }
const todayParts = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() } }
const whenText = (days: number) => (days === 0 ? 'اليوم' : days === 1 ? 'غدًا' : days === 2 ? 'بعد يومين' : days <= 10 ? `بعد ${days} أيام` : `بعد ${days} يومًا`)

export function MyOccasionsPage() {
  const { settings, update } = useSettings()
  const list = settings.personalOccasions ?? []
  const [params, setParams] = useSearchParams()
  const [edit, setEdit] = useState<PersonalOccasion | null>(null)
  const postId = Number(params.get('post')) || null
  const postFor = list.find((o) => o.id === postId) ?? null

  const save = (next: PersonalOccasion[]) => update({ personalOccasions: next })
  const upsert = (o: PersonalOccasion) => save(list.some((x) => x.id === o.id) ? list.map((x) => (x.id === o.id ? o : x)) : [...list, o])
  const remove = (id: number) => save(list.filter((x) => x.id !== id))
  const openPost = (id: number | null) => { if (id) setParams({ post: String(id) }); else setParams({}) }

  const today = todayParts()
  const sorted = useMemo(() => [...list].map((o) => ({ o, n: nextOccurrence(o, today) })).sort((a, b) => a.n.days - b.n.days), [list]) // eslint-disable-line react-hooks/exhaustive-deps
  const remindersOff = !settings.notifications.enabled || !settings.location

  return (
    <>
      <PageHead title="مناسباتي الشخصية" subtitle="عيد ميلاد وذكرى زواج ومناسباتك — تذكير كل عام ومنشور تهنئة جاهز للمشاركة" />
      <div className="stack">
        {remindersOff && list.length > 0 && (
          <p className="alert alert-gold small">ليصلك التذكير فعّل <Link to="/reminders">التذكيرات</Link>{!settings.location ? ' واختر مدينتك من مواقيت الصلاة' : ''}.</p>
        )}
        {list.length === 0 && !edit && (
          <section className="card" style={{ textAlign: 'center' }}>
            <Cake size={36} />
            <p>أضف عيد ميلاد أو ذكرى زواج لمن تحب، يذكّرك التطبيق قبلها ويجهّز لك منشور التهنئة.</p>
          </section>
        )}

        {sorted.map(({ o, n }) => {
          const Icon = ICON[o.type]
          const yrs = yearsAt(o, n.date.y)
          return (
            <section key={o.id} className="card" style={{ opacity: o.on ? 1 : 0.6 }}>
              <div className="spread" style={{ alignItems: 'flex-start' }}>
                <span className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <Icon size={22} aria-hidden="true" />
                  <span>
                    <strong>{occasionTitle(o)}{o.name.trim() ? ` — ${o.name.trim()}` : ''}</strong><br />
                    <small className="muted">{n.date.d} {MONTHS[n.date.m - 1]} · {whenText(n.days)}{yrs ? (o.type === 'birthday' ? ` · يتم ${yrs} سنة` : o.type === 'wedding' ? ` · ${yrs} سنة` : '') : ''}</small>
                  </span>
                </span>
                <label className="check switch"><input type="checkbox" className="switch-input" checked={o.on} onChange={(e) => upsert({ ...o, on: e.target.checked })} aria-label="تذكير" /></label>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => openPost(o.id)}><Share2 size={14} /> منشور التهنئة</button>
                <button type="button" className="btn btn-sm" onClick={() => setEdit(o)}><Pencil size={14} /> تعديل</button>
                <button type="button" className="btn btn-sm btn-danger" style={{ marginInlineStart: 'auto' }} onClick={() => { if (confirm('حذف هذه المناسبة؟')) remove(o.id) }}><Trash2 size={14} /></button>
              </div>
            </section>
          )
        })}

        {edit ? (
          <OccasionForm key={edit.id} value={edit} isNew={!list.some((x) => x.id === edit.id)} onCancel={() => setEdit(null)} onSave={(o) => { upsert(o); setEdit(null); toast('حُفظت المناسبة') }} />
        ) : list.length < MAX_PERSONAL && (
          <button type="button" className="btn btn-primary" onClick={() => setEdit(newOccasion(list))}><Plus size={16} /> إضافة مناسبة</button>
        )}
        <p className="small muted">تبقى مناسباتك على جوالك فقط. يصل التذكير في الوقت الذي تختاره قبل المناسبة أو يومها، ويُجدَّد كل عام.</p>
      </div>
      {postFor && <PostEditor o={postFor} onChange={upsert} onClose={() => openPost(null)} />}
    </>
  )
}

function OccasionForm({ value, isNew, onSave, onCancel }: { value: PersonalOccasion; isNew: boolean; onSave: (o: PersonalOccasion) => void; onCancel: () => void }) {
  const [o, setO] = useState(value)
  const set = (p: Partial<PersonalOccasion>) => setO((x) => ({ ...x, ...p }))
  const daysIn = new Date(Date.UTC(2024, o.month, 0)).getUTCDate()
  const valid = o.type !== 'custom' || !!o.title?.trim()
  return (
    <section className="card stack" style={{ gap: '0.75rem' }} aria-label={isNew ? 'مناسبة جديدة' : 'تعديل المناسبة'}>
      <h2 style={{ margin: 0 }}>{isNew ? 'مناسبة جديدة' : 'تعديل المناسبة'}</h2>
      <div className="chips" role="radiogroup" aria-label="نوع المناسبة">
        {OCCASION_TYPES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={o.type === t.id} className={'chip' + (o.type === t.id ? ' active' : '')} onClick={() => set({ type: t.id })}>{t.name}</button>)}
      </div>
      {o.type === 'custom' && (
        <label className="field"><span>اسم المناسبة</span><input value={o.title ?? ''} maxLength={40} onChange={(e) => set({ title: e.target.value })} placeholder="مثل: تخرج، مولود جديد، ذكرى…" /></label>
      )}
      <label className="field"><span>الاسم (يظهر في المنشور)</span><input value={o.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} placeholder={o.type === 'wedding' ? 'مثل: أحمد وسارة' : 'مثل: أمي، محمد'} /></label>
      <div className="grid grid-2" style={{ gap: '0.75rem' }}>
        <label className="field"><span>اليوم</span>
          <select value={Math.min(o.day, daysIn)} onChange={(e) => set({ day: Number(e.target.value) })}>
            {Array.from({ length: daysIn }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <label className="field"><span>الشهر</span>
          <select value={o.month} onChange={(e) => set({ month: Number(e.target.value) })}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="field"><span>السنة (اختياري — لحساب {o.type === 'wedding' ? 'سنوات الزواج' : 'العمر'})</span>
          <input type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} value={o.year ?? ''} onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="field"><span>وقت التذكير</span><input type="time" value={o.time} onChange={(e) => set({ time: e.target.value || '09:00' })} /></label>
      </div>
      <div>
        <span className="small">ذكّرني</span>
        <div className="chips" role="radiogroup" aria-label="موعد التذكير">
          {BEFORE.map((b) => <button key={b} type="button" role="radio" aria-checked={o.daysBefore === b} className={'chip' + (o.daysBefore === b ? ' active' : '')} onClick={() => set({ daysBefore: b })}>{b === 0 ? 'يومها' : b === 1 ? 'قبلها بيوم' : b === 2 ? 'قبلها بيومين' : b === 7 ? 'قبلها بأسبوع' : `قبلها بـ${b} أيام`}</button>)}
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => onSave({ ...o, name: o.name.trim(), title: o.title?.trim() || undefined, day: Math.min(o.day, daysIn) })}>حفظ</button>
        <button type="button" className="btn" onClick={onCancel}>إلغاء</button>
      </div>
    </section>
  )
}

const PW = 1080, PH = 1350
const photoUrl = (id: string) => `${import.meta.env.BASE_URL}card-photos/${id}.jpg`
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}

/** يرسم المنشور: صورة الخلفية مع تعتيم خفيف، ثم العنوان والاسم بخط الرقعة أو الكوفي، فالنص والتوقيع */
async function renderPost(c: HTMLCanvasElement, photo: HTMLImageElement | null, t: PosterText) {
  c.width = PW; c.height = PH
  await loadPosterFonts(`${t.headline} ${t.sub ?? ''} ${t.source ?? ''}`)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  if (photo) {
    const k = Math.max(PW / photo.naturalWidth, PH / photo.naturalHeight)
    const w = photo.naturalWidth * k, h = photo.naturalHeight * k
    ctx.drawImage(photo, (PW - w) / 2, (PH - h) / 2, w, h)
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#0f3d3a'); g.addColorStop(1, '#07211f')
    ctx.fillStyle = g; ctx.fillRect(0, 0, PW, PH)
  }
  const g = ctx.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.5, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, PW, PH)
  drawPosterText(ctx, PW, PH, 'desert', t, 'رفيق المسلم', 0.4)
}

function PostEditor({ o, onChange, onClose }: { o: PersonalOccasion; onChange: (o: PersonalOccasion) => void; onClose: () => void }) {
  const [k, setK] = useState(o.id * 7 % CARD_PHOTOS.length)
  const [style, setStyle] = useState<'ruqaa' | 'kufi'>('ruqaa')
  const [own, setOwn] = useState<HTMLImageElement | null>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const headline = postHeadline(o)
  const text: PosterText = { headline: o.name.trim() ? `${headline}\n${o.name.trim()}` : headline, sub: postText(o), source: o.sign?.trim() || undefined, style }

  useEffect(() => {
    let alive = true
    const c = ref.current
    if (!c) return
    ;(own ? Promise.resolve(own) : loadImg(photoUrl(CARD_PHOTOS[k % CARD_PHOTOS.length])).catch(() => null)).then((img) => { if (alive) void renderPost(c, img, text) })
    return () => { alive = false }
  }, [k, style, own, text.headline, text.sub, text.source]) // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    const blob = await canvasToBlob(ref.current!, 'image/jpeg')
    const r = await shareImage(blob, `rafiq-occasion-${o.id}.jpg`, headline)
    toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظت الصورة' : 'تعذرت المشاركة')
  }
  const set = (p: Partial<PersonalOccasion>) => onChange({ ...o, ...p })

  return (
    <div className="card-viewer occ-post" role="dialog" aria-label="منشور التهنئة">
      <button className="icon-btn card-viewer-close" onClick={onClose} aria-label="إغلاق"><X size={22} /></button>
      <canvas ref={ref} className="poster-viewer-canvas" />
      <input ref={input} type="file" accept="image/*" hidden aria-label="صورة من الجوال" onChange={(e) => {
        const f = e.target.files?.[0]; if (!f) return
        const img = new Image(); img.onload = () => setOwn(img); img.src = URL.createObjectURL(f); e.target.value = ''
      }} />
      <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        <button className="btn btn-primary" onClick={share}><Share2 size={16} /> مشاركة</button>
        <button className="btn" onClick={() => { setOwn(null); setK(k + 1) }}><Shuffle size={16} /> خلفية أخرى</button>
        <button className="btn" onClick={() => setStyle(style === 'ruqaa' ? 'kufi' : 'ruqaa')}><Type size={16} /> خط آخر</button>
        <button className="btn" onClick={() => input.current?.click()}><ImagePlus size={16} /> صورتي</button>
      </div>
      <div className="card stack" style={{ gap: '0.6rem', width: 'min(560px, 100%)', margin: '0 auto' }}>
        <label className="field"><span>الاسم</span><input value={o.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} /></label>
        <label className="field"><span>العنوان</span><input value={o.headline ?? ''} maxLength={40} placeholder={headline} onChange={(e) => set({ headline: e.target.value })} /></label>
        <label className="field"><span>نص المنشور</span><textarea rows={3} maxLength={220} value={o.post ?? defaultPost(o)} onChange={(e) => set({ post: e.target.value })} /></label>
        <label className="field"><span>التوقيع (اختياري)</span><input value={o.sign ?? ''} maxLength={40} placeholder="مثل: مع محبة — عائلتك" onChange={(e) => set({ sign: e.target.value })} /></label>
        <button type="button" className="btn btn-sm" onClick={() => set({ headline: undefined, post: undefined, sign: undefined })}><RotateCcw size={14} /> النص الافتراضي</button>
      </div>
    </div>
  )
}
