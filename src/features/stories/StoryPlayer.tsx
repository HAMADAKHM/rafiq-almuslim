// مشغّل القصة: مشهد = مقطع تفسير (آية أو عدة آيات فسّرها الكتاب معًا).
// «استمع»: تلاوة الآيات بصوت القارئ، ثم قراءة التفسير بصوت الجهاز (قراءة آلية للنص كما هو)، ثم المشهد التالي.
import { playBlob, tafsirAudioSupported, tafsirAyahAudio, TAFSIR_AUDIO_CREDIT, TAFSIR_AUDIO_EDITION } from '../../services/tafsirAudio'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Play, Pause, ArrowRight, Clapperboard } from 'lucide-react'
import { StoryFilm, type FilmPhase } from './StoryFilm'
import { PaintedScene, type PaintTone } from '../../components/Scene'
import { PlusGate } from '../../billing/PlusGate'
import { Spinner } from '../../components/Common'
import { storyById, storyScenes } from '../../content/stories'
import { getTafsirSurah, groupEntries, TAFSIR_EDITIONS } from '../../services/tafsir'
import { ayahAudioSources, reciterById } from '../../content/reciters'
import { speakArabic, stopSpeaking, voiceAvailable } from '../../platform/voice'
import { useSettings } from '../../state/SettingsContext'
import { useQuran } from '../../hooks'
import { kv } from '../../db/repos'
import { toArabicDigits } from '../../lib/arabic'

const EDITIONS = TAFSIR_EDITIONS.filter((e) => e.slug === 'ar-tafsir-muyassar' || e.slug === 'ar-tafsir-al-mukhtasar')
const TONES: PaintTone[] = ['dawn', 'day', 'sunset', 'night']

function playAyah(sources: string[], ref: { current: HTMLAudioElement | null }, alive: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const at = (i: number) => {
      if (i >= sources.length || !alive()) return resolve()
      const a = new Audio(sources[i])
      ref.current = a
      a.onended = () => resolve()
      a.onerror = () => at(i + 1)
      a.play().catch(() => at(i + 1))
    }
    at(0)
  })
}
const wait = (ms: number, alive: () => boolean) => new Promise<void>((r) => { const t0 = Date.now(); const f = () => (!alive() || Date.now() - t0 >= ms ? r() : setTimeout(f, 300)); f() })

export function StoryPlayerPage() {
  return <PlusGate feature="stories" title="التفسير كالقصة"><StoryPlayer /></PlusGate>
}

