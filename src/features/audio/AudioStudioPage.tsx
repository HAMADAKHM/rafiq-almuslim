// «استوديو أصوات رفيق المسلم»: مكتبة الأصوات (الطبيعة، نغمات التنبيه، التذكير البشري، تلاوات الأذكار، السبحة)،
// والتخصيص لكل مناسبة، ومكتبة القرّاء، والتنزيل للعمل دون إنترنت، ومشغل مصغر بشريط تقدم.
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, BookOpen, CircleDot, Crown, Download, Leaf, Lock, Mic, Pause, Play, Repeat, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { usePlus } from '../../billing/PlusContext'
import { useSettings } from '../../state/SettingsContext'
import { DEFAULT_AUDIO_STUDIO, type AudioStudioSettings, type VoiceOpt } from '../../state/settings'
import { toast } from '../../hooks'
import { BUNDLED, GROUP_TITLES, HUMAN_PHRASES, SINGLE_DHIKR, hisnRecordings, quranItems, type DhikrGroup, type StudioSound } from '../../content/soundLibrary'
import { HISN_AUDIO_CREDIT } from '../../content/hisnAudio'
import { RECITERS, reciterById } from '../../content/reciters'
import { goldenPhoto } from '../../themes/golden'
import { getRecording, saveRecording, validateRecording, type DhikrRecording } from '../../services/dhikrAudio'
import {
  applyVolume, ayahUrls, batchState, bundledUrl, dlState, downloadAll, downloadUrl, downloadsVersion, fmtBytes, pauseBatch, playList, playSound,
  playerState, remoteSize, remoteUrls, removeDownload, resumeBatch, scanDownloads, seek, setLoop, setStudioSettings, stopPlayer, subscribeDownloads, subscribePlayer, togglePlay,
} from '../../services/audioStudio'

type Tab = 'nature' | 'tones' | 'human' | 'dhikr' | 'tasbih'
const CATS: { id: Tab; name: string; hint: string; img: string; icon: ReactNode }[] = [
  { id: 'nature', name: 'أصوات الطبيعة', hint: 'مطر ونسيم وأمواج وعصافير', img: 'nature-04', icon: <Leaf size={22} /> },
  { id: 'tones', name: 'نغمات التنبيه', hint: 'أجراس وماء دون موسيقى', img: 'bg-arch', icon: <BellRing size={22} /> },
  { id: 'human', name: 'التذكير البشري', hint: 'عبارات تذكير بصوت بشري', img: 'bg-madinah', icon: <Mic size={22} /> },
  { id: 'dhikr', name: 'تلاوات الأذكار', hint: 'تسجيلات بشرية حقيقية', img: 'bg-quran', icon: <BookOpen size={22} /> },
  { id: 'tasbih', name: 'أصوات السبحة', hint: 'نقرة وتمام 33 و100', img: 'p32', icon: <CircleDot size={22} /> },
]
const GROUPS: DhikrGroup[] = ['morning', 'evening', 'sleep']

function useDownloads() { return useSyncExternalStore(subscribeDownloads, downloadsVersion) }
function usePlayer() { return useSyncExternalStore(subscribePlayer, playerState) }

