import { useEffect, useRef, useState } from 'react'
import { Download, Pause, Play, Repeat, SkipBack, SkipForward, Square, Trash2, Volume2 } from 'lucide-react'
import { PageHead, ProgressBar, Spinner } from '../../components/Common'
import { toast, useLive, usePlayer, useQuran } from '../../hooks'
import { RECITERS, reciterById } from '../../content/reciters'
import { downloadSurah, isEmbeddedPreview, isSurahDownloaded, player, removeSurahDownload, type LastListen } from '../../services/audio'
import { kv } from '../../db/repos'
import { useSettings } from '../../state/SettingsContext'

export function ListenPage() {
  const { data } = useQuran()
  const { settings, update } = useSettings()
  const p = usePlayer()
  const [surah, setSurah] = useState(p.status !== 'idle' ? p.surah : 1)
  const [startAt, setStartAt] = useState(1)
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const last = useLive(() => kv.get<LastListen | null>('listen:last', null), ['kv:listen:last'], null)
  const downloaded = useLive(() => isSurahDownloaded(settings.reciterId, surah), ['kv:dl:'], false, [settings.reciterId, surah])

  useEffect(() => setStartAt(1), [surah])
  if (!data) return <Spinner />
  const s = data.meta.surahs[surah - 1]
  const rec = reciterById(settings.reciterId)
  const active = p.status !== 'idle'

  const play = (sur = surah, at = startAt) => {
    const info = data.meta.surahs[sur - 1]
    player.play({ reciterId: settings.reciterId, surah: sur, surahName: info.name, from: 1, to: info.count, startAt: at })
  }

  const download = async () => {
    abortRef.current = new AbortController()
    setDl({ done: 0, total: s.count })
    try {
      await downloadSurah(settings.reciterId, surah, s.count, (done, total) => setDl({ done, total }), abortRef.current.signal)
      toast('اكتمل التنزيل — السورة متاحة دون اتصال')
    } catch (e) {
      toast((e as Error).message || 'تعذر التنزيل')
    } finally {
      setDl(null)
    }
  }

  return (
    <>
      <PageHead title="الاستماع إلى القرآن" subtitle="تلاوات آية بآية من EveryAyah، مع Islamic Network مصدرًا بديلًا — تحتاج اتصالًا بالإنترنت ما لم تُنزَّل" />
      {isEmbeddedPreview() && <p className="alert alert-gold" role="note" style={{ marginBottom: '1rem' }}>أنت تفتح التطبيق داخل صفحة معاينة، وسياسة الأمان فيها تمنع تحميل الصوت من مواقع خارجية، لذلك لن تعمل التلاوات هنا. افتح ملف التطبيق في المتصفح مباشرة أو استخدم نسخة الجوال.</p>}
      <div className="grid grid-2">
        <section className="card stack">
          <label className="field"><span>القارئ</span>
            <select className="select" value={settings.reciterId} onChange={(e) => { update({ reciterId: e.target.value }); player.setReciter(e.target.value) }}>
              {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.style}</option>)}
            </select>
          </label>
          <label className="field"><span>السورة</span>
            <select className="select" value={surah} onChange={(e) => setSurah(Number(e.target.value))}>
              {data.meta.surahs.map((x) => <option key={x.n} value={x.n}>{x.n}. {x.name}</option>)}
            </select>
          </label>
          <label className="field"><span>البدء من الآية (1–{s.count})</span>
            <input className="input" type="number" min={1} max={s.count} value={startAt} onChange={(e) => setStartAt(Math.min(s.count, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          <div className="row">
            <button className="btn btn-primary" onClick={() => play()}><Play size={16} /> تشغيل سورة {s.name}</button>
            {last && !active && <button className="btn" onClick={() => { update({ reciterId: last.reciterId }); setSurah(last.surah); const info = data.meta.surahs[last.surah - 1]; player.play({ reciterId: last.reciterId, surah: last.surah, surahName: info.name, from: 1, to: info.count, startAt: last.ayah }) }}>متابعة آخر استماع: {data.meta.surahs[last.surah - 1].name} {last.ayah}</button>}
          </div>
          <hr className="divider" />
          <h3>الاستماع دون إنترنت</h3>
          <p className="small muted">تُحفظ ملفات السورة في ذاكرة المتصفح على جهازك للاستماع الشخصي فقط.</p>
          {dl ? (
            <div className="stack">
              <ProgressBar value={dl.done / dl.total} label="تقدم التنزيل" />
              <div className="spread small"><span>{dl.done} / {dl.total}</span><button className="btn btn-sm" onClick={() => abortRef.current?.abort()}>إلغاء</button></div>
            </div>
          ) : downloaded ? (
            <div className="row"><span className="badge badge-success">منزّلة لهذا القارئ</span>
              <button className="btn btn-sm btn-danger" onClick={async () => { await removeSurahDownload(settings.reciterId, surah, s.count); toast('حُذف التنزيل') }}><Trash2 size={14} /> حذف</button>
            </div>
          ) : (
            <button className="btn" onClick={download}><Download size={16} /> تنزيل سورة {s.name} ({s.count} ملفًا)</button>
          )}
        </section>

        <section className="card stack" aria-live="polite">
          <h2>المشغل</h2>
          {!active ? <p className="muted">لا يوجد تشغيل حاليًا.</p> : (
            <>
              <div>
                <strong>سورة {p.surahName}</strong> — {p.playingBasmala ? 'البسملة' : `الآية ${p.ayah} من ${p.to}`}
                <div className="muted small">{reciterById(p.reciterId).name} {p.status === 'loading' && '• جارٍ التحميل…'}</div>
              </div>
              {p.status === 'error' && <div className="alert alert-error small" role="alert">{p.error} <button className="btn btn-sm" onClick={() => player.retry()}>إعادة المحاولة</button></div>}
              <ProgressBar value={(p.ayah - p.from + 1) / (p.to - p.from + 1)} label="التقدم في السورة" />
              <div className="row">
                <button className="btn icon-btn" onClick={() => player.prev()} aria-label="الآية السابقة"><SkipForward size={18} /></button>
                <button className="btn btn-primary icon-btn" onClick={() => player.toggle()} aria-label={p.status === 'playing' ? 'إيقاف مؤقت' : 'تشغيل'}>{p.status === 'playing' ? <Pause size={18} /> : <Play size={18} />}</button>
                <button className="btn icon-btn" onClick={() => player.next()} aria-label="الآية التالية"><SkipBack size={18} /></button>
                <button className="btn icon-btn" onClick={() => player.stop()} aria-label="إيقاف"><Square size={16} /></button>
              </div>
              <label className="field"><span>الانتقال إلى آية</span>
                <select className="select" value={p.ayah} onChange={(e) => player.goTo(Number(e.target.value))}>
                  {Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i).map((a) => <option key={a} value={a}>الآية {a}</option>)}
                </select>
              </label>
              <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                <label className="field"><span><Repeat size={14} /> تكرار كل آية</span>
                  <select className="select" value={p.repeatEach} onChange={(e) => player.setRepeat(Number(e.target.value), p.repeatRange)}>
                    {[1, 2, 3, 5, 10, 20].map((n) => <option key={n} value={n}>{n === 1 ? 'بدون تكرار' : `${n} مرات`}</option>)}
                  </select>
                </label>
                <label className="field"><span>السرعة</span>
                  <select className="select" value={p.rate} onChange={(e) => player.setRate(Number(e.target.value))}>
                    {[0.75, 0.9, 1, 1.1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
                  </select>
                </label>
              </div>
              <label className="check"><input type="checkbox" checked={p.repeatRange} onChange={(e) => player.setRepeat(p.repeatEach, e.target.checked)} /> تكرار السورة كاملة عند انتهائها</label>
              <label className="field"><span><Volume2 size={14} /> مستوى الصوت</span>
                <input type="range" min={0} max={1} step={0.05} value={p.volume} onChange={(e) => player.setVolume(Number(e.target.value))} aria-label="مستوى الصوت" />
              </label>
            </>
          )}
          <p className="small muted">القارئ الحالي: {rec.name}. يستمر التشغيل عند الانتقال بين صفحات التطبيق، وقد يتوقف في الخلفية حسب سياسات المتصفح أو الهاتف.</p>
        </section>
      </div>
    </>
  )
}
