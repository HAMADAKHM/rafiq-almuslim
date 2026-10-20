import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft, RotateCcw, Star, Image, Copy, Play, AArrowDown, AArrowUp, CircleCheck } from 'lucide-react'
import type { DhikrItem } from '../../content/types'
import { QuranRefText } from '../../components/QuranRefText'
import { ShareCardDialog } from '../../components/ShareCardDialog'
import { KIND_LABEL, kindBadge } from '../../components/DhikrCard'
import { favorites } from '../../db/repos'
import { copyText, vibrate } from '../../platform'
import { toast, useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { player } from '../../services/audio'
import { toArabicDigits } from '../../lib/arabic'

export interface SessionProps {
  items: DhikrItem[]
  counts: Record<string, number>
  onCount: (id: string, n: number) => void
  favs?: Set<string>
  favKind?: 'dhikr' | 'dua' | 'hadith'
  /** يُستدعى مرة واحدة عند اكتمال كل الأذكار */
  onAllDone?: () => void
  doneLabel?: string
}

const targetOf = (it: DhikrItem) => it.count ?? 1

/** جلسة الأذكار: ذكر واحد في الشاشة بعدّاد كبير، والانتقال التلقائي عند اكتمال العدد (قابل للتعطيل) */
export function AdhkarSession({ items, counts, onCount, favs, favKind, onAllDone, doneLabel }: SessionProps) {
  const { settings, update } = useSettings()
  const { data } = useQuran()
  const firstOpen = Math.max(0, items.findIndex((it) => (counts[it.id] ?? 0) < targetOf(it)))
  const [idx, setIdx] = useState(firstOpen)
  // التقدم المحفوظ يُحمَّل بعد فتح الصفحة: نستأنف من أول ذكر لم يكتمل ما لم يتنقل المستخدم بنفسه
  const touched = useRef(false)
  useEffect(() => { if (!touched.current) setIdx(firstOpen) }, [firstOpen])
  const [share, setShare] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reportedDone = useRef(false)
  useEffect(() => () => clearTimeout(advanceTimer.current), [])
  useEffect(() => { setIdx((i) => Math.min(i, Math.max(0, items.length - 1))) }, [items.length])

  const allDone = items.length > 0 && items.every((it) => (counts[it.id] ?? 0) >= targetOf(it))
  useEffect(() => {
    if (allDone && !reportedDone.current) { reportedDone.current = true; onAllDone?.() }
    if (!allDone) reportedDone.current = false
  }, [allDone, onAllDone])

  const item = items[idx]
  const cardInput = useMemo(() => (item?.text ? { kind: 'dhikr' as const, heading: item.kind === 'hadith' ? 'من السنة النبوية' : item.kind === 'personal' ? 'ذكر' : 'دعاء', text: item.text, reference: item.kind === 'personal' ? '' : item.source.length <= 70 ? item.source : item.source.split(/[:—]/)[0].trim() } : null), [item])
  if (!item) return null
  const target = targetOf(item)
  const n = Math.min(counts[item.id] ?? 0, target)
  const done = n >= target
  const scale = settings.adhkarFontScale
  const completedItems = items.filter((it) => (counts[it.id] ?? 0) >= targetOf(it)).length
  const go = (d: number) => { touched.current = true; clearTimeout(advanceTimer.current); setIdx((i) => Math.min(items.length - 1, Math.max(0, i + d))) }

  const tap = () => {
    touched.current = true
    if (done) return
    const next = n + 1
    onCount(item.id, next)
    if (next >= target) {
      if (settings.adhkarVibrate) vibrate('goal')
      if (settings.adhkarAutoAdvance && idx < items.length - 1) {
        clearTimeout(advanceTimer.current)
        advanceTimer.current = setTimeout(() => setIdx((i) => Math.min(items.length - 1, i + 1)), 450)
      }
    } else if (settings.adhkarVibrate) vibrate('tap')
  }
  const firstRange = item.quran?.[0]
  const surahName = firstRange && data ? data.meta.surahs[firstRange.surah - 1].name : ''

  return (
    <div className="session" style={{ ['--adhkar-scale' as string]: scale }}>
      <div className="session-progress">
        <span>{toArabicDigits(idx + 1)} / {toArabicDigits(items.length)}</span>
        <div className="progress" role="progressbar" aria-label="الأذكار المكتملة" aria-valuenow={completedItems} aria-valuemin={0} aria-valuemax={items.length}>
          <span style={{ width: `${(completedItems / items.length) * 100}%` }} />
        </div>
        <span className="small muted">{completedItems} مكتمل</span>
      </div>

      <article className={'session-card' + (done ? ' is-done' : '')} id={`dhikr-${item.id}`} aria-live="polite">
        <div className="spread">
          <span className={kindBadge(item.kind)}>{KIND_LABEL[item.kind]}</span>
          {item.count && item.kind !== 'personal' && <span className="badge">{item.count <= 10 ? `${item.count} مرات` : `${item.count} مرة`}</span>}
        </div>
        {item.note && <p className="small muted" style={{ margin: '0.5rem 0 0' }}>{item.note}</p>}
        <div className="session-text" onClick={tap}>
          {item.quran ? <QuranRefText ranges={item.quran} size="calc(1.6rem * var(--adhkar-scale, 1))" /> : <p className="classic-text dhikr-text">{item.text}</p>}
        </div>
        <p className="source">
          {item.kind === 'personal' ? <>أضفته بنفسك — لا يُنسب إلى السنة.</> : <><strong>المصدر:</strong> {item.source}{item.grade && <> • <strong>الدرجة:</strong> {item.grade}</>}</>}
        </p>
      </article>

      <div className="session-counter">
        <button className="session-nav" onClick={() => go(-1)} disabled={idx === 0} aria-label="الذكر السابق"><ChevronRight size={22} /></button>
        <button className={'counter-ring' + (done ? ' done' : '')} onClick={tap} aria-label={`عدّاد: ${n} من ${target}`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="54" className="track" />
            <circle cx="60" cy="60" r="54" className="bar" style={{ strokeDasharray: 339.3, strokeDashoffset: 339.3 * (1 - n / target) }} />
          </svg>
          <span className="counter-n">{done ? <CircleCheck size={34} /> : toArabicDigits(target - n)}</span>
          <span className="counter-sub">{done ? 'اكتمل' : target > 1 ? 'متبقٍّ' : 'اضغط'}</span>
        </button>
        <button className="session-nav" onClick={() => go(1)} disabled={idx === items.length - 1} aria-label="الذكر التالي"><ChevronLeft size={22} /></button>
      </div>

      <div className="session-tools">
        <button className="btn btn-ghost btn-sm" onClick={() => onCount(item.id, 0)} aria-label="إعادة عدّ هذا الذكر"><RotateCcw size={15} /> إعادة</button>
        {favKind && favs && (
          <button className="btn btn-ghost btn-sm icon-btn" aria-label={favs.has(item.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={favs.has(item.id)} onClick={() => favorites.toggle(favKind, item.id)}>
            <Star size={16} fill={favs.has(item.id) ? 'var(--gold)' : 'none'} color={favs.has(item.id) ? 'var(--gold)' : 'currentColor'} />
          </button>
        )}
        {item.text && <button className="btn btn-ghost btn-sm icon-btn" aria-label="نسخ" onClick={async () => toast((await copyText(item.kind === 'personal' ? item.text! : `${item.text}\n— ${item.source}`)) ? 'نُسخ النص' : 'تعذر النسخ')}><Copy size={15} /></button>}
        {item.text && <button className="btn btn-ghost btn-sm icon-btn" aria-label="مشاركة كبطاقة" onClick={() => setShare(true)}><Image size={15} /></button>}
        {firstRange && <button className="btn btn-ghost btn-sm icon-btn" aria-label="استماع للآيات" onClick={() => player.play({ reciterId: settings.reciterId, surah: firstRange.surah, surahName, from: firstRange.from, to: firstRange.to })}><Play size={15} /></button>}
        <button className="btn btn-ghost btn-sm icon-btn" aria-label="تصغير النص" onClick={() => update({ adhkarFontScale: Math.max(0.8, +(scale - 0.1).toFixed(2)) })}><AArrowDown size={17} /></button>
        <button className="btn btn-ghost btn-sm icon-btn" aria-label="تكبير النص" onClick={() => update({ adhkarFontScale: Math.min(1.8, +(scale + 0.1).toFixed(2)) })}><AArrowUp size={17} /></button>
      </div>
      <label className="check session-auto">
        <input type="checkbox" className="switch-input" role="switch" checked={settings.adhkarAutoAdvance} onChange={(e) => update({ adhkarAutoAdvance: e.target.checked })} aria-label="الانتقال التلقائي إلى الذكر التالي" />
        الانتقال تلقائيًا عند اكتمال العدد
      </label>
      {allDone && <p className="alert alert-info session-done" role="status"><CircleCheck size={16} /> {doneLabel ?? 'أتممت الأذكار'} — تقبّل الله منك.</p>}
      <ShareCardDialog open={share} onClose={() => setShare(false)} input={share ? cardInput : null} />
    </div>
  )
}
