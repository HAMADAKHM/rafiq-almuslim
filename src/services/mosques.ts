// دليل المساجد القريبة من بيانات OpenStreetMap (عبر Overpass API، مجاني ومفتوح بترخيص ODbL، بلا مفتاح).
// البيانات يضيفها متطوعون: قد تكون ناقصة أو غير دقيقة، ولا تتضمن عادةً أوقات الفتح — فلا نعرض أي ادعاء عنها.
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { kv } from '../db/repos'

export interface Mosque { id: string; name: string; named: boolean; lat: number; lng: number; distance: number; bearing: number }
export interface MosqueResult { at: number; center: { lat: number; lng: number; label: string }; radius: number; mosques: Mosque[] }

export const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
export const CACHE_KEY = 'mosques:last'
const MAX_RESULTS = 60

export function overpassQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${Math.round(radius)},${lat.toFixed(5)},${lng.toFixed(5)})`
  const f = '["amenity"="place_of_worship"]["religion"="muslim"]'
  return `[out:json][timeout:25];(node${f}${around};way${f}${around};relation${f}${around};);out center tags ${MAX_RESULTS * 2};`
}

const rad = (d: number) => (d * Math.PI) / 180
/** المسافة بالأمتار (هافرسين) */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371008.8
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
/** الاتجاه من نقطة إلى أخرى بالدرجات من الشمال (0–360) */
export function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat))
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}
const DIRS = ['الشمال', 'الشمال الشرقي', 'الشرق', 'الجنوب الشرقي', 'الجنوب', 'الجنوب الغربي', 'الغرب', 'الشمال الغربي']
export const directionName = (deg: number) => DIRS[Math.round(deg / 45) % 8]
export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} م` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} كم`)

interface OsmElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export function parseOverpass(json: { elements?: OsmElement[] }, from: { lat: number; lng: number }): Mosque[] {
  const out: Mosque[] = []
  for (const e of json.elements ?? []) {
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon
    if (lat == null || lng == null) continue
    const t = e.tags ?? {}
    const nm = t['name:ar'] || t.name || t['name:en'] || ''
    out.push({ id: `${e.type}/${e.id}`, name: nm || 'مسجد (بلا اسم مسجّل)', named: !!nm, lat, lng, distance: distanceM(from, { lat, lng }), bearing: bearingDeg(from, { lat, lng }) })
  }
  return out.sort((a, b) => a.distance - b.distance).slice(0, MAX_RESULTS)
}

async function getJson(url: string, signal?: AbortSignal): Promise<{ elements?: OsmElement[] }> {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.get({ url, responseType: 'json', connectTimeout: 15000, readTimeout: 30000 })
    if (r.status >= 400) throw new Error(String(r.status))
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data
  }
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

/** يبحث في الخادم الأول ثم البديل، ويحفظ آخر نتيجة لعرضها دون اتصال */
export async function findMosques(center: { lat: number; lng: number; label: string }, radius: number, signal?: AbortSignal): Promise<MosqueResult> {
  const q = encodeURIComponent(overpassQuery(center.lat, center.lng, radius))
  let lastErr: unknown
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const json = await getJson(`${ep}?data=${q}`, signal)
      const result: MosqueResult = { at: Date.now(), center, radius, mosques: parseOverpass(json, center) }
      kv.set(CACHE_KEY, result).catch(() => {})
      return result
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      lastErr = e
    }
  }
  throw new Error(`تعذر الوصول إلى خادم بيانات الخرائط (${String((lastErr as Error)?.message ?? lastErr)}). تحقق من الاتصال وأعد المحاولة.`)
}

export const lastMosques = () => kv.get<MosqueResult | null>(CACHE_KEY, null)

/** رابط المسار في تطبيق الخرائط (Apple Maps على iOS، وخرائط Google في غيره) */
export function directionsUrl(m: Pick<Mosque, 'lat' | 'lng'>, platform = Capacitor.getPlatform()): string {
  if (platform === 'ios') return `https://maps.apple.com/?daddr=${m.lat},${m.lng}&dirflg=w`
  return `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&travelmode=walking`
}
