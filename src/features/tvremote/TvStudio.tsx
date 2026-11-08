// «استوديو الشاشة» في الجوال (لتلفاز بنسخة بريميوم): معاينة حية للتصميم، وأحجام العناصر وأماكنها والخط والألوان،
// ولقطة حقيقية من شاشة التلفاز، وتصاميم محفوظة تُطبَّق على تلفاز واحد أو على كل التلفزيونات المرتبطة.
// ومسح رمز QR الظاهر على التلفاز للربط دون كتابة الرمز.
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, Image as ImageIcon, Layers, MonitorPlay, Save, Trash2, X } from 'lucide-react'
import { toast } from '../../hooks'
import { ACCENTS, DEFAULT_STUDIO, FONTS, fontCss, normalizeStudio, parsePairLink, SCALES, TEXTS, type StudioSettings } from '../../tv/studio'
import { SCENES } from '../../tv/scenes'
import { GALLERY_CATS } from '../../tv/gallery'
import { getTvScreen, loadTvs, setTvSettings, TvRemoteError, type PairedTv, type Transport, type TvSettingsView } from '../../services/tvRemote'
import { designPatch, loadDesigns, MAX_DESIGNS, removeDesign, saveDesign, type TvDesign } from '../../services/tvDesigns'

const SAMPLE = [['الفجر', '4:38'], ['الشروق', '6:02'], ['الظهر', '11:24'], ['العصر', '2:21'], ['المغرب', '4:43'], ['العشاء', '6:02']]

function sceneName(v: Pick<TvSettingsView, 'scene' | 'galleryCat'>): string {
  if (v.scene === 'gallery') return `صور جاهزة: ${GALLERY_CATS.find((c) => c.id === (v.galleryCat ?? 'all'))?.label ?? ''}`
  if (v.scene === 'rotate') return 'تنقل بين المشاهد'
  if (v.scene === 'photos') return 'صوري'
  if (v.scene === 'classic') return 'الرسم الأصلي'
  return SCENES.find((x) => x.id === v.scene)?.name ?? ''
}

/** معاينة تقريبية لشاشة التلفاز بنسبة 16:9، تتغير فورًا مع كل اختيار قبل إرساله */
export function TvMiniPreview({ studio, view }: { studio: StudioSettings; view: Pick<TvSettingsView, 'scene' | 'galleryCat' | 'city'> }) {
  const s = normalizeStudio(studio)
  const prayers = (
    <div className="tvp-prayers" style={{ fontSize: `${s.prayersScale}%` }}>
      {SAMPLE.map(([n, t], i) => <div key={n} className={'tvp-prayer' + (i === 3 ? ' next' : '')} style={i === 3 ? { borderColor: s.accent } : undefined}><span>{n}</span><b>{t}</b></div>)}
    </div>
  )
  return (
    <div className="tvp" role="img" aria-label="معاينة شاشة التلفاز" data-font={s.font} style={{ color: s.text, ['--tvp-font' as string]: fontCss(s.font) }}>
      <div className="tvp-top"><b>رفيق المسلم</b><small>{view.city || 'المدينة'}</small><span className="tvp-scene">{sceneName(view)}</span></div>
      {s.prayersPos === 'top' && prayers}
      <div className="tvp-main" style={{ flexDirection: s.clockSide === 'left' ? 'row-reverse' : 'row' }}>
        <div className="tvp-clock-col" style={{ fontSize: `${s.clockScale}%`, flex: s.showCard ? '0 0 40%' : '1' }}>
          <div className="tvp-clock">2:05:41</div>
          <div className="tvp-next"><small>الصلاة القادمة</small><b>العصر</b><span style={{ color: s.accent }}>2:21 م</span></div>
        </div>
        {s.showCard && <div className="tvp-card" style={{ fontSize: `${s.cardScale}%` }}><small style={{ color: s.accent }}>آية اليوم</small><p>هنا تظهر آية اليوم أو الذكر أو التلاوة الجارية</p></div>}
      </div>
      {s.prayersPos === 'bottom' && prayers}
    </div>
  )
}

function Chips<T extends string | number>({ value, options, onPick, label, disabled }: { value: T; options: { id: T; label: string }[]; onPick: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => <button key={String(o.id)} type="button" role="radio" aria-checked={value === o.id} disabled={disabled} className={'chip' + (value === o.id ? ' active' : '')} onClick={() => onPick(o.id)}>{o.label}</button>)}
    </div>
  )
}

const SCALE_OPTS = SCALES.map((x) => ({ id: x as number, label: `${x}٪` }))

