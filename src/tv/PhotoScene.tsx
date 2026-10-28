// «صوري من الجوال»: خلفيات أرسلها المستخدم من تطبيق رفيق المسلم بلس، تُعرض بتلاشٍ ناعم وتقريب بطيء.
// الصور محفوظة داخل تطبيق التلفاز فقط (Backgrounds.java)، وتُقرأ عبر الجسر عند الحاجة.
import { useEffect, useState } from 'react'

export interface PhotoSource {
  /** معرّفات الصور بترتيب إضافتها */
  ids(): string[]
  /** الصورة كرابط data (فارغ إن حُذفت) */
  load(id: string): string
}

type PhotoBridge = { getBackgrounds?(): string; getBackground?(id: string): string; removeBackground?(id: string): boolean }
type W = { RafiqTV?: PhotoBridge; RafiqPhotos?: PhotoBridge }
/** الصور من جسر Android TV (أو جسر القراءة فقط في شاشة التوقف)، أو null خارج التطبيق (المتصفح وSamsung) */
export function photoSource(): (PhotoSource & { remove(id: string): boolean }) | null {
  const w = window as unknown as W
  const b = w.RafiqTV?.getBackgrounds ? w.RafiqTV : w.RafiqPhotos
  if (!b?.getBackgrounds || !b.getBackground) return null
  return {
    ids: () => { try { const a = JSON.parse(b.getBackgrounds!() || '[]'); return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } },
    load: (id) => { try { return b.getBackground!(id) || '' } catch { return '' } },
    remove: (id) => { try { return !!b.removeBackground?.(id) } catch { return false } },
  }
}

/** الصورة التالية في العرض (عشوائي دون تكرار الحالية، أو بالترتيب) */
export function nextPhoto(ids: string[], current: string | null, shuffle: boolean, rnd = Math.random): string | null {
  if (!ids.length) return null
  if (ids.length === 1) return ids[0]
  if (shuffle) {
    const others = ids.filter((x) => x !== current)
    return others[Math.floor(rnd() * others.length)]
  }
  const i = current ? ids.indexOf(current) : -1
  return ids[(i + 1) % ids.length]
}

/** عدد الصور المتاحة الآن، ويتحدث عند وصول صورة جديدة من الجوال */
export function usePhotoIds(src: PhotoSource | null): string[] {
  const [ids, setIds] = useState<string[]>(() => src?.ids() ?? [])
  useEffect(() => {
    if (!src) return
    const refresh = () => setIds(src.ids())
    window.addEventListener('rafiq-backgrounds', refresh)
    const t = setInterval(refresh, 60_000)
    return () => { window.removeEventListener('rafiq-backgrounds', refresh); clearInterval(t) }
  }, [src])
  return ids
}

export function PhotoScene({ src, minutes, shuffle, animate, className }: { src: PhotoSource; minutes: number; shuffle: boolean; animate: boolean; className?: string }) {
  const ids = usePhotoIds(src)
  // طبقتان تتبادلان: الظاهرة والقادمة
  const [layers, setLayers] = useState<{ id: string; url: string; key: number }[]>([])
  useEffect(() => {
    let alive = true
    let cur: string | null = null
    let k = 0
    const show = () => {
      const id = nextPhoto(ids, cur, shuffle)
      if (!id) { setLayers([]); return }
      if (id === cur && k > 0) return
      const url = src.load(id)
      if (!url || !alive) return
      cur = id
      k += 1
      const key = k
      setLayers((l) => [...l.slice(-1), { id, url, key }])
    }
    show()
    // صورة كل دقيقة على الأقل حتى مع مدة طويلة (التنقل بين الصور أسرع من المشاهد)
    const t = setInterval(show, Math.max(1, Math.min(minutes, 10)) * 60_000)
    const onNext = () => show()
    window.addEventListener('rafiq-next-scene', onNext)
    return () => { alive = false; clearInterval(t); window.removeEventListener('rafiq-next-scene', onNext) }
  }, [ids.join(','), minutes, shuffle]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', background: '#000' }}>
      {layers.map((l, i) => (
        <div key={l.key} className={'tv-photo' + (animate ? ' kb' + (l.key % 2) : '') + (i === layers.length - 1 ? ' on' : '')} style={{ backgroundImage: `url("${l.url}")` }} />
      ))}
    </div>
  )
}
