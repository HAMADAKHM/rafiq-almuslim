import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Info, Library, Pause, Play, Repeat, Settings2, SkipBack, SkipForward, BookOpen, AlignJustify, Focus, Gauge } from 'lucide-react'
import { usePlayer } from '../../../hooks'
import { player } from '../../../services/audio'
import { useSettings } from '../../../state/SettingsContext'
import { QURAN_FONTS, type ReaderMode } from '../../../state/settings'
import { ReaderSettingsSheet } from './ReaderSettingsSheet'

const MODE_ICON: Record<ReaderMode, typeof BookOpen> = { flow: AlignJustify, mushaf: BookOpen, focus: Focus }
const MODE_LABEL: Record<ReaderMode, string> = { flow: 'متتابعة', mushaf: 'المصحف', focus: 'تركيز' }
const NEXT_MODE: Record<ReaderMode, ReaderMode> = { flow: 'mushaf', mushaf: 'focus', focus: 'flow' }

export interface ReaderChromeProps {
  title: string
  subtitle: string
  infoHref?: string
  /** الآية الحالية (للتفسير والتشغيل) */
  current: { surah: number; ayah: number; surahName: string; count: number }
  onModeChange: (m: ReaderMode) => void
  onTafsir: (surah: number, ayah: number) => void
  children: ReactNode
  /** وضع الصفحة الكاملة: بلا رأس، وشريط سفلي مختصر، وأدوات القراءة تظهر عند الطلب أو أثناء التلاوة */
  immersive?: { bar: ReactNode; toolsOpen: boolean }
}

/**
 * الإطار المشترك لصفحات القراءة: رأس بالسورة والصفحة والجزء، وشريط سفلي فيه الإعدادات وتبديل
 * طريقة العرض والتشغيل والتفسير، مع شريط تقدم التلاوة. يطبّق الخلفية والخط والإطار المختارة.
 */
export function ReaderChrome({ title, subtitle, infoHref, current, onModeChange, onTafsir, children, immersive }: ReaderChromeProps) {
  const { settings } = useSettings()
  const p = usePlayer()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const active = p.status !== 'idle'
  const playing = p.status === 'playing' || p.status === 'loading'
  const font = QURAN_FONTS.find((f) => f.id === settings.quranFont) ?? QURAN_FONTS[0]
  const ModeIcon = MODE_ICON[NEXT_MODE[settings.readerMode]]

  const togglePlay = () => {
    if (active) player.toggle()
    else player.play({ reciterId: settings.reciterId, surah: current.surah, surahName: current.surahName, from: 1, to: current.count, startAt: current.ayah })
  }

  return (
    <div className={`reader-app reader-bg-${settings.readerBg} frame-${settings.readerFrame}` + (immersive ? ' immersive' : '')} style={{ ['--quran-family' as string]: font.family }}>
      {!immersive && <header className="rd-head">
        <Link to="/quran" className="rd-icon" aria-label="العودة إلى فهرس السور"><ChevronRight size={22} /></Link>
        <div className="rd-title">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </div>
        {infoHref ? <Link to={infoHref} className="rd-icon" aria-label="معلومات السورة"><Info size={20} /></Link> : <span className="rd-icon" />}
      </header>}

      <main className="rd-body">{children}</main>

      {(!immersive || immersive.toolsOpen || active) && <footer className={'rd-bar' + (immersive ? ' over' : '')} aria-label="أدوات القراءة">
        {active && (
          <div className="rd-progress">
            <span className="small">{p.playingBasmala ? 'البسملة' : `الآية ${p.ayah} من ${p.to}`}</span>
            <input type="range" min={p.from} max={p.to} value={p.ayah} onChange={(e) => player.goTo(Number(e.target.value))} aria-label="الانتقال إلى آية أثناء التلاوة" />
            <span className="small">{p.surahName}</span>
          </div>
        )}
        {p.status === 'error' && <div className="rd-error" role="alert">{p.error} <button className="btn btn-sm" onClick={() => player.retry()}>إعادة المحاولة</button></div>}
        <div className="rd-tools">
          <button className="rd-tool" onClick={() => setSettingsOpen(true)}><Settings2 size={20} /><span>الإعدادات</span></button>
          {active ? (
            <button className="rd-tool" onClick={() => player.setRepeat(p.repeatEach === 1 ? 3 : p.repeatEach === 3 ? 5 : 1, p.repeatRange)} aria-label={`تكرار الآية: ${p.repeatEach}`}>
              <Repeat size={20} /><span>{p.repeatEach === 1 ? 'بلا تكرار' : `×${p.repeatEach}`}</span>
            </button>
          ) : (
            <button className="rd-tool" onClick={() => { const m = NEXT_MODE[settings.readerMode]; onModeChange(m) }} aria-label={`التبديل إلى ${MODE_LABEL[NEXT_MODE[settings.readerMode]]}`}>
              <ModeIcon size={20} /><span>{MODE_LABEL[NEXT_MODE[settings.readerMode]]}</span>
            </button>
          )}
          <div className="rd-play">
            {active && <button className="rd-icon" onClick={() => player.prev()} aria-label="الآية السابقة"><SkipForward size={20} /></button>}
            <button className="rd-play-btn" onClick={togglePlay} aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}>{playing ? <Pause size={26} /> : <Play size={26} />}</button>
            {active && <button className="rd-icon" onClick={() => player.next()} aria-label="الآية التالية"><SkipBack size={20} /></button>}
          </div>
          {active ? (
            <button className="rd-tool" onClick={() => player.setRate(p.rate === 1 ? 1.25 : p.rate === 1.25 ? 0.75 : 1)} aria-label={`السرعة ${p.rate}`}>
              <Gauge size={20} /><span>{p.rate}×</span>
            </button>
          ) : (
            <button className="rd-tool" onClick={() => onTafsir(current.surah, current.ayah)}><Library size={20} /><span>التفسير</span></button>
          )}
          {infoHref ? <Link className="rd-tool" to={infoHref}><Info size={20} /><span>السورة</span></Link> : <span className="rd-tool" />}
        </div>
      </footer>}
      {immersive?.bar}

      <ReaderSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} onModeChange={(m) => { setSettingsOpen(false); onModeChange(m) }} />
    </div>
  )
}
