// «التفسير المصوّر»: يختار المستخدم سورة وآيات، فيُصنع فيديو عمودي بأسلوب «حبر وذهب»:
// الآية بصوت القارئ، ومشهد مرسوم متحرك يناسب المعنى، والمعنى من التفسير الميسر كما هو (ويُقرأ بصوت الهاتف على Android).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square, Clapperboard, Share2, Wand2 } from 'lucide-react'
import { PageHead, Spinner } from '../../components/Common'
import { useQuran, toast } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { RECITERS, reciterById } from '../../content/reciters'
import { getTafsirSurah, groupEntries } from '../../services/tafsir'
import { loadStudioFonts } from '../../services/studio'
import { loadRecitation, extFor } from '../../services/studioVideo'
import type { FilmScene } from '../../services/storyFilm'
import { INK_SCENES, pickInkScene, type InkScene, type ScenePick } from '../../services/inkArt'
import { INK_H, INK_W, MAX_INK_AYAHS, clipSegments, decodeBase64Audio, drawInkFrame, frameAt, inkTimeline, runInkVideo } from '../../services/inkVideo'
import { synthesizeText } from '../../services/timedVoice'
import { platformName, shareImage } from '../../platform'
import { toArabicDigits } from '../../lib/arabic'

type Status = { s: 'idle' } | { s: 'loading'; msg: string } | { s: 'playing'; p: number } | { s: 'recording'; p: number } | { s: 'done'; blob: Blob; url: string } | { s: 'error'; msg: string }

