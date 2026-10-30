// «بطاقات للمشاركة»: بطاقات اليوم (تتجدد كل يوم من المكتبة الموثقة)، وبطاقات رمضان والعيد والجمعة.
// كل بطاقة صورة جاهزة تُشارك على وسائل التواصل، مع تغيير الخلفية بلمسة. النصوص كما هي بمصادرها.
import { useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource/aref-ruqaa/arabic-700.css'
import '@fontsource/reem-kufi-ink/arabic-400.css'
import { Link } from 'react-router-dom'
import { Share2, Shuffle, Palette, X, ImagePlus, Type } from 'lucide-react'
import { PageHead, Spinner, Tabs } from '../../components/Common'
import { toast, useQuran } from '../../hooks'
import { shareImage } from '../../platform'
import { canvasToBlob, drawStudioFrame, loadStudioFonts, versesText, type StudioBg, type StudioStyle, type TextFont } from '../../services/studio'
import { EID_CARDS, FRIDAY_CARDS, POSTER_CARDS, RAMADAN_CARDS, type PosterCard, type ShareCard } from '../../content/cards'
import { POSTER_SCENES, crescentShape, drawPosterScene, drawPosterText, loadPosterFonts, type PosterScene, type PosterText } from '../../services/posterArt'
import { HADITH } from '../../content/hadith'
import { DUAS } from '../../content/duas'
import { ayahOfDay, dayIndex, dhikrOfDay } from '../../services/daily'
import { ramadanStatus } from '../../services/ramadan'
import { dayKey } from '../../lib/dates'
import { useSettings } from '../../state/SettingsContext'
import { usePlus } from '../../billing/PlusContext'

type Tab = 'today' | 'ramadan' | 'eid' | 'friday'
const BGS: Record<Tab, StudioBg[]> = {
  today: ['emerald', 'night', 'parchment', 'theme-dawn', 'gold', 'ivory', 'theme-garden'],
  ramadan: ['night', 'theme-stars', 'gold', 'emerald', 'parchment'],
  eid: ['gold', 'theme-dawn', 'emerald', 'ivory'],
  friday: ['emerald', 'parchment', 'night', 'theme-garden'],
}
const PLUS_BGS: StudioBg[] = ['plus-midnight', 'plus-sapphire', 'plus-rose', 'plus-marble', 'plus-sand', 'plus-olive']

/** بطاقات اليوم: آية اليوم وذكره وحديث ودعاء — تتغير كل يوم، ومعها بطاقة الجمعة يوم الجمعة وبطاقة رمضان في رمضان */
export function todayCards(day: string, weekday: number, inRamadan: boolean): ShareCard[] {
  const i = dayIndex(day)
  const a = ayahOfDay(day)
  const d = dhikrOfDay(day)
  const flat = (cats: typeof HADITH) => cats.flatMap((c) => c.items.filter((x) => x.text).map((x) => ({ x, c })))
  const hs = flat(HADITH), ds = flat(DUAS)
  const h = hs[(i * 13) % hs.length], du = ds[(i * 11) % ds.length]
  const out: ShareCard[] = [
    { id: `t-ayah-${day}`, title: 'آية اليوم', quran: { surah: a.surah, from: a.ayah, to: a.ayah }, source: '', kind: 'quran' },
    ...(d.item.text ? [{ id: `t-dhikr-${day}`, title: 'ذكر اليوم', text: d.item.text, source: d.item.source, kind: 'dua' as const }] : []),
    { id: `t-hadith-${day}`, title: 'حديث اليوم', text: h.x.text, source: h.x.source, kind: 'hadith' },
    { id: `t-dua-${day}`, title: 'دعاء اليوم', text: du.x.text, source: du.x.source, kind: 'dua' },
  ]
  if (weekday === 5) out.unshift(FRIDAY_CARDS[i % FRIDAY_CARDS.length])
  if (inRamadan) out.unshift(RAMADAN_CARDS[i % RAMADAN_CARDS.length])
  return out
}

/** يرسم البطاقة على لوحة 1080×1080 (مع فوانيس وهلال لبطاقات رمضان) */
async function renderCard(c: HTMLCanvasElement, card: ShareCard, text: string, reference: string, bg: StudioBg, ramadan: boolean) {
  const W = 1080
  c.width = W; c.height = W
  const font: TextFont = card.kind === 'quran' ? 'quran' : 'naskh'
  const style: StudioStyle = { format: 'square', bg, textScale: card.kind === 'greeting' ? 1.25 : 1, showRef: !!reference, showBrand: true, note: card.title, font }
  await loadStudioFonts(text, reference, card.title)
  const ctx = c.getContext('2d')!
  drawStudioFrame(ctx, W, W, { style, text, reference, font })
  if (ramadan) {
    ctx.save()
    ctx.fillStyle = '#f3d58c'
    ctx.globalAlpha = 0.9
    // هلال (طبقة مستقلة حتى لا يمحو الخلفية)
    crescentShape(ctx, W - 120, 120, 34, '#f3d58c')
    // فانوسان معلّقان
    for (const [x, len] of [[110, 70], [190, 40]]) {
      ctx.strokeStyle = '#f3d58c'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, len); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x - 16, len + 8); ctx.lineTo(x + 16, len + 8); ctx.lineTo(x + 21, len + 34); ctx.lineTo(x + 11, len + 56); ctx.lineTo(x - 11, len + 56); ctx.lineTo(x - 21, len + 34); ctx.closePath(); ctx.fill()
      ctx.fillRect(x - 9, len, 18, 8)
    }
    ctx.restore()
  }
}