/** استوديو الشاشة لتلفاز مرتبط (بريميوم) */
export function TvStudio({ send, tv, st, set, busy }: { send: Transport; tv: PairedTv; st: TvSettingsView; set: (p: Partial<TvSettingsView>) => Promise<void>; busy: boolean }) {
  const [draft, setDraft] = useState<StudioSettings>(() => normalizeStudio(st.studio))
  useEffect(() => { setDraft(normalizeStudio(st.studio)) }, [st.studio])
  const change = (p: Partial<StudioSettings>) => { const next = { ...draft, ...p }; setDraft(next); void set({ studio: next }) }
  const [shot, setShot] = useState<string | null>(null)
  const [shooting, setShooting] = useState(false)
  const snap = async () => {
    setShooting(true)
    try { const j = await getTvScreen(send, tv); setShot(j ? `data:image/jpeg;base64,${j}` : null) } catch (e) { toast(e instanceof TvRemoteError ? e.message : 'تعذرت المعاينة') }
    setShooting(false)
  }
  return (
    <section className="card stack" style={{ gap: 12 }} aria-label="استوديو الشاشة">
      <h2 style={{ margin: 0 }}><Layers size={18} /> استوديو الشاشة</h2>
      <p className="small muted" style={{ margin: 0 }}>كل تغيير يظهر في المعاينة ويُرسل إلى التلفاز فورًا. المعاينة تقريبية؛ اضغط «لقطة من التلفاز» لترى الشاشة الحقيقية.</p>
      <TvMiniPreview studio={draft} view={st} />
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" onClick={snap} disabled={shooting}><MonitorPlay size={14} /> {shooting ? 'جارٍ الالتقاط…' : 'لقطة من التلفاز'}</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => change(DEFAULT_STUDIO)} disabled={busy}>التصميم الأصلي</button>
      </div>
      {shot && <figure className="tvp-shot"><img src={shot} alt="لقطة من شاشة التلفاز الآن" /><button type="button" className="btn btn-sm btn-ghost" onClick={() => setShot(null)} aria-label="إغلاق اللقطة"><X size={14} /></button></figure>}
      <h3>الأحجام</h3>
      <div className="small muted">الساعة والصلاة القادمة</div>
      <Chips label="حجم الساعة" value={draft.clockScale} disabled={busy} onPick={(v) => change({ clockScale: v })} options={SCALE_OPTS} />
      <div className="small muted">شريط المواقيت</div>
      <Chips label="حجم المواقيت" value={draft.prayersScale} disabled={busy} onPick={(v) => change({ prayersScale: v })} options={SCALE_OPTS} />
      <div className="small muted">نص البطاقة (الآية والذكر)</div>
      <Chips label="حجم البطاقة" value={draft.cardScale} disabled={busy} onPick={(v) => change({ cardScale: v })} options={SCALE_OPTS} />
      <h3>الأماكن</h3>
      <Chips label="مكان الساعة" value={draft.clockSide} disabled={busy} onPick={(v) => change({ clockSide: v })} options={[{ id: 'right', label: 'الساعة يمينًا' }, { id: 'left', label: 'الساعة يسارًا' }]} />
      <Chips label="مكان المواقيت" value={draft.prayersPos} disabled={busy} onPick={(v) => change({ prayersPos: v })} options={[{ id: 'bottom', label: 'المواقيت أسفل' }, { id: 'top', label: 'المواقيت أعلى' }, { id: 'hidden', label: 'إخفاء المواقيت' }]} />
      <Chips label="البطاقة" value={draft.showCard ? 'on' : 'off'} disabled={busy} onPick={(v) => change({ showCard: v === 'on' })} options={[{ id: 'on', label: 'إظهار البطاقة' }, { id: 'off', label: 'الساعة وحدها' }]} />
      <h3>الخط والألوان</h3>
      <Chips label="الخط" value={draft.font} disabled={busy} onPick={(v) => change({ font: v })} options={FONTS.map((f) => ({ id: f.id, label: f.label }))} />
      <div className="small muted">اللون المميز</div>
      <div className="tvp-swatches" role="radiogroup" aria-label="اللون المميز">
        {ACCENTS.map((a) => <button key={a.id} type="button" role="radio" aria-checked={draft.accent === a.id} aria-label={a.label} title={a.label} disabled={busy} className={'tvp-swatch' + (draft.accent === a.id ? ' on' : '')} style={{ background: a.id }} onClick={() => change({ accent: a.id })} />)}
      </div>
      <div className="small muted">لون الكتابة</div>
      <div className="tvp-swatches" role="radiogroup" aria-label="لون الكتابة">
        {TEXTS.map((a) => <button key={a.id} type="button" role="radio" aria-checked={draft.text === a.id} aria-label={a.label} title={a.label} disabled={busy} className={'tvp-swatch' + (draft.text === a.id ? ' on' : '')} style={{ background: a.id }} onClick={() => change({ text: a.id })} />)}
      </div>
      <Designs send={send} tv={tv} current={{ studio: draft, scene: st.scene, galleryCat: st.galleryCat }} apply={set} />
    </section>
  )
}

