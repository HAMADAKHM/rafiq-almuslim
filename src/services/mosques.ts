// دليل المساجد القريبة من بيانات OpenStreetMap (عبر Overpass API، مجاني ومفتوح بترخيص ODbL، بلا مفتاح).
// البيانات يضيفها متطوعون: قد تكون ناقصة أو غير دقيقة، ولا تتضمن عادةً أوقات الفتح — فلا نعرض أي ادعاء عنها.
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { kv } from '../db/repos'

export interface Mosque { id: string; name: string; named: boolean; lat: number; lng: number; distance: number; bearing: number }
export interface MosqueResult {
  at: number; center: { lat: number; lng: number; label: string }; radius: number; mosques: Mosque[]
  /** 'quick': بحث سريع بالأسماء (Photon/Nominatim) — قد ينقصه مساجد بلا اسم مسجل؛ 'full': قائمة Overpass الكاملة */
  source?: 'quick' | 'full'
}

// ثلاثة خوادم عامة مجانية بالترتيب؛ إن فشل أحدها جُرّب التالي
export const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
/**
 * منذ 2026 يرفض الخادم الرئيسي (406) الطلبات التي تحمل معرّف مكتبة عامًا (مثل Dalvik/okhttp في Android)،
 * فيجب أن يعرّف التطبيق نفسه. (المتصفح لا يسمح بتغيير المعرّف، فيُرسل معرّفه المعتاد.)
 */
export const OVERPASS_USER_AGENT = 'RafiqAlMuslim/1.0 (Islamic companion app; +https://github.com/HAMADAKHM/rafiq-almuslim)'
export const CACHE_KEY = 'mosques:last'
const MAX_RESULTS = 60