function StoryPlayer() {
  const params = useParams()
  const { data } = useQuran()
  const { settings } = useSettings()
  const story = params.id ? storyById(params.id) : undefined
  const surah = story?.surah ?? Number(params.surah ?? 1)
  const count = data?.meta.surahs[surah - 1]?.count ?? 0
  const from = story?.from ?? 1
  const to = story?.to ?? count
  const posKey = `stories:pos:${story?.id ?? `s${surah}`}`
  const title = story?.title ?? (data ? `سورة ${data.meta.surahs[surah - 1].name}` : '')

  const [edition, setEdition] = useState(EDITIONS[0].slug)
  const [groups, setGroups] = useState<{ from: number; to: number; text: string }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [withRecitation, setWithRecitation] = useState(true)
  const [voiceOk, setVoiceOk] = useState(true)
  const [phase, setPhase] = useState<FilmPhase>({ kind: 'idle' })
  const [film, setFilm] = useState(false)
  const [recordedFailed, setRecordedFailed] = useState(false)
  const useRecorded = edition === TAFSIR_AUDIO_EDITION && tafsirAudioSupported() && !recordedFailed
  const audio = useRef<HTMLAudioElement | null>(null)
  const run = useRef(0)

  useEffect(() => {
    let alive = true
    setGroups(null); setError(null)
    getTafsirSurah(edition, surah).then((r) => alive && setGroups(groupEntries(r.entries))).catch((e: Error) => alive && setError(e.message))
    return () => { alive = false }
  }, [edition, surah])
  useEffect(() => { kv.get<number>(posKey, 0).then((p) => setIdx(p)) }, [posKey])
  useEffect(() => { voiceAvailable().then(setVoiceOk) }, [])

  const scenes = useMemo(() => (groups ? storyScenes(groups, from, to) : []), [groups, from, to])
  const i = Math.min(idx, Math.max(0, scenes.length - 1))
  const scene = scenes[i]
  const go = useCallback((n: number) => { const v = Math.max(0, Math.min(scenes.length - 1, n)); setIdx(v); kv.set(posKey, v) }, [scenes.length, posKey])

  const stop = useCallback(() => {
    run.current++
    audio.current?.pause(); audio.current = null
    stopSpeaking().catch(() => {})
    setPlaying(false)
    setPhase({ kind: 'idle' })
  }, [])
  useEffect(() => stop, [stop])

  const listen = async (start: number) => {
    stop()
    const id = ++run.current
    const alive = () => run.current === id
    setPlaying(true)
    const reciter = reciterById(settings.reciterId)
    for (let k = start; k < scenes.length && alive(); k++) {
      go(k)
      const s = scenes[k]
      if (withRecitation) for (let a = s.from; a <= s.to && alive(); a++) { setPhase({ kind: 'ayah', ayah: a }); await playAyah(ayahAudioSources(reciter, surah, a), audio, alive) }
      if (!alive()) break
      setPhase({ kind: 'meaning' })
      // التفسير الميسّر بصوت قارئ حقيقي (مجمع الملك فهد)، آيةً آية؛ وإن تعذر فصوت الجهاز
      let recorded = false
      if (useRecorded) {
        try {
          const blobs: Blob[] = []
          for (let a = s.from; a <= s.to && alive(); a++) { const b = await tafsirAyahAudio(surah, a); if (!b) throw new Error('missing'); blobs.push(b) }
          for (const b of blobs) { if (!alive()) break; await playBlob(b, audio, alive) }
          recorded = true
        } catch { setRecordedFailed(true) }
      }
      if (!recorded && alive()) {
        if (voiceOk) { try { await speakArabic(s.text, 0.85) } catch { setVoiceOk(false) } }
        else await wait(Math.max(6000, s.text.length * 70), alive)
      }
      if (alive()) await wait(900, alive)
    }
    if (alive()) { setPlaying(false); setPhase({ kind: 'idle' }) }
  }

  if (!data) return <Spinner />
  if (!story && (!params.surah || surah < 1 || surah > 114)) return <p className="card">لم توجد هذه القصة. <Link to="/stories">العودة إلى القصص</Link></p>

  return (
    <div className="story-player">
      <div className="story-stage">
        <PaintedScene tone={story && i === 0 ? story.tone : TONES[i % TONES.length]} variant="hero" className="story-stage-art" />
        <div className="story-stage-veil" />
        <div className="story-stage-body">
          <div className="story-top">
            <Link to="/stories" className="icon-btn" aria-label="العودة إلى القصص" onClick={stop}><ArrowRight size={20} /></Link>
            <div><h1>{title}</h1>{scenes.length > 0 && <small>المشهد {toArabicDigits(i + 1)} من {toArabicDigits(scenes.length)}</small>}</div>
          </div>
          {error && <p className="story-error" role="alert">{error}</p>}
          {!groups && !error && <Spinner label="جارٍ تحميل التفسير" />}
          {scene && (
            <article className="story-scene" key={`${edition}:${scene.from}`} aria-live="polite">
              <p className="quran-text story-ayah">
                {Array.from({ length: scene.to - scene.from + 1 }, (_, k) => scene.from + k).map((a) => (
                  <span key={a}>{data.verses[surah - 1][a - 1]} <span className="ayah-num">﴿{toArabicDigits(a)}﴾</span> </span>
                ))}
              </p>
              <h2 className="story-meaning-h">المعنى</h2>
              <p className="story-meaning">{scene.text}</p>
              <small className="story-ref">سورة {data.meta.surahs[surah - 1].name} • {scene.from === scene.to ? `الآية ${toArabicDigits(scene.from)}` : `الآيات ${toArabicDigits(scene.from)}–${toArabicDigits(scene.to)}`}</small>
            </article>
          )}
        </div>
      </div>

      {scenes.length > 0 && (
        <div className="story-controls">
          <div className="story-progress" role="progressbar" aria-valuemin={1} aria-valuemax={scenes.length} aria-valuenow={i + 1} aria-label="تقدم القصة"><span style={{ width: `${((i + 1) / scenes.length) * 100}%` }} /></div>
          <div className="story-buttons">
            <button className="icon-btn" onClick={() => { stop(); go(i - 1) }} disabled={i === 0} aria-label="المشهد السابق"><ChevronRight size={24} /></button>
            <button className="btn btn-gold story-play" onClick={() => (playing ? stop() : listen(i))}>{playing ? <><Pause size={18} /> إيقاف</> : <><Play size={18} /> استمع كالقصة</>}</button>
            <button className="btn story-film-btn" onClick={() => setFilm(true)}><Clapperboard size={18} /> وضع الفيلم</button>
            <button className="icon-btn" onClick={() => { stop(); go(i + 1) }} disabled={i >= scenes.length - 1} aria-label="المشهد التالي"><ChevronLeft size={24} /></button>
          </div>
          <div className="story-options">
            <label><input type="checkbox" checked={withRecitation} onChange={(e) => { stop(); setWithRecitation(e.target.checked) }} /> مع تلاوة الآيات ({reciterById(settings.reciterId).name})</label>
            <div className="chips" role="radiogroup" aria-label="كتاب التفسير">
              {EDITIONS.map((e) => <button key={e.slug} role="radio" aria-checked={edition === e.slug} className={'chip' + (edition === e.slug ? ' active' : '')} onClick={() => { stop(); setEdition(e.slug) }}>{e.name}</button>)}
            </div>
          </div>
          {!voiceOk && <p className="muted small">لا يوجد صوت عربي في الجهاز لقراءة التفسير: تُتلى الآيات ويبقى المعنى مكتوبًا مدة تكفي لقراءته. يمكن تثبيت العربية من إعدادات «تحويل النص إلى كلام» في الهاتف.</p>}
          {film && (
            <StoryFilm title={title} surah={surah} surahName={data.meta.surahs[surah - 1].name} verses={data.verses[surah - 1]} scenes={scenes} tone={story?.tone ?? 'sunset'}
              index={i} phase={phase} playing={playing} reciterId={settings.reciterId} onPlay={() => listen(i)} onStop={stop} onGo={go} onClose={() => setFilm(false)} recordedTafsir={useRecorded} />
          )}
          <p className="muted small">التفسير: {EDITIONS.find((e) => e.slug === edition)?.name} — {EDITIONS.find((e) => e.slug === edition)?.author}. {useRecorded ? `يُسمع بتسجيل بشري: ${TAFSIR_AUDIO_CREDIT} (متاح للاستخدام العام مجانًا في التطبيقات). يُحفظ كل مقطع على جهازك بعد أول سماع.` : 'يُقرأ بصوت الجهاز قراءةً آلية للنص كما هو.'} والآيات بصوت القارئ.</p>
          {recordedFailed && edition === TAFSIR_AUDIO_EDITION && <p className="muted small">تعذر تحميل التسجيل الصوتي للتفسير الآن (تحقق من الإنترنت)، فاستُخدم صوت الجهاز. <button className="btn btn-ghost btn-sm" onClick={() => setRecordedFailed(false)}>أعد المحاولة</button></p>}
        </div>
      )}
    </div>
  )
}
