// مكونات عرض فقرات الدروس: الآيات من المصحف، والأحاديث من المكتبة، والخطوات برسوم الأوضاع، والخط الزمني،
// وجدول خلاف المذاهب، وشارة حالة المراجعة والمصادر.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, BookOpen, ChevronLeft, CircleAlert, ScrollText } from 'lucide-react'
import { useQuran } from '../../hooks'
import { TafsirPanel } from '../learn/TafsirPanel'
import { getHadith, splitIsnad, bookInfo, type Hadith } from '../../services/hadithLib'
import { toArabicDigits } from '../../lib/arabic'
import { STATUS_LABEL, VERIFY_LABEL, type Block, type Pose, type Review, type SourceRef } from '../../content/academy/types'

const n2 = (n: number) => toArabicDigits(n)

/** رسم توضيحي مبسط لوضع الصلاة: أشكال هندسية بلا ملامح */
export function PoseIcon({ pose, size = 56 }: { pose: Pose; size?: number }) {
  const c = 'var(--primary)'
  const head = (x: number, y: number) => <circle cx={x} cy={y} r="6" fill={c} />
  const body: Record<Pose, React.ReactNode> = {
    stand: <>{head(32, 12)}<path d="M32 19 V40 M32 40 L26 58 M32 40 L38 58 M32 24 L26 36 M32 24 L38 36" /></>,
    takbir: <>{head(32, 12)}<path d="M32 19 V40 M32 40 L26 58 M32 40 L38 58 M32 24 L24 14 M32 24 L40 14" /></>,
    ruku: <>{head(14, 26)}<path d="M20 28 H42 M42 28 L42 58 M42 28 L40 58 M22 28 L24 44 M26 28 L28 44" /></>,
    sujud: <>{head(12, 50)}<path d="M18 48 L36 34 L48 48 L50 58 M18 52 H26 M36 34 L28 52" /></>,
    sit: <>{head(30, 18)}<path d="M30 25 V44 M30 44 H46 L48 56 M30 44 L22 56 M30 30 L38 42" /></>,
    salam: <>{head(32, 16)}<path d="M32 23 V44 M32 44 H48 L50 56 M32 44 L24 56 M44 10 l6 0 m-3 -3 l3 3 l-3 3" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{body[pose]}</svg>
}

function QuranBlock({ surah, from, to, note }: { surah: number; from: number; to: number; note?: string }) {
  const { data } = useQuran()
  const [open, setOpen] = useState<number | null>(null)
  if (!data) return <div className="card ac-quran"><small className="muted">جارٍ تحميل الآيات…</small></div>
  const name = data.meta.surahs[surah - 1]?.name
  const ayat = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  return (
    <figure className="card ac-quran">
      {note && <figcaption className="small muted">{note}</figcaption>}
      <p className="ac-quran-text">{ayat.map((a) => (
        <span key={a}>
          <button type="button" className={'ac-ayah' + (open === a ? ' on' : '')} onClick={() => setOpen(open === a ? null : a)} aria-label={`التفسير الميسر للآية ${a}`}>{data.verses[surah - 1][a - 1]}</button>
          <span className="ac-ayah-num"> ﴿{n2(a)}﴾ </span>
        </span>
      ))}</p>
      <div className="row ac-quran-foot"><small className="muted">سورة {name} {from === to ? `• الآية ${n2(from)}` : `• الآيات ${n2(from)}–${n2(to)}`}</small><Link className="small" to={`/quran/${surah}?ayah=${from}`}>في المصحف</Link></div>
      {open && <TafsirPanel surah={surah} ayah={open} />}
      {!open && ayat.length > 0 && <small className="muted">اضغط على أي آية لعرض تفسيرها الميسر.</small>}
    </figure>
  )
}

function HadithBlock({ book, n, cite, note }: { book: Hadith['book']; n: number; cite: string; note?: string }) {
  const [h, setH] = useState<Hadith | null | undefined>(undefined)
  useEffect(() => { let alive = true; getHadith(book, n).then((x) => alive && setH(x)).catch(() => alive && setH(null)); return () => { alive = false } }, [book, n])
  const b = bookInfo(book)
  return (
    <div className="card ac-hadith">
      <div className="spread"><strong className="small"><ScrollText size={14} /> {cite}</strong>{note && <small className="muted">{note}</small>}</div>
      {h === undefined ? <small className="muted">جارٍ تحميل نص الحديث…</small>
        : h === null ? <small className="muted">نص الحديث يحتاج اتصالًا بالإنترنت أول مرة (أو تنزيل {b?.name} من مكتبة الأحاديث). المرجع: {cite}.</small>
        : <>
            {(() => { const sp = splitIsnad(h.text); return sp.isnad.length > sp.matn.length * 1.5
              // السند الطويل قد يحوي وصف الفعل (كصفة الوضوء): يُعرض النص كاملًا
              ? <p className="ac-hadith-text">{h.text}</p>
              : <p className="ac-hadith-text">{sp.matn}</p> })()}
            {h.grades[0] && <small className={'hd-grade ' + h.grades[0].level}>{h.grades[0].ar} — {h.grades[0].byAr}</small>}
          </>}
      <Link className="small" to={`/hadith/h/${book}/${n}`}>تفاصيل الحديث وسنده <ChevronLeft size={12} /></Link>
    </div>
  )
}

export function BlockView({ b, kid }: { b: Block; kid?: boolean }) {
  switch (b.type) {
    case 'text': return <div className="ac-text">{b.title && <h3>{b.title}</h3>}<p>{b.body}</p></div>
    case 'list': return <div className="ac-text">{b.title && <h3>{b.title}</h3>}<ul>{b.items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
    case 'steps': return (
      <div className="ac-steps">{b.title && <h3>{b.title}</h3>}
        <ol className="plain">{b.items.map((s, i) => (
          <li key={i} className="card ac-step">
            {s.pose && <PoseIcon pose={s.pose} />}
            <div><strong>{n2(i + 1)}. {s.title}</strong><p>{s.body}</p></div>
          </li>
        ))}</ol>
      </div>
    )
    case 'quran': return <QuranBlock {...b} />
    case 'hadith': return kid ? <HadithBlock {...b} /> : <HadithBlock {...b} />
    case 'link':
      if (kid && !(b.to === '/kids-adhkar' || b.to.startsWith('/kids'))) return null
      return <Link className="list-card" to={kid && b.to === '/academy/kids/letters' ? '/kids/letters' : b.to}><span className="icon-chip"><BookOpen size={18} /></span><span className="lc-body"><strong>{b.title}</strong>{b.hint && <small>{b.hint}</small>}</span><ChevronLeft size={18} /></Link>
    case 'timeline': return (
      <div className="ac-timeline">
        <ol className="plain">{b.events.map((e, i) => (
          <li key={i}><span className="ac-dot" /><div><small className="muted">{e.when}</small><strong>{e.title}</strong>{e.quran && <QuranBlock surah={e.quran[0]} from={e.quran[1]} to={e.quran[2]} />}</div></li>
        ))}</ol>
        {b.note && <p className="small muted">{b.note}</p>}
      </div>
    )
    case 'madhab': return (
      <div className="card ac-madhab">
        <strong>{b.issue}</strong>
        <table><tbody>{b.views.map((v, i) => <tr key={i}><th scope="row">{v.madhab}</th><td>{v.view}</td></tr>)}</tbody></table>
        <small className="muted">المصدر: {b.source}. تُعرض الأقوال دون ترجيح؛ يُرجع في العمل إلى أهل العلم.</small>
      </div>
    )
  }
}

export function ReviewBanner({ review, sources }: { review: Review; sources: SourceRef[] }) {
  const ok = review.status === 'approved'
  return (
    <details className={'card ac-review ' + review.status}>
      <summary>{ok ? <BadgeCheck size={16} /> : <CircleAlert size={16} />} <strong>{STATUS_LABEL[review.status]}</strong> • {VERIFY_LABEL[review.verification]}</summary>
      {review.note && <p className="small">{review.note}</p>}
      {review.reviewer && <p className="small">المراجع العلمي: {review.reviewer}{review.reviewedAt ? ` • آخر مراجعة: ${review.reviewedAt}` : ''}</p>}
      {!ok && <p className="small muted">هذا المحتوى تعليمي ولم يعتمده متخصص في العلوم الشرعية بعد، وليس فتوى.</p>}
      {sources.length > 0 && (
        <ul className="small">{sources.map((s, i) => <li key={i}>{s.title}{s.author ? ` — ${s.author}` : ''}{s.edition ? ` • ${s.edition}` : ''}{s.page ? ` • ${s.page}` : ''}{s.note ? ` (${s.note})` : ''}</li>)}</ul>
      )}
    </details>
  )
}
