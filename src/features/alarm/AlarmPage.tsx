// «منبّه الصحوة»: منبهات بالوقت والأيام، تُوقظ بصوت «أصبحنا وأصبح الملك لله» أو الصلاة على النبي ﷺ
// بتسجيل «حصن المسلم»، مع نغمة قبله. يرنّ بمنبه النظام فوق شاشة القفل حتى يُوقف أو يؤجَّل (Android).
import { useEffect, useRef, useState } from 'react'
import { AlarmClock, Plus, Trash2, Play, Square } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { useSettings } from '../../state/SettingsContext'
import type { WakeAlarm, WakeVoice } from '../../state/settings'
import { HISN_AUDIO_CREDIT } from '../../content/hisnAudio'
import { toast } from '../../hooks'
import { openExactAlarmSettings, stopWakeAlarm, syncWakeAlarms, testWakeAlarm, wakeAlarmSupported, wakeStatus, type WakeStatus } from '../../platform/wakeAlarm'

const BASE = import.meta.env.BASE_URL
export const WAKE_VOICES: { id: WakeVoice; name: string; text: string; preview: string | null }[] = [
  { id: 'asbahna', name: 'أصبحنا وأصبح الملك لله', text: 'أصبحنا وأصبح الملك لله، والحمد لله', preview: 'https://www.hisnmuslim.com/audio/ar/77.mp3#t=0,6.9' },
  { id: 'salawat', name: 'الصلاة على النبي ﷺ', text: 'اللهم صل وسلم على نبينا محمد', preview: 'https://www.hisnmuslim.com/audio/ar/98.mp3' },
  { id: 'tone', name: 'نغمة فقط', text: 'النغمة المختارة وحدها', preview: null },
]
export const WAKE_TONES: { id: string; name: string; file: string | null }[] = [
  { id: 'rafiq_chime', name: 'نغمة رفيق المسلم', file: 'sounds/rafiq_chime.mp3' },
  { id: 'snd_t_morning', name: 'إشراقة الصباح', file: 'sounds/studio/t_morning.mp3' },
  { id: 'snd_t_gold', name: 'الذهبية', file: 'sounds/studio/t_gold.mp3' },
  { id: 'snd_t_drop', name: 'قطرة', file: 'sounds/studio/t_drop.mp3' },
  { id: 'snd_t_evening', name: 'هادئة', file: 'sounds/studio/t_evening.mp3' },
  { id: 'none', name: 'بلا نغمة', file: null },
]
const DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const SNOOZES = [5, 10, 15]

export function newAlarm(list: WakeAlarm[]): WakeAlarm {
  const id = list.reduce((m, a) => Math.max(m, a.id), 0) + 1
  return { id, on: true, h: 5, m: 30, days: [], voice: 'asbahna', tone: 'snd_t_morning', vibrate: true, snooze: 10 }
}

