// «التحكم بالتلفاز» (رفيق بلس): إيجاد شاشة رفيق المسلم على الشبكة المنزلية، والربط برمز، ثم تغيير مشاهدها
// وإعداداتها وإيقاف الأذان من الجوال. الإعدادات تُقرأ من التلفاز نفسه وتُحفظ هناك.
import { useCallback, useEffect, useState } from 'react'
import { MonitorSmartphone, RefreshCw, Search, Trash2, Tv, Wifi, WifiOff } from 'lucide-react'
import { PageHead, Spinner } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { useLive, toast } from '../../hooks'
import { discoverTvs, tvLinkSupported, tvRequest, type FoundTv } from '../../platform/tvlink'
import {
  getTvSettings, loadTvs, pairTv, parseAddress, pingTv, removeTv, setTvSettings, tvAction, unpairTv, updateTvAddress,
  TvRemoteError, type PairedTv, type TvSettingsView,
} from '../../services/tvRemote'
import { SCENES } from '../../tv/scenes'

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
      <p className="small muted">يجب أن يكون الجوال والتلفاز على شبكة الواي فاي نفسها، وتطبيق «شاشة رفيق المسلم» مثبتًا على التلفاز (Android TV).</p>
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
  const mode = st?.scene === 'rotate' || st?.scene === 'classic' ? st.scene : 'one'
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
          <button className="btn btn-sm" disabled={!online || st?.scene !== 'rotate'} onClick={() => act('next_scene', 'انتقل إلى المشهد التالي')}>المشهد التالي</button>
        </div>
      </section>
      {st && (
        <>
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ margin: 0 }}>المشاهد</h2>
            <Chips label="طريقة العرض" value={mode} disabled={busy} onPick={(v) => set({ scene: v === 'one' ? (SCENES.some((x) => x.id === st.scene) ? st.scene : SCENES[0].id) : v })}
              options={[{ id: 'rotate', label: 'تنقل بين المشاهد' }, { id: 'one', label: 'مشهد واحد' }, { id: 'classic', label: 'الرسم الأصلي' }]} />
            {mode === 'one' && <Chips label="المشهد" value={st.scene} disabled={busy} onPick={(v) => set({ scene: v })} options={SCENES.map((x) => ({ id: x.id, label: x.name }))} />}
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
          </section>
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
            <p className="small muted" style={{ margin: 0 }}>المدينة وطريقة الحساب والقارئ تُضبط من التلفاز نفسه.</p>
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
