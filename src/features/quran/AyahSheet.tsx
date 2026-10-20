import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Bookmark, BookmarkCheck, Check, Copy, Heart, Image, Library, Play, Repeat, Share2, StickyNote } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { ShareCardDialog } from '../../components/ShareCardDialog'
import { toast, useLive } from '../../hooks'
import { bookmarks, favorites } from '../../db/repos'
import { copyText, shareText } from '../../platform'
import { player } from '../../services/audio'
import { toArabicDigits } from '../../lib/arabic'
import { ayahMeta, type QuranData } from '../../services/quran'
import { useSettings } from '../../state/SettingsContext'
import type { Bookmark as BookmarkT, Favorite } from '../../db/db'

export interface AyahSheetProps {
  data: QuranData
  surah: number
  ayah: number | null
  onClose: () => void
  onTafsir: (a: number) => void
  onNote: (a: number) => void
  onMarkRead?: (a: number) => void
}

/** قائمة إجراءات الآية: تظهر عند الضغط على الآية، وتُغلق بسهولة للعودة إلى القراءة. */
export function AyahSheet({ data, surah, ayah, onClose, onTafsir, onNote, onMarkRead }: AyahSheetProps) {
  const nav = useNavigate()
  const { settings } = useSettings()
  const marks = useLive(() => bookmarks.all(), ['bookmarks'], [] as BookmarkT[])
  const favs = useLive(() => favorites.all(), ['favorites'], [] as Favorite[])
  const [label, setLabel] = useState('')
  const [repeat, setRepeat] = useState(3)
  const [card, setCard] = useState(false)
  const cardInput = useMemo(() => (ayah == null ? null : { kind: 'ayah' as const, heading: 'قال الله تعالى', text: data.verses[surah - 1][ayah - 1], reference: `[سورة ${data.meta.surahs[surah - 1].name}: ${ayah}]` }), [data, surah, ayah])
  if (ayah == null) return null
  const s = data.meta.surahs[surah - 1]
  const text = data.verses[surah - 1][ayah - 1]
  const ref = `سورة ${s.name}: ${ayah}`
  const full = `${text} ﴿${toArabicDigits(ayah)}﴾\n[${ref}]`
  const bm = marks.find((b) => b.id === `${surah}:${ayah}`)
  const isFav = favs.some((f) => f.id === `ayah:${surah}:${ayah}`)
  const play = (from: number, to: number, repeatEach = 1) => {
    player.play({ reciterId: settings.reciterId, surah, surahName: s.name, from, to, startAt: from, repeatEach })
    onClose()
  }

  return (
    <>
      <Sheet open={!card} onClose={onClose} title={`${ref}`}>
        <p className="quran-text sheet-ayah">{text}</p>
        <div className="sheet-grid">
          <button className="sheet-action" onClick={() => play(ayah, s.count)}><Play size={18} /><span>التلاوة من هنا</span></button>
          <button className="sheet-action" onClick={() => play(ayah, ayah, repeat)}><Repeat size={18} /><span>تكرار الآية ×{repeat}</span></button>
          <button className="sheet-action" onClick={() => { onTafsir(ayah); onClose() }}><Library size={18} /><span>التفسير</span></button>
          <button className="sheet-action" aria-pressed={isFav} onClick={async () => toast((await favorites.toggle('ayah', `${surah}:${ayah}`)) ? 'أضيفت إلى المفضلة' : 'أزيلت من المفضلة')}>
            <Heart size={18} fill={isFav ? 'var(--gold)' : 'none'} /><span>{isFav ? 'في المفضلة' : 'المفضلة'}</span>
          </button>
          <button className="sheet-action" onClick={async () => toast((await copyText(full)) ? 'نُسخت الآية' : 'تعذر النسخ')}><Copy size={18} /><span>نسخ</span></button>
          <button className="sheet-action" onClick={async () => { const r = await shareText(ref, full); if (r === 'copied') toast('نُسخت الآية للمشاركة') }}><Share2 size={18} /><span>مشاركة النص</span></button>
          <button className="sheet-action" onClick={() => setCard(true)}><Image size={18} /><span>بطاقة صورة</span></button>
          <button className="sheet-action" onClick={() => { onNote(ayah); onClose() }}><StickyNote size={18} /><span>ملاحظة</span></button>
          <button className="sheet-action" onClick={() => { nav(`/mushaf/${ayahMeta(data.meta, surah, ayah).page}?s=${surah}&a=${ayah}`); onClose() }}><BookOpen size={18} /><span>موضعها في المصحف</span></button>
          {onMarkRead && <button className="sheet-action" onClick={() => { onMarkRead(ayah); onClose() }}><Check size={18} /><span>قرأت حتى هنا</span></button>}
        </div>
        <div className="row small" style={{ marginTop: 8 }}>
          <label className="row">عدد التكرار
            <select className="select" style={{ width: 70, minHeight: 32, padding: '0 0.4rem' }} value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
              {[2, 3, 5, 7, 10, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <hr className="divider" />
        {bm ? (
          <div className="spread">
            <span className="row"><BookmarkCheck size={18} color="var(--gold)" /> علامة: {bm.label || 'بلا اسم'}</span>
            <button className="btn btn-sm btn-ghost" onClick={async () => { await bookmarks.toggle(surah, ayah); toast('أزيلت العلامة') }}>إزالة العلامة</button>
          </div>
        ) : (
          <form className="row" onSubmit={async (e) => { e.preventDefault(); await bookmarks.add(surah, ayah, label); setLabel(''); toast('أضيفت العلامة') }}>
            <input className="input" style={{ flex: 1, minWidth: 140 }} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="اسم العلامة (اختياري)" aria-label="اسم العلامة" />
            <button className="btn btn-sm"><Bookmark size={16} /> إضافة علامة</button>
          </form>
        )}
      </Sheet>
      <ShareCardDialog open={card} onClose={() => { setCard(false); onClose() }} input={card ? cardInput : null} />
    </>
  )
}
