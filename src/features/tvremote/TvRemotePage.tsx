// «التحكم بالتلفاز» (رفيق بلس): إيجاد شاشة رفيق المسلم على الشبكة المنزلية، والربط برمز، ثم تغيير مشاهدها
// وإعداداتها وإيقاف الأذان من الجوال. الإعدادات تُقرأ من التلفاز نفسه وتُحفظ هناك.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerUpLeft, ImagePlus, MonitorSmartphone, RefreshCw, Search, Trash2, Tv, Volume1, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react'
import { PageHead, Spinner } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { useLive, toast } from '../../hooks'
import { discoverTvs, tvLinkSupported, tvRequest, type FoundTv } from '../../platform/tvlink'
import {
  addTvBackground, getTvSettings, latestTvRelease, updateTv, UPDATE_STATE_LABEL, type TvRelease, type TvVersion, listTvBackgrounds, loadTvs, pairTv, parseAddress, pingTv, prepareBackground, removeTv, removeTvBackground, setTvSettings, tvAction, unpairTv, updateTvAddress,
  MAX_TV_BACKGROUNDS, TvRemoteError, type PairedTv, type TvActionName, type TvBackground, type TvSettingsView,
} from '../../services/tvRemote'
import { SCENES } from '../../tv/scenes'
import { RECITE_MODES, TV_RECITERS } from '../../tv/recite'
import { reciterById } from '../../content/reciters'

const send = tvRequest
const errMsg = (e: unknown) => (e instanceof TvRemoteError ? e.message : 'تعذر تنفيذ الطلب')