export function TafsirVideoPage() {
  const { data: quran } = useQuran()
  const { settings } = useSettings()
  const [surah, setSurah] = useState(1)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(7)
  const [reciter, setReciter] = useState(settings.reciterId)
  const [narrate, setNarrate] = useState(platformName() === 'android')
  const [segs, setSegs] = useState<FilmScene[] | null>(null)
  const [overrides, setOverrides] = useState<Record<number, InkScene>>({})
  const [tafsirErr, setTafsirErr] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>({ s: 'idle' })
  const canvas = useRef<HTMLCanvasElement>(null)
  const abort = useRef<AbortController | null>(null)
  const meta = quran?.meta.surahs[surah - 1]
  const count = meta?.count ?? 7
  const verse = (a: number) => quran?.verses[surah - 1]?.[a - 1] ?? ''

  // تعديل المدى عند تغيير السورة
  useEffect(() => { setFrom(1); setTo(Math.min(count, surah === 1 ? 7 : 3)); setOverrides({}) }, [surah, count])
  useEffect(() => { if (to < from) setTo(from); else if (to - from + 1 > MAX_INK_AYAHS) setTo(from + MAX_INK_AYAHS - 1) }, [from, to])

  // التفسير الميسر للسورة
  useEffect(() => {
    let alive = true
    setSegs(null); setTafsirErr(null)
    getTafsirSurah('ar-tafsir-muyassar', surah).then(({ entries }) => { if (alive) setSegs(groupEntries(entries)) }).catch((e: Error) => { if (alive) setTafsirErr(e.message) })
    return () => { alive = false }
  }, [surah])

  const scenes = useMemo(() => (segs ? clipSegments(segs, from, to) : []), [segs, from, to])
  const picks: ScenePick[] = useMemo(() => scenes.map((sc, i) => {
    const auto = pickInkScene(Array.from({ length: sc.to - sc.from + 1 }, (_, k) => verse(sc.from + k)).join(' '), sc.text)
    const o = overrides[i]
    if (!o) return auto
    const def = INK_SCENES.find((x) => x.id === o)!
    // اختيار المستخدم لا يُظهر الشخصية في آيات القصص (يبقى رمزيًا)
    return { scene: o, figure: def.figure && auto.figure !== false ? def.figure : false }
  }), [scenes, overrides, quran]) // eslint-disable-line react-hooks/exhaustive-deps

  // معاينة صامتة متحركة حين لا يعمل التشغيل
  useEffect(() => {
    const c = canvas.current
    if (!c || !scenes.length || status.s === 'playing' || status.s === 'recording') return
    c.width = INK_W / 2; c.height = INK_H / 2
    const ctx = c.getContext('2d')!
    void loadStudioFonts(scenes.map((s) => s.text).join(' '), verse(from))
    const tl = inkTimeline(scenes, () => 4)
    const total = tl[tl.length - 1].end + 0.4
    const t0 = performance.now()
    let raf = 0
    const loop = () => {
      const t = ((performance.now() - t0) / 1000) % total
      drawInkFrame(ctx, frameAt(scenes, picks, verse, meta?.name ?? '', tl, t), c.width, c.height)
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [scenes, picks, status.s]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => { if (status.s === 'done') return () => URL.revokeObjectURL(status.url) }, [status])

  const run = async (record: boolean) => {
    if (!scenes.length || !meta) return
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const actx = new AudioContext()
    try {
      const ayahs = Array.from({ length: to - from + 1 }, (_, i) => from + i)
      setStatus({ s: 'loading', msg: 'تحميل الخطوط…' })
      await loadStudioFonts(ayahs.map(verse).join(' '), scenes.map((s) => s.text).join(' '), 'التفسير المصوّر المعنى الميسر')
      setStatus({ s: 'loading', msg: 'تحميل التلاوة…' })
      const bufs = await loadRecitation(actx, reciter, ayahs.map((a) => ({ surah, ayah: a, text: verse(a) })), (d, n) => setStatus({ s: 'loading', msg: `تحميل التلاوة ${toArabicDigits(d)} / ${toArabicDigits(n)}` }))
      let narration: (AudioBuffer | null)[] | undefined
      if (narrate && platformName() === 'android') {
        setStatus({ s: 'loading', msg: 'تجهيز قراءة المعنى بصوت الهاتف…' })
        narration = []
        for (const sc of scenes) {
          const b64 = await synthesizeText(sc.text).catch(() => null)
          narration.push(b64 ? await decodeBase64Audio(actx, b64).catch(() => null) : null)
        }
        if (narration.every((x) => !x)) toast('صوت القراءة العربي غير متاح في الهاتف — يظهر المعنى مكتوبًا')
      }
      if (ctrl.signal.aborted) return
      const c = canvas.current!
      c.width = record ? INK_W : INK_W / 2; c.height = record ? INK_H : INK_H / 2
      setStatus(record ? { s: 'recording', p: 0 } : { s: 'playing', p: 0 })
      let last = 0
      const blob = await runInkVideo({
        canvas: c, scenes, picks, verses: verse, surahName: meta.name, buffers: new Map(ayahs.map((a, i) => [a, bufs[i]])), narration, actx, record, signal: ctrl.signal,
        onProgress: (x) => { if (x - last > 0.01 || x === 1) { last = x; setStatus(record ? { s: 'recording', p: x } : { s: 'playing', p: x }) } },
      })
      setStatus(blob ? { s: 'done', blob, url: URL.createObjectURL(blob) } : { s: 'idle' })
    } catch (e) {
      setStatus((e as Error).name === 'AbortError' ? { s: 'idle' } : { s: 'error', msg: (e as Error).message || 'تعذر إنشاء الفيديو' })
    } finally { actx.close().catch(() => {}) }
  }
  const stop = () => { abort.current?.abort(); setStatus({ s: 'idle' }) }
  const busy = status.s === 'loading' || status.s === 'playing' || status.s === 'recording'

  if (!quran) return <><PageHead title="التفسير المصوّر" /><Spinner /></>

  return (
    <>
      <PageHead title="التفسير المصوّر" subtitle="فيديو بأسلوب «حبر وذهب»: الآية بصوت القارئ، ومشهد مرسوم متحرك، والمعنى من التفسير الميسر" />
      <div className="tv-ink stack">
        <section className="card stack" style={{ gap: '0.75rem' }}>
          <label className="field"><span>السورة</span>
            <select value={surah} onChange={(e) => setSurah(Number(e.target.value))} disabled={busy}>
              {quran.meta.surahs.map((s) => <option key={s.n} value={s.n}>{toArabicDigits(s.n)}. {s.name}</option>)}
            </select>
          </label>
          <div className="grid grid-2" style={{ gap: '0.75rem' }}>
            <label className="field"><span>من الآية</span>
              <select value={from} onChange={(e) => setFrom(Number(e.target.value))} disabled={busy}>
                {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{toArabicDigits(i + 1)}</option>)}
              </select>
            </label>
            <label className="field"><span>إلى الآية (حتى {toArabicDigits(MAX_INK_AYAHS)} آيات)</span>
              <select value={to} onChange={(e) => setTo(Number(e.target.value))} disabled={busy}>
                {Array.from({ length: Math.min(count, from + MAX_INK_AYAHS - 1) - from + 1 }, (_, i) => <option key={i} value={from + i}>{toArabicDigits(from + i)}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>القارئ</span>
            <select value={reciter} onChange={(e) => setReciter(e.target.value)} disabled={busy}>
              {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          {platformName() === 'android' && <label className="check"><input type="checkbox" className="switch-input" checked={narrate} onChange={(e) => setNarrate(e.target.checked)} disabled={busy} /> قراءة المعنى بصوت الهاتف بعد التلاوة</label>}
        </section>

        {tafsirErr && <p className="alert alert-error small">{tafsirErr}</p>}
        {!segs && !tafsirErr && <Spinner label="تحميل التفسير الميسر…" />}

        {scenes.length > 0 && (
          <>
            <div className="ink-stage">
              <canvas ref={canvas} className="ink-canvas" aria-label="معاينة الفيديو" />
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {status.s === 'playing' ? <button className="btn" onClick={stop}><Square size={16} /> إيقاف</button> : <button className="btn" onClick={() => run(false)} disabled={busy}><Play size={16} /> شاهد مع التلاوة</button>}
              <button className="btn btn-primary" onClick={() => run(true)} disabled={busy}><Clapperboard size={16} /> حفظ فيديو</button>
            </div>
            {status.s !== 'idle' && status.s !== 'playing' && (
              <div className="card" role="status">
                {status.s === 'loading' && <p style={{ margin: 0 }}>{status.msg}</p>}
                {status.s === 'recording' && <p style={{ margin: 0 }}>جارٍ تسجيل الفيديو — {toArabicDigits(Math.round(status.p * 100))}٪. أبقِ الشاشة مفتوحة.</p>}
                {status.s === 'error' && <p className="alert alert-error small" style={{ margin: 0 }}>{status.msg}</p>}
                {status.s === 'done' && (
                  <div className="stack" style={{ gap: 8 }}>
                    <video src={status.url} controls playsInline style={{ width: '100%', maxHeight: '60vh', borderRadius: 12, background: '#000' }} />
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn-primary" onClick={async () => { const r = await shareImage(status.blob, `tafsir-${surah}-${from}-${to}.${extFor(status.blob.type)}`, `التفسير المصوّر — سورة ${meta?.name}`); toast(r === 'shared' ? 'تمت المشاركة' : r === 'downloaded' ? 'حُفظ الفيديو' : 'تعذرت المشاركة') }}><Share2 size={16} /> مشاركة أو حفظ</button>
                      <button className="btn" onClick={() => setStatus({ s: 'idle' })}>إغلاق</button>
                    </div>
                  </div>
                )}
                {(status.s === 'loading' || status.s === 'recording') && <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={stop}>إلغاء</button>}
              </div>
            )}

            <section className="card stack" style={{ gap: '0.6rem' }}>
              <h2 style={{ margin: 0 }}><Wand2 size={18} /> المشاهد</h2>
              <p className="small muted" style={{ margin: 0 }}>اختار التطبيق مشهدًا لكل مقطع بحسب معناه، ويمكنك تغييره. في آيات القصص وذكر الأنبياء والملائكة يكون المشهد رمزيًا بلا شخصيات.</p>
              {scenes.map((sc, i) => (
                <label key={i} className="field">
                  <span>الآيات {toArabicDigits(sc.from)}{sc.to > sc.from ? `–${toArabicDigits(sc.to)}` : ''}</span>
                  <select value={picks[i].scene} onChange={(e) => setOverrides({ ...overrides, [i]: e.target.value as InkScene })} disabled={busy}>
                    {INK_SCENES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              ))}
            </section>
            <p className="small muted">الآيات من المصحف المعتمد بصوت {reciterById(reciter).name}، والمعنى من «التفسير الميسر» (مجمع الملك فهد) كما هو دون تعديل. الرسوم من تصميم التطبيق.</p>
          </>
        )}
      </div>
    </>
  )
}