function useCardText(card: ShareCard) {
  const { data } = useQuran()
  if (!card.quran) return { text: card.text ?? '', reference: card.source === 'تهنئة' ? '' : card.source }
  if (!data) return null
  const { surah, from, to } = card.quran
  const verses = Array.from({ length: to - from + 1 }, (_, k) => ({ surah, ayah: from + k, text: data.verses[surah - 1][from + k - 1] }))
  const name = data.meta.surahs[surah - 1].name
  return { text: versesText(verses), reference: card.source || `سورة ${name}: ${from}${to > from ? `–${to}` : ''}` }
}

function CardThumb({ card, bg, ramadan, onOpen }: { card: ShareCard; bg: StudioBg; ramadan: boolean; onOpen: () => void }) {
  const t = useCardText(card)
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!t) return
    let alive = true
    const c = document.createElement('canvas')
    renderCard(c, card, t.text, t.reference, bg, ramadan).then(() => { if (alive) setUrl(c.toDataURL('image/jpeg', 0.82)) })
    return () => { alive = false }
  }, [t?.text, t?.reference, bg, ramadan, card]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button type="button" className="share-card" onClick={onOpen} aria-label={`بطاقة: ${card.title}`}>
      {url ? <img src={url} alt="" /> : <span className="share-card-ph"><Spinner label="" /></span>}
      <span className="share-card-title">{card.title}</span>
    </button>
  )
}

function CardViewer({ card, bgs, ramadan, onClose }: { card: ShareCard; bgs: StudioBg[]; ramadan: boolean; onClose: () => void }) {
  const t = useCardText(card)
  const [k, setK] = useState(0)
  const ref = useRef<HTMLCanvasElement>(null)
  const bg = bgs[k % bgs.length]
  useEffect(() => { if (t && ref.current) renderCard(ref.current, card, t.text, t.reference, bg, ramadan) }, [t?.text, bg]) // eslint-disable-line react-hooks/exhaustive-deps
  const share = async () => {
    const blob = await canvasToBlob(ref.current!)
    const r = await shareImage(blob, `rafiq-card-${card.id}.png`, card.title)
    toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظت الصورة' : 'تعذرت المشاركة')
  }
  return (
    <div className="card-viewer" role="dialog" aria-label={card.title}>
      <button className="icon-btn card-viewer-close" onClick={onClose} aria-label="إغلاق"><X size={22} /></button>
      {!t ? <Spinner /> : <canvas ref={ref} className="card-viewer-canvas" />}
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={share}><Share2 size={16} /> مشاركة</button>
        <button className="btn" onClick={() => setK(k + 1)}><Shuffle size={16} /> خلفية أخرى</button>
        {card.kind !== 'greeting' && <Link className="btn btn-ghost" to={card.quran ? `/studio?s=${card.quran.surah}&a=${card.quran.from}&to=${card.quran.to}` : '/studio?src=duas'}><Palette size={16} /> تصميم بنفسي</Link>}
      </div>
    </div>
  )
}

const PW = 1080, PH = 1920

/** يرسم بطاقة مصوّرة: المشهد (أو صورة المستخدم) ثم النص */
async function renderPoster(c: HTMLCanvasElement, scene: PosterScene, text: PosterText, photo?: HTMLImageElement | null) {
  c.width = PW; c.height = PH
  await loadPosterFonts(text.headline + ' ' + (text.sub ?? '') + ' ' + (text.source ?? ''))
  const ctx = c.getContext('2d')!
  if (photo) {
    const k = Math.max(PW / photo.naturalWidth, PH / photo.naturalHeight)
    const w = photo.naturalWidth * k, h = photo.naturalHeight * k
    ctx.drawImage(photo, (PW - w) / 2, (PH - h) / 2, w, h)
    const g = ctx.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, 'rgba(0,0,0,0.15)'); g.addColorStop(0.5, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, PW, PH)
  } else drawPosterScene(ctx, PW, PH, scene)
  drawPosterText(ctx, PW, PH, photo ? 'desert' : scene, text)
}

function PosterThumb({ p, onOpen }: { p: PosterCard; onOpen: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    const c = document.createElement('canvas')
    renderPoster(c, p.scene, p.text).then(() => { if (alive) setUrl(c.toDataURL('image/jpeg', 0.8)) })
    return () => { alive = false }
  }, [p])
  return (
    <button type="button" className="poster-card" onClick={onOpen} aria-label={`بطاقة مصوّرة: ${p.text.headline}`}>
      {url ? <img src={url} alt="" /> : <span className="share-card-ph"><Spinner label="" /></span>}
    </button>
  )
}