const pad = (n: number) => String(n).padStart(2, '0')
export function daysLabel(days: number[]): string {
  if (!days.length || days.length === 7) return 'كل يوم'
  const s = [...days].sort()
  if (s.join() === '0,1,2,3,4') return 'الأحد إلى الخميس'
  if (s.join() === '1,2,3,4,5') return 'الاثنين إلى الجمعة'
  if (s.join() === '5,6') return 'الجمعة والسبت'
  return s.map((d) => DAY_NAMES[d]).join('، ')
}
function time12(h: number, m: number) {
  const ap = h < 12 ? 'ص' : 'م'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${pad(m)} ${ap}`
}

export function AlarmPage() {
  const { settings, update } = useSettings()
  const list = settings.wakeAlarms ?? []
  const [status, setStatus] = useState<WakeStatus | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const native = wakeAlarmSupported()

  useEffect(() => { void wakeStatus().then(setStatus) }, [])
  useEffect(() => () => { audio.current?.pause() }, [])

  const save = async (next: WakeAlarm[]) => {
    update({ wakeAlarms: next })
    const st = await syncWakeAlarms(next)
    if (st) setStatus(st)
  }
  const patch = (id: number, p: Partial<WakeAlarm>) => save(list.map((a) => (a.id === id ? { ...a, ...p } : a)))
  const add = () => { const a = newAlarm(list); void save([...list, a]); setOpen(a.id) }
  const remove = (id: number) => { void save(list.filter((a) => a.id !== id)); if (open === id) setOpen(null) }

  const playUrl = (url: string, after?: () => void) => {
    audio.current?.pause()
    const el = new Audio(url)
    audio.current = el
    if (after) el.onended = after
    el.play().catch(() => toast('تعذر تشغيل الصوت'))
  }
  const preview = (a: WakeAlarm) => {
    const tone = WAKE_TONES.find((t) => t.id === a.tone)?.file
    const voice = WAKE_VOICES.find((v) => v.id === a.voice)?.preview
    const playVoice = voice ? () => playUrl(voice) : undefined
    if (tone) playUrl(BASE + tone, playVoice)
    else if (playVoice) playVoice()
  }
  const test = async (a: WakeAlarm) => {
    if (!native) { preview(a); return }
    toast((await testWakeAlarm(a)) ? 'يرنّ المنبه الآن — أوقفه من الشاشة أو الإشعار' : 'تعذر تشغيل المنبه')
  }

  const nextText = status && status.next > 0 ? new Date(status.next) : null

  return (
    <>
      <PageHead title="منبّه الصحوة" subtitle="استيقظ على «أصبحنا وأصبح الملك لله» أو الصلاة على النبي ﷺ بصوت جميل" />
      <div className="stack">
        {!native && <p className="alert alert-gold small">المنبه يعمل في تطبيق Android (يرنّ والجوال مقفل والتطبيق مغلق). هنا يمكنك الإعداد والاستماع للأصوات.</p>}
        {native && status && !status.exact && (
          <section className="alert alert-gold small">
            <p style={{ margin: '0 0 6px' }}>ليرنّ المنبه في وقته تمامًا، اسمح للتطبيق بـ«المنبهات والتذكيرات» من إعدادات الجهاز.</p>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => void openExactAlarmSettings()}>فتح الإعداد</button>
          </section>
        )}
        {nextText && <p className="small muted" style={{ margin: 0 }}><AlarmClock size={14} /> المنبه القادم: {DAY_NAMES[nextText.getDay()]} {time12(nextText.getHours(), nextText.getMinutes())}</p>}

        {list.length === 0 && (
          <section className="card" style={{ textAlign: 'center' }}>
            <AlarmClock size={36} />
            <p>لا منبهات بعد. أضف منبهًا يوقظك بذكر الصباح.</p>
          </section>
        )}

        {list.map((a) => (
          <section key={a.id} className="card">
            <div className="spread">
              <button type="button" style={{ textAlign: 'start', flex: 1, background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }} onClick={() => setOpen(open === a.id ? null : a.id)} aria-expanded={open === a.id}>
                <strong style={{ fontSize: '2rem', opacity: a.on ? 1 : 0.5 }}>{time12(a.h, a.m)}</strong><br />
                <small className="muted">{daysLabel(a.days)} · {WAKE_VOICES.find((v) => v.id === a.voice)?.name}</small>
              </button>
              <label className="check switch"><input type="checkbox" className="switch-input" checked={a.on} onChange={(e) => void patch(a.id, { on: e.target.checked })} aria-label="تفعيل المنبه" /></label>
            </div>
            {open === a.id && (
              <div className="stack" style={{ marginTop: 12, gap: '0.75rem' }}>
                <label className="field">
                  <span>الوقت</span>
                  <input type="time" value={`${pad(a.h)}:${pad(a.m)}`} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); if (!isNaN(h) && !isNaN(m)) void patch(a.id, { h, m }) }} />
                </label>
                <div>
                  <span className="small">الأيام (بلا اختيار = كل يوم)</span>
                  <div className="chips" role="group" aria-label="أيام المنبه">
                    {DAYS.map((d, i) => {
                      const on = a.days.includes(i)
                      return <button key={i} type="button" aria-pressed={on} title={DAY_NAMES[i]} className={'chip' + (on ? ' active' : '')} onClick={() => void patch(a.id, { days: on ? a.days.filter((x) => x !== i) : [...a.days, i] })}>{d}</button>
                    })}
                  </div>
                </div>
                <div>
                  <span className="small">صوت الإيقاظ</span>
                  <div className="chips" role="radiogroup" aria-label="صوت الإيقاظ">
                    {WAKE_VOICES.map((v) => <button key={v.id} type="button" role="radio" aria-checked={a.voice === v.id} className={'chip' + (a.voice === v.id ? ' active' : '')} onClick={() => void patch(a.id, { voice: v.id })}>{v.name}</button>)}
                  </div>
                  {a.voice !== 'tone' && <p className="small muted" style={{ margin: '4px 0 0' }}>«{WAKE_VOICES.find((v) => v.id === a.voice)?.text}» — {HISN_AUDIO_CREDIT}</p>}
                </div>
                <div>
                  <span className="small">النغمة قبل الذكر</span>
                  <div className="chips" role="radiogroup" aria-label="النغمة">
                    {WAKE_TONES.filter((t) => a.voice !== 'tone' || t.id !== 'none').map((t) => <button key={t.id} type="button" role="radio" aria-checked={a.tone === t.id} className={'chip' + (a.tone === t.id ? ' active' : '')} onClick={() => { void patch(a.id, { tone: t.id }); if (t.file) playUrl(BASE + t.file) }}>{t.name}</button>)}
                  </div>
                </div>
                <div className="spread">
                  <label className="check"><input type="checkbox" className="switch-input" checked={a.vibrate} onChange={(e) => void patch(a.id, { vibrate: e.target.checked })} /> اهتزاز</label>
                  <span className="row" style={{ gap: 6 }}>
                    <span className="small">الغفوة</span>
                    {SNOOZES.map((s) => <button key={s} type="button" className={'chip' + (a.snooze === s ? ' active' : '')} aria-pressed={a.snooze === s} onClick={() => void patch(a.id, { snooze: s })}>{s} د</button>)}
                  </span>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-sm" onClick={() => preview(a)}><Play size={14} /> استمع</button>
                  <button type="button" className="btn btn-sm" onClick={() => { audio.current?.pause(); void stopWakeAlarm() }}><Square size={14} /> إيقاف</button>
                  {native && <button type="button" className="btn btn-sm btn-primary" onClick={() => void test(a)}><AlarmClock size={14} /> جرّب الرنين الآن</button>}
                  <button type="button" className="btn btn-sm btn-danger" style={{ marginInlineStart: 'auto' }} onClick={() => remove(a.id)}><Trash2 size={14} /> حذف</button>
                </div>
              </div>
            )}
          </section>
        ))}

        <button type="button" className="btn btn-primary" onClick={add}><Plus size={16} /> إضافة منبه</button>
        <p className="small muted">يرنّ المنبه بصوت المنبهات (لا بصوت الإشعارات)، ويرتفع صوته تدريجيًا، ويتوقف تلقائيًا بعد ٥ دقائق إن لم تلمسه. يبقى مجدولًا بعد إعادة تشغيل الجوال.</p>
      </div>
    </>
  )
}