export function overpassQuery(lat: number, lng: number, radius: number): string {
  // الخصوصية: يُرسل الموقع مقرّبًا إلى نحو 100 م فقط؛ والمسافات تُحسب على الجهاز من الموقع الفعلي
  const around = `(around:${Math.round(radius) + 150},${lat.toFixed(3)},${lng.toFixed(3)})`
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
export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} م` : `${Number((m / 1000).toFixed(m < 10_000 ? 1 : 0))} كم`)

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

export class OverpassError extends Error {
  status: number
  constructor(status: number) {
    super(String(status))
    this.status = status
  }
}

/** POST كما توصي وثائق Overpass (الاستعلام في جسم الطلب لا في الرابط) */
async function postQuery(url: string, query: string, signal?: AbortSignal, readTimeout = 70000): Promise<{ elements?: OsmElement[] }> {
  const body = 'data=' + encodeURIComponent(query)
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.post({
      url, data: body, responseType: 'json', connectTimeout: 15000, readTimeout,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': OVERPASS_USER_AGENT, Accept: 'application/json' },
    })
    if (r.status >= 400) throw new OverpassError(r.status)
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data
  }
  const res = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal })
  if (!res.ok) throw new OverpassError(res.status)
  return res.json()
}

/** رسالة واضحة بحسب سبب الفشل */
export function mosqueErrorMessage(e: unknown, offline = typeof navigator !== 'undefined' && navigator.onLine === false): string {
  if (offline) return 'لا يوجد اتصال بالإنترنت. اتصل ثم أعد المحاولة.'
  const st = e instanceof OverpassError ? e.status : 0
  if (st === 429) return 'خوادم الخرائط المجانية مزدحمة الآن. انتظر دقيقة ثم أعد المحاولة.'
  if (st === 504 || st === 503 || st === 502) return 'تأخر خادم الخرائط في الرد. جرّب نطاقًا أصغر أو أعد المحاولة بعد قليل.'
  if (st === 406 || st === 403) return 'رفض خادم الخرائط الطلب. أعد المحاولة لاحقًا، وإن تكرر فأخبرنا.'
  return 'تعذر الوصول إلى خوادم بيانات الخرائط. تحقق من الاتصال وأعد المحاولة.'
}

// ---------- البحث السريع (ثانية تقريبًا) ----------
// فحص من GitHub Actions (27 أكتوبر 2026): Overpass يرد بعد 30–50 ثانية، وPhoton وNominatim في أقل من ثانية.
// كلاهما من بيانات OpenStreetMap نفسها، لكنهما يبحثان بالاسم: المساجد بلا اسم مسجل لا تظهر إلا في Overpass.
export const PHOTON_URL = 'https://photon.komoot.io/api/'
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const NOT_MOSQUE = /church|cathedral|chapel|synagogue|temple|monastery|convent|كنيسة|كاتدرائية|دير|كنيس|معبد/i

async function getJson<T>(url: string, signal?: AbortSignal, readTimeout = 15000): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.get({ url, responseType: 'json', connectTimeout: 10000, readTimeout, headers: { 'User-Agent': OVERPASS_USER_AGENT, Accept: 'application/json' } })
    if (r.status >= 400) throw new OverpassError(r.status)
    return (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) as T
  }
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new OverpassError(res.status)
  return res.json() as Promise<T>
}

/** مربع البحث حول المركز (بالدرجات) */
export function bbox(c: { lat: number; lng: number }, radius: number) {
  const dLat = radius / 111_320
  const dLng = radius / (111_320 * Math.max(0.2, Math.cos(rad(c.lat))))
  return { minLat: c.lat - dLat, maxLat: c.lat + dLat, minLng: c.lng - dLng, maxLng: c.lng + dLng }
}

interface PhotonFeature { geometry?: { coordinates?: [number, number] }; properties?: { osm_type?: string; osm_id?: number; osm_key?: string; osm_value?: string; name?: string } }
interface NominatimItem { osm_type?: string; osm_id?: number; lat?: string; lon?: string; category?: string; type?: string; name?: string }
const OSM_TYPE: Record<string, string> = { N: 'node', W: 'way', R: 'relation', node: 'node', way: 'way', relation: 'relation' }

export function parsePhoton(json: { features?: PhotonFeature[] }, from: { lat: number; lng: number }): Mosque[] {
  const out: Mosque[] = []
  for (const f of json.features ?? []) {
    const p = f.properties ?? {}
    const c = f.geometry?.coordinates
    if (!c || p.osm_value !== 'place_of_worship' || p.osm_id == null) continue
    const name = (p.name ?? '').trim()
    if (NOT_MOSQUE.test(name)) continue
    const lat = c[1], lng = c[0]
    out.push({ id: `${OSM_TYPE[p.osm_type ?? 'N'] ?? 'node'}/${p.osm_id}`, name: name || 'مسجد (بلا اسم مسجّل)', named: !!name, lat, lng, distance: distanceM(from, { lat, lng }), bearing: bearingDeg(from, { lat, lng }) })
  }
  return out
}

export function parseNominatim(json: NominatimItem[], from: { lat: number; lng: number }): Mosque[] {
  const out: Mosque[] = []
  for (const it of Array.isArray(json) ? json : []) {
    if (it.category !== 'amenity' || it.type !== 'place_of_worship' || it.osm_id == null) continue
    const name = (it.name ?? '').trim()
    if (NOT_MOSQUE.test(name)) continue
    const lat = Number(it.lat), lng = Number(it.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    out.push({ id: `${OSM_TYPE[it.osm_type ?? 'node'] ?? 'node'}/${it.osm_id}`, name: name || 'مسجد (بلا اسم مسجّل)', named: !!name, lat, lng, distance: distanceM(from, { lat, lng }), bearing: bearingDeg(from, { lat, lng }) })
  }
  return out
}

/** دمج نتائج عدة مصادر بلا تكرار (بمعرّف OSM)، ضمن النطاق، مرتبة بالمسافة */
export function mergeMosques(lists: Mosque[][], radius: number): Mosque[] {
  const seen = new Map<string, Mosque>()
  for (const l of lists) for (const m of l) if (m.distance <= radius && !seen.has(m.id)) seen.set(m.id, m)
  return [...seen.values()].sort((a, b) => a.distance - b.distance).slice(0, MAX_RESULTS)
}

/** بحث سريع: Photon (بالعربية والإنجليزية) وNominatim معًا؛ يكفي نجاح أحدها */
export async function findMosquesQuick(center: { lat: number; lng: number; label: string }, radius: number, signal?: AbortSignal): Promise<MosqueResult> {
  const b = bbox(center, radius)
  const box = `${b.minLng.toFixed(4)},${b.minLat.toFixed(4)},${b.maxLng.toFixed(4)},${b.maxLat.toFixed(4)}`
  const lat = center.lat.toFixed(3), lng = center.lng.toFixed(3)
  const photon = (q: string) => getJson<{ features?: PhotonFeature[] }>(`${PHOTON_URL}?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lng}&bbox=${box}&limit=50&osm_tag=amenity:place_of_worship`, signal).then((j) => parsePhoton(j, center))
  const nominatim = getJson<NominatimItem[]>(`${NOMINATIM_URL}?q=${encodeURIComponent('مسجد')}&format=jsonv2&limit=50&bounded=1&viewbox=${box}`, signal).then((j) => parseNominatim(j, center))
  const settled = await Promise.allSettled([photon('مسجد'), photon('mosque'), nominatim])
  const ok = settled.filter((r): r is PromiseFulfilledResult<Mosque[]> => r.status === 'fulfilled').map((r) => r.value)
  if (!ok.length) {
    const first = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
    if ((first?.reason as Error)?.name === 'AbortError') throw first!.reason
    throw new Error(mosqueErrorMessage(first?.reason))
  }
  const result: MosqueResult = { at: Date.now(), center, radius, mosques: mergeMosques(ok, radius), source: 'quick' }
  kv.set(CACHE_KEY, result).catch(() => {})
  return result
}

/** القائمة الكاملة من Overpass (تشمل المساجد بلا اسم)؛ بطيئة حاليًا (30–50 ثانية)، تُستدعى بعد البحث السريع */
export async function findMosques(center: { lat: number; lng: number; label: string }, radius: number, signal?: AbortSignal): Promise<MosqueResult> {
  const q = overpassQuery(center.lat, center.lng, radius)
  let lastErr: unknown
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const json = await postQuery(ep, q, signal)
      const result: MosqueResult = { at: Date.now(), center, radius, mosques: parseOverpass(json, center).filter((m) => m.distance <= radius), source: 'full' }
      kv.set(CACHE_KEY, result).catch(() => {})
      return result
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      lastErr = e
    }
  }
  const err = new Error(mosqueErrorMessage(lastErr))
  ;(err as Error & { cause?: unknown }).cause = lastErr
  throw err
}

export const lastMosques = () => kv.get<MosqueResult | null>(CACHE_KEY, null)

/** رابط المسار في تطبيق الخرائط (Apple Maps على iOS، وخرائط Google في غيره) */
export function directionsUrl(m: Pick<Mosque, 'lat' | 'lng'>, platform = Capacitor.getPlatform()): string {
  if (platform === 'ios') return `https://maps.apple.com/?daddr=${m.lat},${m.lng}&dirflg=w`
  return `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&travelmode=walking`
}

/** المساجد المفضلة: تُحفظ على الجهاز فقط (الاسم والإحداثيات من OpenStreetMap كما هي) */
export const FAV_KEY = 'mosques:favorites'
export type FavMosque = Pick<Mosque, 'id' | 'name' | 'named' | 'lat' | 'lng'>
export const loadFavMosques = () => kv.get<FavMosque[]>(FAV_KEY, [])
export function toggleFav(list: FavMosque[], m: FavMosque): FavMosque[] {
  return list.some((x) => x.id === m.id) ? list.filter((x) => x.id !== m.id) : [{ id: m.id, name: m.name, named: m.named, lat: m.lat, lng: m.lng }, ...list].slice(0, 50)
}
export const saveFavMosques = (l: FavMosque[]) => kv.set(FAV_KEY, l)

/** موضع المسجد على الرادار المصغّر: مركز (0,0)، والشمال للأعلى، ونصف القطر 1 = نطاق البحث */
export function radarPoint(m: Pick<Mosque, 'distance' | 'bearing'>, radius: number): { x: number; y: number } {
  const r = Math.min(1, m.distance / Math.max(1, radius))
  const a = (m.bearing * Math.PI) / 180
  return { x: r * Math.sin(a), y: -r * Math.cos(a) }
}