export function AudioStudioPage() {
  const plus = usePlus()
  const { settings, update } = useSettings()
  const a: AudioStudioSettings = { ...DEFAULT_AUDIO_STUDIO, ...settings.audioStudio, occasions: { ...DEFAULT_AUDIO_STUDIO.occasions, ...settings.audioStudio?.occasions }, tasbih: { ...DEFAULT_AUDIO_STUDIO.tasbih, ...settings.audioStudio?.tasbih } }
  const set = (p: Partial<AudioStudioSettings>) => update({ audioStudio: { ...a, ...p } })
  const [tab, setTab] = useState<Tab>(() => (location.hash === '#tasbih' ? 'tasbih' : 'tones'))
  const p = usePlayer()
  useDownloads()
  useEffect(() => { void scanDownloads() }, [])
  useEffect(() => { setStudioSettings(a); applyVolume() }, [a.volume, a.muteAll]) // eslint-disable-line react-hooks/exhaustive-deps

  const locked = (s: StudioSound) => !!s.plus && !plus.entitled
  const needPlus = () => toast('من مزايا رفيق المسلم بلس — يمكنك المعاينة الآن')
  const preview = (s: StudioSound) => { if (p.id === s.id && p.playing) stopPlayer(!!s.loop); else void playSound(s).catch(() => toast('تعذر التشغيل — تحقق من الاتصال أو نزّل التسجيل')) }
  const slotTone = (slot: 'morning' | 'evening' | 'sleep') => { const v = settings.notifications.voices?.[slot]; return v?.startsWith('snd:') ? v.slice(4) : '' }
  const setSlotTone = (slot: 'morning' | 'evening' | 'sleep', id: string) => {
    if (!plus.entitled) { needPlus(); return }
    const voices = { ...settings.notifications.voices } as Partial<Record<string, VoiceOpt>>
    if (id) voices[slot] = `snd:${id}` as VoiceOpt; else delete voices[slot]
    update({ notifications: { ...settings.notifications, voices } })
    toast(id ? 'اعتُمدت النغمة لتذكير ' + GROUP_TITLES[slot] : 'عاد التذكير إلى صوته السابق')
  }
  const tones = BUNDLED.filter((s) => s.cat === 'tones')
  const freeTones = tones.filter((s) => !s.plus)

  const card = (s: StudioSound, extra?: ReactNode) => (
    <div key={s.id} className={'as-sound' + (p.id === s.id && p.playing ? ' on' : '')}>
      <button type="button" className="as-play" onClick={() => preview(s)} aria-label={(p.id === s.id && p.playing ? 'إيقاف ' : 'معاينة ') + s.name}>{p.id === s.id && p.playing ? <Square size={16} /> : <Play size={16} />}</button>
      <div className="as-info">
        <strong>{s.name} {s.plus && <span className="fx-badge plus">بلس</span>}</strong>
        <small className="muted">{s.desc}</small>
        <small className="as-credit">{s.credit}</small>
      </div>
      {extra}
    </div>
  )

  return (
    <div className="as-page">
      <PageHead title="استوديو الأصوات" subtitle="استوديو أصوات رفيق المسلم — اختر كيف ومتى وبأي صوت تصلك الأذكار" />
      <div className="stack">
        <div className="as-cats" role="tablist" aria-label="فئات الأصوات">
          {CATS.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} className={'as-cat' + (tab === c.id ? ' on' : '')} style={{ ['--img' as string]: `url("${goldenPhoto(c.img)}")` }} onClick={() => setTab(c.id)}>
              <span className="as-cat-ic">{c.icon}</span><strong>{c.name}</strong><small>{c.hint}</small>
            </button>
          ))}
        </div>

        {tab === 'nature' && (
          <section className="card" aria-label="أصوات الطبيعة">
            <h2>أصوات الطبيعة</h2>
            <p className="small muted">حلقات هادئة تتكرر بلا انقطاع، وتتلاشى تدريجيًا عند الإيقاف. يمكن أن ترافق تلاوات الأذكار في الاستوديو.</p>
            <div className="as-list">{BUNDLED.filter((s) => s.cat === 'nature').map((s) => card(s,
              <button type="button" className={'btn btn-sm' + (a.nature === s.id ? ' btn-primary' : '')} onClick={() => (locked(s) ? needPlus() : set({ nature: s.id }))}>{locked(s) ? <Lock size={13} /> : a.nature === s.id ? 'المختار' : 'اختيار'}</button>))}</div>
            <label className="field"><span>مع تلاوات الأذكار</span>
              <select className="select" value={a.natureMode} onChange={(e) => { const v = e.target.value as AudioStudioSettings['natureMode']; if (v !== 'off' && !plus.entitled) { needPlus(); return } set({ natureMode: v }) }}>
                <option value="off">دون أصوات طبيعة</option>
                <option value="with">مع الذكر (خلفية هادئة تحت التلاوة){plus.entitled ? '' : ' — بلس'}</option>
                <option value="instead">بدل الذكر في التذكيرات (نغمة طبيعية بحسب الوقت){plus.entitled ? '' : ' — بلس'}</option>
              </select></label>
          </section>
        )}

        {tab === 'tones' && (
          <section className="card" aria-label="نغمات التنبيه">
            <h2>نغمات التنبيه</h2>
            <p className="small muted">نغمات قصيرة دون موسيقى، تصلح صوتًا لإشعارات التذكير على Android وتحترم وضع الصامت وعدم الإزعاج في جوالك.</p>
            <div className="as-list">{tones.map((s) => card(s,
              <button type="button" className={'btn btn-sm' + (a.defaultTone === s.id ? ' btn-primary' : '')} onClick={() => (locked(s) ? needPlus() : set({ defaultTone: s.id }))}>{locked(s) ? <Lock size={13} /> : a.defaultTone === s.id ? 'الافتراضية' : 'اجعلها الافتراضية'}</button>))}</div>
          </section>
        )}

        {tab === 'human' && <HumanSection />}

        {tab === 'dhikr' && <DhikrSection a={a} set={set} playing={p} />}

        {tab === 'tasbih' && (
          <section className="card" id="tasbih" aria-label="أصوات السبحة">
            <h2>أصوات السبحة الإلكترونية</h2>
            <div className="as-list">{BUNDLED.filter((s) => s.cat === 'tasbih').map((s) => card(s))}</div>
            <div className="stack" style={{ gap: 8, marginTop: 10 }}>
              <label className="check switch"><input type="checkbox" className="switch-input" checked={a.tasbih.clickOn} onChange={(e) => set({ tasbih: { ...a.tasbih, clickOn: e.target.checked } })} /> صوت النقر عند كل تسبيحة (عند إيقافه يبقى الاهتزاز وأصوات التمام)</label>
              {([['click', 'صوت النقرة'], ['m33', 'عند الوصول إلى 33'], ['m100', 'عند الوصول إلى 100'], ['done', 'عند إكمال العدد المحدد']] as const).map(([k, n]) => (
                <label key={k} className="field"><span>{n}</span>
                  <select className="select" value={a.tasbih[k]} onChange={(e) => { const s = BUNDLED.find((x) => x.id === e.target.value); if (s && locked(s)) { needPlus(); return } set({ tasbih: { ...a.tasbih, [k]: e.target.value } }) }}>
                    <option value="">بلا صوت</option>
                    {BUNDLED.filter((s) => s.cat === 'tasbih' || (k !== 'click' && s.cat === 'tones')).map((s) => <option key={s.id} value={s.id}>{s.name}{s.plus && !plus.entitled ? ' — بلس' : ''}</option>)}
                  </select></label>
              ))}
              <p className="small muted" style={{ margin: 0 }}>العبارة الصوتية عند الإكمال تحتاج تسجيلًا بشريًا مرخّصًا (انظر «التذكير البشري»).</p>
            </div>
          </section>
        )}

        <section className="card" aria-labelledby="as-set">
          <h2 id="as-set">التخصيص</h2>
          <div className="stack" style={{ gap: 10 }}>
            <label className="check switch"><input type="checkbox" className="switch-input" checked={a.muteAll} onChange={(e) => set({ muteAll: e.target.checked })} /> {a.muteAll ? <VolumeX size={16} /> : <Volume2 size={16} />} إيقاف جميع أصوات الاستوديو والسبحة</label>
            <label className="field"><span>مستوى الصوت: {a.volume}٪</span><input type="range" min={0} max={100} step={5} value={a.volume} onChange={(e) => set({ volume: Number(e.target.value) })} aria-label="مستوى الصوت" /></label>
            <label className="field"><span>التشغيل في المشغل</span>
              <select className="select" value={a.repeat} onChange={(e) => set({ repeat: e.target.value as 'once' | 'loop' })}><option value="once">مرة واحدة</option><option value="loop">تكرار</option></select></label>
            <label className="field"><span>النغمة الافتراضية لكل التذكيرات</span>
              <select className="select" value={a.defaultTone} onChange={(e) => set({ defaultTone: e.target.value })}>{(plus.entitled ? tones : freeTones).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <h3 style={{ margin: '6px 0 0' }}>{plus.entitled ? <Crown size={16} /> : <Lock size={16} />} صوت كل مناسبة</h3>
            {(['morning', 'evening', 'sleep'] as const).map((slot) => (
              <label key={slot} className="field"><span>تذكير {GROUP_TITLES[slot]}</span>
                <select className="select" value={slotTone(slot)} onChange={(e) => setSlotTone(slot, e.target.value)}>
                  <option value="">كما في «التذكيرات» (حصن المسلم أو صوت الهاتف أو تسجيلك)</option>
                  {tones.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></label>
            ))}
            <label className="field"><span>التذكير بالصلاة على النبي ﷺ («رفيقي يذكّرني»)</span>
              <select className="select" value={a.occasions.salawat} onChange={(e) => { if (!plus.entitled) { needPlus(); return } set({ occasions: { ...a.occasions, salawat: e.target.value } }) }}>
                <option value="">النغمة الافتراضية</option>{tones.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></label>
            <label className="field"><span>صوت إتمام الأذكار</span>
              <select className="select" value={a.occasions.adhkarDone} onChange={(e) => set({ occasions: { ...a.occasions, adhkarDone: e.target.value } })}>
                <option value="">بلا صوت</option>{BUNDLED.filter((s) => s.cat !== 'nature' && (!s.plus || plus.entitled)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></label>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => { update({ audioStudio: DEFAULT_AUDIO_STUDIO }); toast('عادت أصوات الاستوديو إلى الافتراضي') }}>الإعدادات الافتراضية</button>
              <Link className="btn btn-sm" to="/reminders">أوقات التذكيرات</Link>
            </div>
            <p className="small muted" style={{ margin: 0 }}>على Android تصل النغمة مع الإشعار حتى والتطبيق مغلق، وتحترم الصامت وعدم الإزعاج. التسجيلات الطويلة لا تُشغَّل تلقائيًا في الخلفية: يفتحها الضغط على الإشعار داخل التطبيق.</p>
          </div>
        </section>

        <DownloadsSection />
      </div>
      <MiniPlayer />
    </div>
  )
}

function HumanSection() {
  const [recs, setRecs] = useState<Record<string, DhikrRecording | null>>({})
  const [adding, setAdding] = useState<string | null>(null)
  const ids = [...HUMAN_PHRASES, ...SINGLE_DHIKR].map((x) => x.id)
  const reload = () => Promise.all(ids.map((id) => getRecording(id).catch(() => null))).then((r) => setRecs(Object.fromEntries(ids.map((id, i) => [id, r[i]]))))
  useEffect(() => { void reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const speak = (t: string) => { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ar'; u.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch { toast('صوت الجهاز غير متاح') } }
  const playRec = (id: string, title: string) => { const r = recs[id]; if (r) void playList([{ id, title, url: URL.createObjectURL(r.blob) }]) }
  const row = (x: { id: string; text: string }) => (
    <div key={x.id} className="as-sound">
      <div className="as-info"><strong>{x.text}</strong>
        <small className="muted">{recs[x.id] ? `تسجيل: ${recs[x.id]!.reciter} — ${recs[x.id]!.license}` : 'بانتظار تسجيل بشري مرخّص'}</small></div>
      <div className="row" style={{ gap: 4 }}>
        {recs[x.id] && <button type="button" className="btn btn-sm" onClick={() => playRec(x.id, x.text)}><Play size={13} /> التسجيل</button>}
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => speak(x.text)} title="نطق آلي من جوالك وليس صوتًا بشريًا">صوت الجهاز (آلي)</button>
        <button type="button" className="btn btn-sm" onClick={() => setAdding(x.id)}><Mic size={13} /> {recs[x.id] ? 'تغيير' : 'أضف تسجيلًا'}</button>
      </div>
      {adding === x.id && <AddRecording id={x.id} onDone={() => { setAdding(null); void reload() }} />}
    </div>
  )
  return (
    <section className="card" aria-label="التذكير البشري">
      <h2>التذكير البشري</h2>
      <div className="alert alert-gold small">لا توجد بعد تسجيلات بشرية مرخّصة لهذه العبارات. لن أضع صوتًا آليًا على أنه صوت إنسان: أضف تسجيلًا تملك حق استخدامه (اسم المؤدي والمصدر والإذن)، أو استمع بصوت الجهاز الآلي مع التصريح بأنه آلي. حين تصل تسجيلات مرخّصة لأصوات رجالية تُضاف هنا للجميع.</div>
      <h3>عبارات التذكير</h3>
      <div className="as-list">{HUMAN_PHRASES.map(row)}</div>
      <h3>الأذكار المفردة</h3>
      <p className="small muted">«حصن المسلم» لا يحوي تسجيلًا مستقلًا لهذه الكلمات وحدها؛ تسجيلاته للأذكار الكاملة في «تلاوات الأذكار».</p>
      <div className="as-list">{SINGLE_DHIKR.map(row)}</div>
    </section>
  )
}

function AddRecording({ id, onDone }: { id: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [m, setM] = useState({ reciter: '', source: '', license: '', rights: false })
  const save = async () => {
    if (!file) { toast('اختر ملفًا صوتيًا'); return }
    const err = validateRecording(file, m); if (err) { toast(err); return }
    await saveRecording({ itemId: id, blob: file, reciter: m.reciter.trim(), source: m.source.trim(), license: m.license.trim(), addedAt: Date.now() })
    toast('حُفظ التسجيل على جهازك'); onDone()
  }
  return (
    <div className="as-add stack" style={{ gap: 6 }}>
      <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="ملف التسجيل" />
      <input className="input" placeholder="اسم المؤدي" value={m.reciter} onChange={(e) => setM({ ...m, reciter: e.target.value })} />
      <input className="input" placeholder="مصدر التسجيل" value={m.source} onChange={(e) => setM({ ...m, source: e.target.value })} />
      <input className="input" placeholder="الترخيص أو الإذن" value={m.license} onChange={(e) => setM({ ...m, license: e.target.value })} />
      <label className="check"><input type="checkbox" checked={m.rights} onChange={(e) => setM({ ...m, rights: e.target.checked })} /> أؤكد أنني أملك حق استخدام هذا التسجيل</label>
      <div className="row"><button type="button" className="btn btn-sm btn-primary" onClick={save}>حفظ</button><button type="button" className="btn btn-sm btn-ghost" onClick={onDone}><X size={13} /> إلغاء</button></div>
    </div>
  )
}

function DhikrSection({ a, set, playing }: { a: AudioStudioSettings; set: (p: Partial<AudioStudioSettings>) => void; playing: ReturnType<typeof playerState> }) {
  const { settings } = useSettings()
  const [g, setG] = useState<DhikrGroup>('morning')
  const recs = useMemo(() => hisnRecordings(g), [g])
  const quran = useMemo(() => quranItems(g), [g])
  const reciter = a.reciters[g] ?? settings.reciterId
  const playAll = () => {
    const list = recs.map((r) => ({ id: r.id, title: r.name, url: r.url! }))
    void playList(list).catch(() => toast('تعذر التشغيل — تحقق من الاتصال'))
    if (a.natureMode === 'with') { const n = BUNDLED.find((s) => s.id === a.nature); if (n) bed(n) }
  }
  return (
    <section className="card" aria-label="تلاوات الأذكار">
      <h2>تلاوات الأذكار</h2>
      <div className="chips" role="tablist">{GROUPS.map((x) => <button key={x} type="button" role="tab" aria-selected={g === x} className={'chip' + (g === x ? ' active' : '')} onClick={() => setG(x)}>{GROUP_TITLES[x]}</button>)}</div>
      <p className="small muted">{HISN_AUDIO_CREDIT}. كل ذكر تسجيل مستقل مطابق لنصه في التطبيق؛ الأذكار التي يختلف نصها عن التسجيل لا تُربط به.</p>
      <div className="row"><button type="button" className="btn btn-primary btn-sm" onClick={playAll}><Play size={14} /> {GROUP_TITLES[g]} كاملة ({recs.length})</button>
        <button type="button" className="btn btn-sm" onClick={() => void downloadAll(recs.map((r) => r.url!))}><Download size={14} /> تنزيل المجموعة</button></div>
      <div className="as-list">{recs.map((r) => <RecordingRow key={r.id} s={r} active={playing.id === r.id && playing.playing} />)}</div>
      {quran.length > 0 && (
        <>
          <h3>الآيات في {GROUP_TITLES[g]}</h3>
          <label className="field"><span>قارئ الآيات لهذه المجموعة</span>
            <select className="select" value={reciter} onChange={(e) => set({ reciters: { ...a.reciters, [g]: e.target.value } })}>{RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <div className="as-list">{quran.map((q) => (
            <div key={q.id} className="as-sound">
              <button type="button" className="as-play" aria-label={`استمع: ${q.label}`} onClick={() => void playList(ayahUrls(reciter, q.ranges).map((u, i) => ({ id: `${q.id}-${i}`, title: `${q.label} — ${reciterById(reciter).name}`, url: u }))).catch(() => toast('تعذر التشغيل'))}><Play size={16} /></button>
              <div className="as-info"><strong>{q.label}</strong><small className="muted">بصوت {reciterById(reciter).name}</small></div>
              <button type="button" className="btn btn-sm btn-ghost" aria-label="تنزيل" onClick={() => void downloadAll(ayahUrls(reciter, q.ranges))}><Download size={14} /></button>
            </div>
          ))}</div>
        </>
      )}
      <h3>القرّاء</h3>
      <div className="as-readers">
        <div className="as-reader"><span className="as-avatar">ح</span><div><strong>مشروع حصن المسلم</strong><small className="muted">تسجيلات الأذكار المسموعة ({hisnRecordings('morning').length + hisnRecordings('evening').length + hisnRecordings('sleep').length} تسجيلًا) — بإذن المشروع</small></div></div>
        {RECITERS.slice(0, 6).map((r) => <div key={r.id} className="as-reader"><span className="as-avatar">{r.name.slice(0, 1)}</span><div><strong>{r.name}</strong><small className="muted">آيات الأذكار من المصحف{settings.reciterId === r.id ? ' • القارئ الافتراضي' : ''}</small></div></div>)}
      </div>
      <p className="small muted">القارئ الافتراضي يُختار من <Link to="/listen">الاستماع</Link>، ولكل مجموعة قارئ خاص من القائمة أعلاه. لا تُضاف أسماء قرّاء دون تسجيلات حقيقية متاحة.</p>
    </section>
  )
}

let bedEl: HTMLAudioElement | null = null
function bed(s: StudioSound) {
  bedEl?.pause()
  bedEl = new Audio(bundledUrl(s)); bedEl.loop = true; bedEl.volume = 0.18; void bedEl.play().catch(() => {})
  const off = subscribePlayer(() => { if (!playerState().playing) { bedEl?.pause(); off() } })
}

function RecordingRow({ s, active }: { s: StudioSound; active: boolean }) {
  useDownloads()
  const d = dlState(s.url!)
  return (
    <div className={'as-sound' + (active ? ' on' : '')}>
      <button type="button" className="as-play" aria-label={(active ? 'إيقاف ' : 'استمع ') + s.name} onClick={() => (active ? stopPlayer(false) : void playSound(s).catch(() => toast('تعذر التشغيل — تحقق من الاتصال')))}>{active ? <Square size={16} /> : <Play size={16} />}</button>
      <div className="as-info"><strong>{s.name}</strong><small className="muted">{s.desc}</small>
        <small className="as-credit">{d.status === 'done' ? `محفوظ للعمل دون إنترنت • ${fmtBytes(d.bytes)}` : d.status === 'downloading' ? 'جارٍ التنزيل…' : d.status === 'queued' ? 'في الانتظار' : d.status === 'error' ? `تعذر: ${d.error}` : 'يُشغَّل من الإنترنت'}</small></div>
      {d.status === 'done'
        ? <button type="button" className="btn btn-sm btn-ghost" aria-label="حذف التسجيل" onClick={() => void removeDownload(s.url!)}><Trash2 size={14} /></button>
        : <button type="button" className="btn btn-sm btn-ghost" aria-label="تنزيل" disabled={d.status === 'downloading'} onClick={() => void downloadUrl(s.url!).catch(() => toast('تعذر التنزيل'))}><Download size={14} /></button>}
    </div>
  )
}

function DownloadsSection() {
  useDownloads()
  const urls = remoteUrls()
  const b = batchState()
  const done = urls.filter((u) => dlState(u).status === 'done')
  const total = done.reduce((n, u) => n + (dlState(u).bytes ?? 0), 0)
  const [est, setEst] = useState<number | null>(null)
  const measure = async () => { setEst(-1); let n = 0; for (const u of urls) n += (await remoteSize(u)) ?? 0; setEst(n) }
  return (
    <section className="card" aria-labelledby="as-dl">
      <h2 id="as-dl">التنزيلات والعمل دون إنترنت</h2>
      <p className="small">محفوظ: {done.length} من {urls.length} تسجيلًا • {fmtBytes(total)}{est != null && est >= 0 ? ` • حجم المكتبة كاملة نحو ${fmtBytes(est)}` : ''}</p>
      {b.total > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <div className="progress" role="progressbar" aria-label="تقدم التنزيل" aria-valuenow={b.done} aria-valuemax={b.total}><span style={{ width: `${(b.done / Math.max(1, b.total)) * 100}%` }} /></div>
          <small className="muted">{Math.round((b.done / Math.max(1, b.total)) * 100)}٪ — {b.done}/{b.total}{b.failed ? ` • تعذر ${b.failed}` : ''}{b.paused ? ' • متوقف مؤقتًا' : ''}</small>
        </div>
      )}
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        <button type="button" className="btn btn-sm btn-primary" disabled={b.running} onClick={() => void downloadAll(urls)}><Download size={14} /> تنزيل كل أصوات الأذكار</button>
        {b.running && <button type="button" className="btn btn-sm" onClick={pauseBatch}><Pause size={14} /> إيقاف مؤقت</button>}
        {b.paused && <button type="button" className="btn btn-sm" onClick={resumeBatch}><Play size={14} /> استكمال</button>}
        <button type="button" className="btn btn-sm" onClick={() => void measure()} disabled={est === -1}>{est === -1 ? 'جارٍ الحساب…' : 'احسب حجم المكتبة'}</button>
        {done.length > 0 && <button type="button" className="btn btn-sm btn-ghost" onClick={() => void Promise.all(done.map(removeDownload)).then(() => toast('حُذفت التسجيلات المحفوظة'))}><Trash2 size={14} /> حذف المحفوظ</button>}
      </div>
      <p className="small muted" style={{ margin: 0 }}>لا يُنزَّل شيء تلقائيًا دون طلبك. يُتحقق من كل ملف (رأس MP3 وحجمه) قبل حفظه. النغمات وأصوات السبحة والطبيعة مضمّنة في التطبيق وتعمل دون إنترنت.</p>
    </section>
  )
}

function MiniPlayer() {
  const p = usePlayer()
  if (!p.id) return null
  const pct = p.dur ? (p.pos / p.dur) * 100 : 0
  const mm = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
  return (
    <div className="as-mini" role="region" aria-label="مشغل الاستوديو">
      <button type="button" className="as-play" onClick={togglePlay} aria-label={p.playing ? 'إيقاف مؤقت' : 'تشغيل'}>{p.playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <div className="as-mini-mid">
        <strong>{p.title}{p.queue > 1 ? ` (${p.index + 1}/${p.queue})` : ''}</strong>
        <input type="range" min={0} max={p.dur || 1} step={0.1} value={p.pos} onChange={(e) => seek(Number(e.target.value))} aria-label="شريط التقدم" style={{ ['--pct' as string]: `${pct}%` }} />
        <small dir="ltr">{mm(p.pos)} / {mm(p.dur || 0)}</small>
      </div>
      <button type="button" className={'btn btn-sm btn-ghost' + (p.loop ? ' on' : '')} onClick={() => setLoop(!p.loop)} aria-pressed={p.loop} aria-label="تكرار"><Repeat size={16} /></button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => stopPlayer(true)} aria-label="إيقاف"><Square size={16} /></button>
    </div>
  )
}
