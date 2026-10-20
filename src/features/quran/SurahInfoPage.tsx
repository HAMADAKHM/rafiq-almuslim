import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, ChevronRight, Headphones, Languages, Library, ListOrdered, StickyNote, Bookmark } from 'lucide-react'
import { Spinner } from '../../components/Common'
import { useDocumentTitle, useLive, useQuran } from '../../hooks'
import { ayahMeta } from '../../services/quran'
import { bookmarks, kv, notes } from '../../db/repos'
import { toArabicDigits } from '../../lib/arabic'
import { useSettings } from '../../state/SettingsContext'
import { player } from '../../services/audio'
import iconUrl from '../../assets/icon.svg'
import type { LastRead } from './QuranIndexPage'
import type { Bookmark as BookmarkT, Note } from '../../db/db'

/** معلومات السورة والتنقل منها: الصفحة والجزء والحزب ومكان النزول وعدد الآيات، ومتابعة القراءة */
export function SurahInfoPage() {
  const { data } = useQuran()
  const { surah: sp } = useParams()
  const nav = useNavigate()
  const { settings, update } = useSettings()
  const surah = Math.min(114, Math.max(1, Number(sp) || 1))
  const last = useLive(() => kv.get<LastRead | null>('quran:last', null), ['kv:quran:last'], null)
  const marks = useLive(() => bookmarks.all(), ['bookmarks'], [] as BookmarkT[])
  const noteList = useLive(() => notes.all(), ['notes'], [] as Note[])
  useDocumentTitle(data ? `سورة ${data.meta.surahs[surah - 1].name}` : '')
  if (!data) return <Spinner />
  const s = data.meta.surahs[surah - 1]
  const m = ayahMeta(data.meta, surah, 1)
  const resume = last?.surah === surah ? last.ayah : 1
  const myMarks = marks.filter((b) => b.surah === surah)
  const myNotes = noteList.filter((n) => n.surah === surah)

  return (
    <div className="surah-info">
      <header className="si-head">
        <button className="rd-icon si-back" onClick={() => nav('/quran')} aria-label="العودة إلى الفهرس"><ChevronRight size={22} /></button>
        <img src={iconUrl} alt="" className="si-emblem" />
        <h1>سورة {s.name}</h1>
        <p>{s.tr}</p>
      </header>
      <section className="si-stats" aria-label="بيانات السورة">
        <div><small>الصفحة</small><b>{toArabicDigits(m.page)}</b></div>
        <div><small>الحزب</small><b>{toArabicDigits(m.hizb)}</b></div>
        <div><small>الجزء</small><b>{toArabicDigits(m.juz)}</b></div>
        <div><small>مكان النزول</small><b>{s.type === 'meccan' ? 'مكية' : 'مدنية'}</b></div>
        <div><small>عدد الآيات</small><b>{toArabicDigits(s.count)}</b></div>
        <div><small>ترتيبها</small><b>{toArabicDigits(s.n)}</b></div>
      </section>
      <nav className="si-list" aria-label="خيارات السورة">
        <Link to={`/quran/${surah}?ayah=1&flow=1`}><ListOrdered size={20} /><span>الآيات من البداية</span></Link>
        <Link to={`/mushaf/${m.page}?s=${surah}&a=1`}><BookOpen size={20} /><span>في صفحات المصحف</span></Link>
        <button onClick={() => player.play({ reciterId: settings.reciterId, surah, surahName: s.name, from: 1, to: s.count })}><Headphones size={20} /><span>الاستماع إلى السورة</span></button>
        <Link to={`/learn?s=${surah}&a=1`}><Library size={20} /><span>التفسير</span></Link>
        <button onClick={() => { update({ translation: settings.translation === 'none' ? 'en-sahih' : 'none' }) }} aria-pressed={settings.translation !== 'none'}>
          <Languages size={20} /><span>الترجمة الإنجليزية: {settings.translation === 'none' ? 'متوقفة' : 'ظاهرة'}</span>
        </button>
        <div className="si-sub"><Bookmark size={20} /><span>العلامات في هذه السورة</span>
          {myMarks.length ? <span className="row">{myMarks.map((b) => <Link key={b.id} className="badge" to={`/quran/${surah}?ayah=${b.ayah}&flow=1`}>{b.label || `آية ${b.ayah}`}</Link>)}</span> : <small className="muted">لا توجد</small>}
        </div>
        <div className="si-sub"><StickyNote size={20} /><span>ملاحظاتي</span>
          {myNotes.length ? <span className="row">{myNotes.map((n) => <Link key={n.id} className="badge" to={`/quran/${surah}?ayah=${n.ayah}&flow=1`}>آية {n.ayah}</Link>)}</span> : <small className="muted">لا توجد</small>}
        </div>
      </nav>
      <Link className="btn btn-primary si-continue" to={`/quran/${surah}?ayah=${resume}`}>{resume > 1 ? `متابعة القراءة من الآية ${resume}` : 'ابدأ القراءة'}</Link>
    </div>
  )
}
