import { useEffect, useState } from 'react'
import { useSettings } from '../../state/SettingsContext'
import { getTafsirSurah, groupEntries, TAFSIR_EDITIONS } from '../../services/tafsir'
import { Spinner } from '../../components/Common'

/** عرض تفسير آية واحدة مع إمكانية تغيير كتاب التفسير */
export function TafsirPanel({ surah, ayah, kind }: { surah: number; ayah: number; kind?: 'tafsir' | 'gharib' }) {
  const { settings, update } = useSettings()
  const editions = kind ? TAFSIR_EDITIONS.filter((e) => e.kind === kind) : TAFSIR_EDITIONS
  const [slug, setSlug] = useState(editions.some((e) => e.slug === settings.tafsir) ? settings.tafsir : editions[0].slug)
  const [state, setState] = useState<{ loading: boolean; error?: string; text?: string; range?: [number, number]; cached?: boolean }>({ loading: true })

  useEffect(() => {
    let alive = true
    setState({ loading: true })
    getTafsirSurah(slug, surah)
      .then(({ entries, fromCache }) => {
        if (!alive) return
        const g = groupEntries(entries).find((x) => ayah >= x.from && ayah <= x.to)
        setState({ loading: false, text: g?.text ?? '', range: g ? [g.from, g.to] : undefined, cached: fromCache })
      })
      .catch((e: Error) => alive && setState({ loading: false, error: e.message }))
    return () => { alive = false }
  }, [slug, surah, ayah])

  const ed = TAFSIR_EDITIONS.find((e) => e.slug === slug)!
  return (
    <div className="card" style={{ marginTop: 8, background: 'var(--surface-2)' }}>
      <div className="spread">
        <select className="select" style={{ maxWidth: 340 }} value={slug} aria-label="كتاب التفسير"
          onChange={(e) => { setSlug(e.target.value); if (kind !== 'gharib') update({ tafsir: e.target.value }) }}>
          {editions.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
        </select>
        {state.range && state.range[0] !== state.range[1] && <span className="badge">تفسير الآيات {state.range[0]}–{state.range[1]}</span>}
      </div>
      {state.loading && <Spinner label="جارٍ تحميل التفسير" />}
      {state.error && <p className="alert alert-error small" role="alert" style={{ marginTop: 8 }}>{state.error}</p>}
      {!state.loading && !state.error && (
        <>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 10, lineHeight: 2 }}>{state.text || 'لا يوجد نص تفسير لهذه الآية في هذا المصدر.'}</div>
          <p className="source" style={{ marginTop: 8 }}>المصدر: {ed.name} — {ed.author}. {state.cached ? 'محفوظ على الجهاز.' : 'حُمّل الآن وحُفظ للقراءة دون اتصال.'}</p>
        </>
      )}
    </div>
  )
}