/** التصاميم المحفوظة في الجوال: حفظ التصميم الحالي باسم، وتطبيقه على هذا التلفاز أو على كل التلفزيونات */
export function Designs({ send, tv, current, apply }: { send: Transport; tv: PairedTv; current: Pick<TvSettingsView, 'studio' | 'scene' | 'galleryCat'>; apply: (p: Partial<TvSettingsView>) => Promise<void> }) {
  const [list, setList] = useState<TvDesign[]>([])
  const [name, setName] = useState('')
  useEffect(() => { loadDesigns().then(setList) }, [])
  const save = async () => {
    if (!name.trim()) { toast('اكتب اسمًا للتصميم'); return }
    setList(await saveDesign(name, current)); setName(''); toast('حُفظ التصميم')
  }
  const applyAll = async (d: TvDesign) => {
    const tvs = await loadTvs()
    let ok = 0
    for (const t of tvs) {
      try { if (t.tvId === tv.tvId) await apply(designPatch(d)); else await setTvSettings(send, t, designPatch(d)); ok++ } catch { /* تلفاز غير متصل */ }
    }
    toast(`طُبّق «${d.name}» على ${ok} من ${tvs.length} ${tvs.length > 2 ? 'تلفزيونات' : 'تلفاز'}`)
  }
  return (
    <>
      <h3><Save size={16} /> تصاميمي</h3>
      <div className="row">
        <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="اسم التصميم، مثل: رمضان" aria-label="اسم التصميم" />
        <button type="button" className="btn btn-sm btn-primary" onClick={save} disabled={list.length >= MAX_DESIGNS && !list.some((x) => x.name === name.trim())}>حفظ</button>
      </div>
      {list.length === 0 ? <p className="small muted" style={{ margin: 0 }}>لا تصاميم محفوظة بعد. احفظ التصميم الحالي لتعود إليه أو تطبّقه على تلفاز آخر.</p> : (
        <ul className="plain stack" style={{ gap: 6 }} aria-label="التصاميم المحفوظة">
          {list.map((d) => (
            <li key={d.id} className="tvp-design">
              <div><strong>{d.name}</strong><small className="muted">{sceneName(d)} • ساعة {d.studio.clockScale}٪ • {FONTS.find((f) => f.id === d.studio.font)?.label}</small></div>
              <div className="row" style={{ gap: 4 }}>
                <button type="button" className="btn btn-sm" onClick={() => void apply(designPatch(d)).then(() => toast(`طُبّق «${d.name}»`))}>تطبيق</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => void applyAll(d)}>على كل التلفزيونات</button>
                <button type="button" className="btn btn-sm btn-ghost" aria-label={`حذف ${d.name}`} onClick={async () => setList(await removeDesign(d.id))}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** قراءة رمز QR من صورة (بكسلات) */
export function readQr(data: Uint8ClampedArray, w: number, h: number) {
  const r = jsQR(data, w, h)
  return r ? parsePairLink(r.data) : null
}

function pixels(src: CanvasImageSource, w: number, h: number) {
  const scale = Math.min(1, 1000 / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * scale); c.height = Math.round(h * scale)
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(src, 0, 0, c.width, c.height)
  return g.getImageData(0, 0, c.width, c.height)
}

/** مسح رمز QR الظاهر على التلفاز: بالكاميرا، أو من صورة للرمز */
export function QrPair({ onFound }: { onFound: (p: { host: string; port: number; code: string }) => void }) {
  const [live, setLive] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!live) return
    let stream: MediaStream | null = null, raf = 0, stop = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        const v = video.current!
        v.srcObject = stream
        await v.play()
        const tick = () => {
          if (stop) return
          if (v.videoWidth) {
            const img = pixels(v, v.videoWidth, v.videoHeight)
            const hit = readQr(img.data, img.width, img.height)
            if (hit) { setLive(false); onFound(hit); return }
          }
          raf = window.setTimeout(tick, 250)
        }
        tick()
      } catch {
        toast('تعذر فتح الكاميرا. اسمح للتطبيق باستخدامها، أو صوّر الرمز واختر الصورة.')
        setLive(false)
      }
    })()
    return () => { stop = true; clearTimeout(raf); stream?.getTracks().forEach((t) => t.stop()) }
  }, [live]) // eslint-disable-line react-hooks/exhaustive-deps
  const fromFile = async (f: File) => {
    try {
      const bmp = await createImageBitmap(f)
      const img = pixels(bmp, bmp.width, bmp.height)
      const hit = readQr(img.data, img.width, img.height)
      if (hit) onFound(hit); else toast('لم يُعثر على رمز ربط صالح في الصورة')
    } catch { toast('تعذرت قراءة الصورة') }
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setLive((x) => !x)}><Camera size={14} /> {live ? 'إيقاف الكاميرا' : 'مسح رمز QR'}</button>
        <label className="btn btn-sm"><ImageIcon size={14} /> من صورة<input type="file" accept="image/*" hidden aria-label="صورة رمز QR" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = '' }} /></label>
      </div>
      {live && <video ref={video} className="tvp-camera" playsInline muted aria-label="الكاميرا: وجّهها إلى رمز QR على التلفاز" />}
      <p className="small muted" style={{ margin: 0 }}>في التلفاز: الإعدادات ← 📱 التحكم من الجوال ← «ربط جوال جديد»، ثم امسح الرمز الظاهر بجانب الأرقام (نسخة بريميوم). يُربط الجوال مباشرة دون كتابة الرمز.</p>
    </div>
  )
}