function Chips<T extends string | number>({ value, options, onPick, label, disabled }: { value: T | undefined; options: { id: T; label: string }[]; onPick: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" role="radio" aria-checked={value === o.id} disabled={disabled} className={'chip' + (value === o.id ? ' active' : '')} onClick={() => onPick(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

function Switch({ on, label, onChange, disabled }: { on: boolean | undefined; label: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <label className="check"><input type="checkbox" className="switch-input" role="switch" checked={!!on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
}

/** إضافة تلفاز: بحث تلقائي أو عنوان يدوي، ثم الرمز الظاهر على الشاشة */
function AddTv({ onDone }: { onDone: (tv: PairedTv) => void }) {
  const [found, setFound] = useState<FoundTv[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [target, setTarget] = useState<{ host: string; port: number; name: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const scan = async () => {
    setScanning(true)
    try { setFound(await discoverTvs(4500)) } catch { setFound([]) }
    setScanning(false)
  }
  useEffect(() => { scan() }, [])
  const pair = async () => {
    if (!target) return
    setBusy(true)
    try {
      const tv = await pairTv(send, target.host, target.port, code, 'رفيق المسلم بلس — جوالي')
      toast(`رُبط الجوال بـ «${tv.name}»`)
      onDone(tv)
    } catch (e) { toast(errMsg(e)) }
    setBusy(false)
  }
  if (target) {
    return (
      <section className="card">
        <h2>الربط مع {target.name}</h2>
        <ol className="small" style={{ paddingInlineStart: '1.2rem', lineHeight: 1.9 }}>
          <li>في التلفاز افتح: الإعدادات ← 📱 التحكم من الجوال ← «ربط جوال جديد».</li>
          <li>اكتب هنا الرمز المكوّن من 6 أرقام الظاهر على الشاشة.</li>
        </ol>
        <input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} dir="ltr" style={{ fontSize: '1.6rem', letterSpacing: '0.3em', textAlign: 'center', maxWidth: 260 }}
          value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} aria-label="رمز الربط" placeholder="000 000" />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btn-primary" disabled={busy || code.replace(/\D/g, '').length !== 6} onClick={pair}>{busy ? 'جارٍ الربط…' : 'ربط'}</button>
          <button className="btn" onClick={() => { setTarget(null); setCode('') }}>رجوع</button>
        </div>
        <p className="small muted">الرمز لا يُرسل عبر الشبكة: يُشتق منه مفتاح تشفير على الجهازين فقط.</p>
      </section>
    )
  }
  return (
    <section className="card">
      <div className="spread">
        <h2 style={{ margin: 0 }}>إضافة تلفاز</h2>
        <button className="btn btn-sm" onClick={scan} disabled={scanning}><Search size={14} /> {scanning ? 'يبحث…' : 'بحث مجددًا'}</button>
      </div>
      <p className="small muted">يجب أن يكون الجوال والتلفاز على شبكة الواي فاي نفسها، وتطبيق «رفيق المسلم» للتلفاز مثبتًا عليه (Android TV).</p>
      {scanning && <Spinner label="البحث عن التلفاز في الشبكة" />}
      {found && !scanning && (found.length ? (
        <ul className="plain stack" style={{ gap: 6 }}>
          {found.map((f) => (
            <li key={`${f.host}:${f.port}`}>
              <button className="list-card" style={{ width: '100%' }} onClick={() => setTarget({ host: f.host, port: f.port, name: f.name })}>
                <span className="icon-chip"><Tv size={20} /></span><span className="lc-body"><strong>{f.name}</strong><small dir="ltr">{f.host}:{f.port}</small></span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="small">لم يُعثر على تلفاز تلقائيًا. أدخل عنوانه الظاهر في صفحة «التحكم من الجوال» على التلفاز:</p>)}
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input" dir="ltr" inputMode="decimal" placeholder="192.168.1.20" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="عنوان التلفاز" style={{ maxWidth: 220 }} />
        <button className="btn btn-sm" onClick={async () => {
          const a = parseAddress(manual)
          if (!a) { toast('اكتب عنوانًا من الشبكة المنزلية مثل 192.168.1.20'); return }
          const info = await pingTv(send, a.host, a.port)
          if (!info) { toast('لا يرد تلفاز على هذا العنوان'); return }
          setTarget({ ...a, name: info.name })
        }}>متابعة</button>
      </div>
    </section>
  )
}

const fmtDay = (t: number) => new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(t))

/** «خلفيات من صورك»: صور من معرض الجوال تُصغَّر وتُرسل إلى التلفاز لتكون خلفية الشاشة */
function TvPhotos({ tv, showing, onShow, disabled }: { tv: PairedTv; showing: boolean; onShow: () => void; disabled: boolean }) {
  const [list, setList] = useState<TvBackground[] | null>(null)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const load = useCallback(async () => {
    try { setList(await listTvBackgrounds(send, tv)); setErr('') } catch (e) { setErr(errMsg(e)) }
  }, [tv])
  useEffect(() => { if (!disabled) load() }, [load, disabled])
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_TV_BACKGROUNDS - (list?.length ?? 0)
    const pick = [...files].slice(0, Math.max(0, room))
    if (!pick.length) { toast(errMsg(new TvRemoteError('too_many', 'too_many'))); return }
    let done = 0
    for (const f of pick) {
      setProgress(`جارٍ إرسال الصورة ${done + 1} من ${pick.length}…`)
      try { setList(await addTvBackground(send, tv, await prepareBackground(f))); done++ } catch (e) { toast(e instanceof TvRemoteError ? e.message : 'تعذر إرسال الصورة'); break }
    }
    setProgress(null)
    if (input.current) input.current.value = ''
    if (done) toast(done === 1 ? 'وصلت الصورة إلى التلفاز' : `وصلت ${done} صور إلى التلفاز`)
    if (files.length > pick.length) toast(`أُرسلت ${pick.length} فقط: الحد ${MAX_TV_BACKGROUNDS} صورة على التلفاز`)
  }
  const del = async (id: string) => {
    try { setList(await removeTvBackground(send, tv, id)); toast('حُذفت الصورة من التلفاز') } catch (e) { toast(errMsg(e)) }
  }
  return (
    <section className="card stack" style={{ gap: 10 }} aria-label="خلفيات من صورك">
      <h2 style={{ margin: 0 }}><ImagePlus size={18} /> خلفيات من صورك</h2>
      <p className="small muted" style={{ margin: 0 }}>اختر صورًا من جوالك لتكون خلفية شاشة المواقيت على التلفاز، وتتبدل بتلاشٍ ناعم. تُصغَّر الصورة قبل الإرسال، وتُحفظ على التلفاز فقط ولا تُرفع إلى أي خادم.</p>
      {err ? <p className="small" role="alert" style={{ margin: 0 }}>{err}</p> : list === null ? <Spinner label="جارٍ قراءة صور التلفاز" /> : (
        <>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} aria-label="اختيار صور" />
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-primary" disabled={disabled || !!progress || list.length >= MAX_TV_BACKGROUNDS} onClick={() => input.current?.click()}><ImagePlus size={14} /> إضافة صور</button>
            <button className="btn btn-sm" disabled={disabled || !list.length || showing} onClick={onShow}>{showing ? '✓ صورك معروضة الآن' : 'اعرض صوري على الشاشة'}</button>
          </div>
          {progress && <p className="small" role="status" style={{ margin: 0 }}>{progress}</p>}
          <p className="small muted" style={{ margin: 0 }}>{list.length ? `${list.length} من ${MAX_TV_BACKGROUNDS} صور على التلفاز` : 'لا صور على التلفاز بعد.'}</p>
          {list.length > 0 && (
            <ul className="plain stack" style={{ gap: 4 }}>
              {list.map((b, i) => (
                <li key={b.id} className="spread small">
                  <span>صورة {i + 1} • {fmtDay(b.at)} • {Math.max(1, Math.round(b.size / 1024))} ك.ب</span>
                  <button className="btn btn-ghost btn-sm icon-btn" aria-label={`حذف الصورة ${i + 1}`} disabled={disabled} onClick={() => del(b.id)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

/** تحديث تطبيق الشاشة من الجوال: يقارن إصدار التلفاز بأحدث إصدار منشور، ويطلب من التلفاز التنزيل والتثبيت */
function TvUpdateCard({ tv }: { tv: PairedTv }) {
  const [ver, setVer] = useState<TvVersion | null | undefined>(undefined)
  const [rel, setRel] = useState<TvRelease | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const check = useCallback(async () => {
    const [info, latest] = await Promise.all([pingTv(send, tv.host, tv.port), latestTvRelease()])
    setVer(info?.version ?? null); setRel(latest)
  }, [tv])
  useEffect(() => { check() }, [check])
  // متابعة الحالة أثناء التنزيل والتثبيت
  const st = ver?.update
  useEffect(() => {
    if (!st || !(st.startsWith('downloading') || st === 'installing')) return
    const t = setInterval(async () => { const info = await pingTv(send, tv.host, tv.port); if (info?.version) setVer(info.version) }, 2000)
    return () => clearInterval(t)
  }, [st, tv])
  const run = async () => {
    if (!rel) return
    setBusy(true)
    try { setVer((await updateTv(send, tv, rel.url)) ?? ver ?? null); toast('بدأ تنزيل التحديث على التلفاز') } catch (e) { toast(errMsg(e)) }
    setBusy(false)
  }
  if (ver === undefined || rel === undefined) return null
  if (!ver) return <section className="card small muted">تطبيق الشاشة على هذا التلفاز قديم ولا يدعم التحديث من الجوال: ثبّت أحدث نسخة عليه يدويًا مرة واحدة، وبعدها تحدّثه من هنا.</section>
  const outdated = !!rel && rel.build > ver.code
  return (
    <section className="card stack" style={{ gap: 8 }} aria-label="تحديث تطبيق الشاشة">
      <h2 style={{ margin: 0 }}><RefreshCw size={18} /> تحديث تطبيق الشاشة</h2>
      <p className="small muted" style={{ margin: 0 }}>على التلفاز: الإصدار {ver.code}{rel ? ` — أحدث إصدار: ${rel.build}` : ' — تعذر معرفة أحدث إصدار الآن (يحتاج إنترنت)'}</p>
      {UPDATE_STATE_LABEL(st) && <p className="alert alert-gold small" role="status" style={{ margin: 0 }}>{UPDATE_STATE_LABEL(st)}</p>}
      {outdated
        ? <button className="btn btn-primary" disabled={busy || st?.startsWith('downloading') || st === 'installing'} onClick={run}>تحديث تطبيق الشاشة الآن</button>
        : rel && <p className="small" style={{ margin: 0 }}>تطبيق الشاشة محدّث ✓</p>}
      <p className="small muted" style={{ margin: 0 }}>يُنزَّل التحديث على التلفاز مباشرة من إصدارات التطبيق، ثم يطلب التلفاز موافقتك على التثبيت بجهاز التحكم (لا يسمح Android بالتثبيت دون موافقة).</p>
    </section>
  )
}

/** جهاز تحكم على الجوال: أسهم وموافق ورجوع داخل شاشة رفيق المسلم، ومستوى صوت التلفاز */
function RemotePad({ tv, disabled }: { tv: PairedTv; disabled: boolean }) {
  const [busy, setBusy] = useState(false)
  const press = async (a: TvActionName) => {
    if (busy) return
    setBusy(true)
    try {
      try { navigator.vibrate?.(15) } catch { /* لا شيء */ }
      if (!(await tvAction(send, tv, a)) && a.startsWith('key_')) toast('افتح شاشة رفيق المسلم على التلفاز أولًا (زر «اعرض الشاشة»)')
    } catch (e) { toast(errMsg(e)) }
    setBusy(false)
  }
  const k = (a: TvActionName, label: string, children: ReactNode, cls = '') => (
    <button type="button" className={'tv-pad-btn ' + cls} aria-label={label} disabled={disabled} onClick={() => press(a)}>{children}</button>
  )
  return (
    <section className="card stack" style={{ gap: 10 }} aria-label="جهاز التحكم">
      <h2 style={{ margin: 0 }}>جهاز التحكم</h2>
      <div className="tv-pad" dir="ltr">
        <span />{k('key_up', 'أعلى', <><ArrowUp size={22} /></>)}<span />
        {k('key_left', 'يسار', <><ArrowLeft size={22} /></>)}{k('key_ok', 'موافق', 'موافق', 'ok')}{k('key_right', 'يمين', <><ArrowRight size={22} /></>)}
        {k('key_back', 'رجوع', <><CornerUpLeft size={20} /></>)}{k('key_down', 'أسفل', <><ArrowDown size={22} /></>)}<span />
      </div>
      <div className="tv-pad-vol" dir="ltr">
        {k('vol_down', 'خفض الصوت', <><Volume1 size={20} /></>)}
        {k('vol_mute', 'كتم الصوت', <><VolumeX size={20} /></>)}
        {k('vol_up', 'رفع الصوت', <><Volume2 size={20} /></>)}
      </div>
      <p className="small muted" style={{ margin: 0 }}>الأسهم وموافق ورجوع تتحكم في شاشة رفيق المسلم وقوائمها وهي ظاهرة على التلفاز. أزرار الصوت تغيّر صوت التلفاز كله. لا يسمح نظام Android لتطبيق بالتحكم في التطبيقات الأخرى أو تشغيل التلفاز وإطفائه.</p>
    </section>
  )
}

function Controls({ tv, onRemoved }: { tv: PairedTv; onRemoved: () => void }) {
  const [st, setSt] = useState<TvSettingsView | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try { setSt(await getTvSettings(send, tv)); setOnline(true) } catch (e) {
      // ربما تغير عنوان التلفاز: نبحث عنه بمعرّفه
      if (e instanceof TvRemoteError && e.code === 'unreachable') {
        const list = await discoverTvs(3500).catch(() => [] as FoundTv[])
        for (const f of list) {
          const info = await pingTv(send, f.host, f.port)
          if (info?.tvId === tv.tvId) { await updateTvAddress(tv.tvId, f.host, f.port); return }
        }
      } else toast(errMsg(e))
      setOnline(false)
    }
  }, [tv])
  useEffect(() => { load() }, [load])
  const set = async (patch: Partial<TvSettingsView>) => {
    setBusy(true)
    try { setSt(await setTvSettings(send, tv, patch)); setOnline(true) } catch (e) { toast(errMsg(e)); if (e instanceof TvRemoteError && e.code === 'unreachable') setOnline(false) }
    setBusy(false)
  }
  const act = async (a: 'stop_adhan' | 'open_screen' | 'next_scene', ok: string) => {
    try { toast((await tvAction(send, tv, a)) ? ok : 'لم يُنفَّذ (الشاشة غير ظاهرة على التلفاز)') } catch (e) { toast(errMsg(e)) }
  }
  const mode = st?.scene === 'rotate' || st?.scene === 'classic' || st?.scene === 'photos' ? st.scene : 'one'
  return (
    <>
      <section className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}><Tv size={18} /> {tv.name}</h2>
          <span className="small row" style={{ gap: 4 }}>{online === null ? <Spinner label="" /> : online ? <><Wifi size={14} color="var(--success)" /> متصل</> : <><WifiOff size={14} /> غير متصل</>}</span>
        </div>
        {st?.city && <p className="small muted" style={{ margin: '4px 0 0' }}>المدينة على التلفاز: {st.city}</p>}
        {online === false && (
          <div className="alert alert-gold small" style={{ marginTop: 8 }}>
            لا يرد التلفاز. تأكد أنه يعمل وعلى شبكة الواي فاي نفسها.
            <div className="row" style={{ marginTop: 6 }}><button className="btn btn-sm" onClick={() => { setOnline(null); load() }}><RefreshCw size={14} /> إعادة المحاولة</button></div>
          </div>
        )}
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-primary" disabled={!online} onClick={() => act('stop_adhan', 'أُوقف صوت الأذان')}>إيقاف الأذان الآن</button>
          <button className="btn btn-sm" disabled={!online} onClick={() => act('open_screen', 'فُتحت شاشة المواقيت على التلفاز')}>اعرض الشاشة</button>
          <button className="btn btn-sm" disabled={!online || (st?.scene !== 'rotate' && st?.scene !== 'photos')} onClick={() => act('next_scene', 'انتقل إلى المشهد التالي')}>المشهد التالي</button>
        </div>
      </section>
      <RemotePad tv={tv} disabled={!online} />
      {online && <TvUpdateCard tv={tv} />}
      {st && (
        <>
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ margin: 0 }}>المشاهد</h2>
            <Chips label="طريقة العرض" value={mode} disabled={busy} onPick={(v) => set({ scene: v === 'one' ? (SCENES.some((x) => x.id === st.scene) ? st.scene : SCENES[0].id) : v })}
              options={[{ id: 'rotate', label: 'تنقل بين المشاهد' }, { id: 'one', label: 'مشهد واحد' }, { id: 'classic', label: 'الرسم الأصلي' }, { id: 'photos', label: 'صوري' }]} />
            {mode === 'one' && <Chips label="المشهد" value={st.scene} disabled={busy} onPick={(v) => set({ scene: v })} options={SCENES.map((x) => ({ id: x.id, label: x.name }))} />}
            {mode === 'photos' && (
              <>
                <Chips label="مدة كل صورة" value={st.rotateMin} disabled={busy} onPick={(v) => set({ rotateMin: v })} options={[5, 10].map((m) => ({ id: m, label: `${m} د` }))} />
                <Switch on={st.shuffle} disabled={busy} label="ترتيب عشوائي" onChange={(v) => set({ shuffle: v })} />
              </>
            )}
            {mode === 'rotate' && (
              <>
                <div className="small muted">المشاهد في التنقل (اتركها كلها بلا اختيار لعرض الجميع):</div>
                <div className="chips">
                  {SCENES.map((x) => {
                    const on = (st.playlist ?? []).includes(x.id)
                    return <button key={x.id} type="button" aria-pressed={on} disabled={busy} className={'chip' + (on ? ' active' : '')} onClick={() => set({ playlist: on ? (st.playlist ?? []).filter((y) => y !== x.id) : [...(st.playlist ?? []), x.id] })}>{x.name}</button>
                  })}
                </div>
                <Chips label="مدة كل مشهد" value={st.rotateMin} disabled={busy} onPick={(v) => set({ rotateMin: v })} options={[5, 10, 20, 30, 60].map((m) => ({ id: m, label: m === 60 ? 'ساعة' : `${m} د` }))} />
                <Switch on={st.shuffle} disabled={busy} label="ترتيب عشوائي" onChange={(v) => set({ shuffle: v })} />
              </>
            )}
            <Chips label="الجودة" value={st.quality} disabled={busy} onPick={(v) => set({ quality: v })} options={[{ id: 'auto', label: 'تلقائي' }, { id: 'eco', label: 'اقتصادي' }, { id: 'high', label: 'عالية (4K)' }]} />
            <Switch on={st.animate} disabled={busy} label="الحركة" onChange={(v) => set({ animate: v })} />
            <Switch on={st.phrases ?? true} disabled={busy} label="«عبارة اليوم» على الشاشة (تتغير كل يوم)" onChange={(v) => set({ phrases: v })} />
          </section>
          <TvPhotos tv={tv} showing={st.scene === 'photos'} disabled={!online} onShow={() => set({ scene: 'photos' })} />
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ margin: 0 }}>الشاشة والأذان</h2>
            <Switch on={st.adhan} disabled={busy} label="رفع الأذان عند دخول الوقت" onChange={(v) => set({ adhan: v })} />
            <div className="small muted">فتح الشاشة بعد عدم استخدام التلفاز:</div>
            <Chips label="مدة عدم الاستخدام" value={st.idleMinutes} disabled={busy} onPick={(v) => set({ idleMinutes: v })} options={[{ id: 5, label: '5 د' }, { id: 10, label: '10 د' }, { id: 15, label: '15 د' }, { id: 30, label: '30 د' }, { id: 0, label: 'إيقاف' }]} />
            <Switch on={st.autostart} disabled={busy} label="فتح الشاشة عند تشغيل التلفاز" onChange={(v) => set({ autostart: v })} />
            <Switch on={st.hour12} disabled={busy} label="نظام 12 ساعة" onChange={(v) => set({ hour12: v })} />
            <Chips label="التوقيت الصيفي/الشتوي" value={st.clockShift} disabled={busy} onPick={(v) => set({ clockShift: v })} options={[{ id: -60, label: 'تأخير ساعة' }, { id: 0, label: 'تلقائي' }, { id: 60, label: 'تقديم ساعة' }]} />
          </section>
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ margin: 0 }}>التلاوة</h2>
            <Switch on={st.reciteOn} disabled={busy} label="تشغيل التلاوة على الشاشة" onChange={(v) => set({ reciteOn: v })} />
            <label className="field"><span>مستوى الصوت ({Math.round((st.reciteVolume ?? 0.5) * 100)}%)</span>
              <input type="range" min={0} max={1} step={0.1} value={st.reciteVolume ?? 0.5} disabled={busy} onChange={(e) => setSt({ ...st, reciteVolume: Number(e.target.value) })} onPointerUp={(e) => set({ reciteVolume: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => set({ reciteVolume: Number((e.target as HTMLInputElement).value) })} />
            </label>
            <Chips label="ما يُتلى" value={st.reciteMode} disabled={busy} onPick={(v) => set({ reciteMode: v })} options={RECITE_MODES.map((m) => ({ id: m.id, label: m.label }))} />
            <label className="field"><span>القارئ</span>
              <select className="input" value={st.reciterId ?? 'husary'} disabled={busy} onChange={(e) => set({ reciterId: e.target.value })}>
                {TV_RECITERS.map((id) => reciterById(id)).map((r) => <option key={r.id} value={r.id}>{r.name}{r.style.includes('مجود') ? ' (مجود)' : ''}</option>)}
              </select>
            </label>
            {st.reciteMode === 'adhkar' && (
              <Chips label="صوت الأذكار" value={st.adhkarVoice ?? 'human'} disabled={busy} onPick={(v) => set({ adhkarVoice: v })} options={[{ id: 'human', label: 'تسجيل بشري فقط' }, { id: 'mixed', label: 'بشري + صوت التلفاز' }]} />
            )}
            <p className="small muted" style={{ margin: 0 }}>المدينة وطريقة الحساب تُضبط من التلفاز نفسه. إن كان التلفاز بإصدار أقدم فحدّثه أولًا ليقبل اختيار القارئ من الجوال.</p>
          </section>
        </>
      )}
      <button className="btn btn-ghost" style={{ alignSelf: 'start' }} onClick={async () => { await unpairTv(send, tv); toast('أُلغي ربط هذا التلفاز'); onRemoved() }}><Trash2 size={14} /> إلغاء الربط</button>
    </>
  )
}

export function TvRemotePage() {
  const tvs = useLive(() => loadTvs(), ['kv:tvremote:tvs'], [] as PairedTv[])
  const [sel, setSel] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const current = tvs.find((t) => t.tvId === sel) ?? tvs[0] ?? null
  return (
    <div className="page">
      <PageHead title="التحكم بالتلفاز" subtitle="غيّر مشاهد شاشة رفيق المسلم على التلفاز وإعداداتها، وأوقف الأذان — من جوالك عبر شبكة البيت" />
      <PlusGate feature="tvremote" title="التحكم بالتلفاز">
        {!tvLinkSupported() ? (
          <section className="card"><MonitorSmartphone size={22} /> <p>هذه الميزة تعمل في تطبيق رفيق المسلم بلس على Android، مع تطبيق «شاشة رفيق المسلم» على تلفاز Android TV في الشبكة نفسها.</p></section>
        ) : (
          <div className="stack">
            {tvs.length > 1 && (
              <div className="chips" role="radiogroup" aria-label="التلفاز">
                {tvs.map((t) => <button key={t.tvId} role="radio" aria-checked={current?.tvId === t.tvId} className={'chip' + (current?.tvId === t.tvId ? ' active' : '')} onClick={() => { setSel(t.tvId); setAdding(false) }}>{t.name}</button>)}
              </div>
            )}
            {adding || !current
              ? <AddTv onDone={(tv) => { setSel(tv.tvId); setAdding(false) }} />
              : <Controls key={current.tvId} tv={current} onRemoved={() => { removeTv(current.tvId); setSel(null) }} />}
            {current && !adding && <button className="btn btn-sm" style={{ alignSelf: 'start' }} onClick={() => setAdding(true)}>+ ربط تلفاز آخر</button>}
            <p className="small muted">الأمان والخصوصية: الاتصال داخل شبكة البيت فقط، ولا يمر بأي خادم خارجي. كل أمر موقّع بمفتاح خاص بهذا الجوال، ويمكن إزالة الجوال من إعدادات التلفاز في أي وقت. لا يستطيع التطبيق تغيير إعدادات نظام التلفاز نفسه — فقط إعدادات شاشة رفيق المسلم.</p>
          </div>
        )}
      </PlusGate>
    </div>
  )
}