function PosterViewer({ p, onClose }: { p: PosterCard; onClose: () => void }) {
  const [scene, setScene] = useState<PosterScene>(p.scene)
  const [style, setStyle] = useState(p.text.style ?? 'ruqaa')
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const text = { ...p.text, style }
  useEffect(() => { if (ref.current) renderPoster(ref.current, scene, text, photo) }, [scene, style, photo]) // eslint-disable-line react-hooks/exhaustive-deps
  const share = async () => {
    const blob = await canvasToBlob(ref.current!, 'image/jpeg')
    const r = await shareImage(blob, `rafiq-${p.id}.jpg`, p.text.headline)
    toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظت الصورة' : 'تعذرت المشاركة')
  }
  const nextScene = () => { setPhoto(null); const i = POSTER_SCENES.findIndex((x) => x.id === scene); setScene(POSTER_SCENES[(i + 1) % POSTER_SCENES.length].id) }
  return (
    <div className="card-viewer" role="dialog" aria-label={p.text.headline}>
      <button className="icon-btn card-viewer-close" onClick={onClose} aria-label="إغلاق"><X size={22} /></button>
      <canvas ref={ref} className="poster-viewer-canvas" />
      <input ref={input} type="file" accept="image/*" hidden aria-label="صورة من الجوال" onChange={(e) => {
        const f = e.target.files?.[0]; if (!f) return
        const img = new Image(); img.onload = () => setPhoto(img); img.src = URL.createObjectURL(f); e.target.value = ''
      }} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={share}><Share2 size={16} /> مشاركة</button>
        <button className="btn" onClick={nextScene}><Shuffle size={16} /> مشهد آخر</button>
        {style !== 'naskh' && <button className="btn" onClick={() => setStyle(style === 'ruqaa' ? 'kufi' : 'ruqaa')}><Type size={16} /> خط آخر</button>}
        <button className="btn" onClick={() => input.current?.click()}><ImagePlus size={16} /> صورتي</button>
      </div>
    </div>
  )
}

export function CardsPage() {
  const { settings } = useSettings()
  const { entitled } = usePlus()
  const tz = settings.location?.tz
  const now = new Date()
  const day = dayKey(now, tz)
  const inRamadan = ramadanStatus(now, tz, settings.hijriOffset).inRamadan
  const [tab, setTab] = useState<Tab>(inRamadan ? 'ramadan' : 'today')
  const [open, setOpen] = useState<ShareCard | null>(null)
  const [openPoster, setOpenPoster] = useState<PosterCard | null>(null)
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
  const cards = useMemo(() => (tab === 'today' ? todayCards(day, weekday, inRamadan) : tab === 'ramadan' ? RAMADAN_CARDS : tab === 'eid' ? EID_CARDS : FRIDAY_CARDS), [tab, day, weekday, inRamadan])
  const bgs = [...BGS[tab], ...(entitled ? PLUS_BGS : [])]
  const occasion = tab === 'today' ? (inRamadan ? 'ramadan' : weekday === 5 ? 'friday' : null) : tab
  const posters = occasion ? POSTER_CARDS.filter((x) => x.occasion === occasion) : POSTER_CARDS.filter((_, i) => (i + dayIndex(day)) % 6 === 0)
  const isRam = (c: ShareCard) => c.id.startsWith('r-')
  return (
    <>
      <PageHead title="بطاقات للمشاركة" subtitle="بطاقات اليوم تتجدد كل يوم، وبطاقات رمضان والعيد والجمعة — شاركها بلمسة" />
      <Tabs label="نوع البطاقات" value={tab} onChange={setTab} items={[{ id: 'today', label: 'اليوم' }, { id: 'ramadan', label: 'رمضان' }, { id: 'eid', label: 'العيد' }, { id: 'friday', label: 'الجمعة' }]} />
      {posters.length > 0 && (
        <section aria-label="بطاقات مصوّرة">
          <h2 className="cards-sec-title">بطاقات مصوّرة</h2>
          <div className="poster-row">{posters.map((x) => <PosterThumb key={x.id} p={x} onOpen={() => setOpenPoster(x)} />)}</div>
        </section>
      )}
      <h2 className="cards-sec-title">بطاقات الآيات والأحاديث والأدعية</h2>
      <div className="share-grid">
        {cards.map((c, i) => <CardThumb key={c.id} card={c} bg={bgs[i % bgs.length]} ramadan={isRam(c)} onOpen={() => setOpen(c)} />)}
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>الآيات من المصحف المعتمد، والأحاديث والأدعية بتخريجها، والتهاني عبارات عامة.</p>
      {openPoster && <PosterViewer p={openPoster} onClose={() => setOpenPoster(null)} />}
      {open && <CardViewer card={open} bgs={bgs} ramadan={isRam(open)} onClose={() => setOpen(null)} />}
    </>
  )
}
