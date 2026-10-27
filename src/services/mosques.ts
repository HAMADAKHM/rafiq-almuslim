// دليل المساجد القريبة من بيانات OpenStreetMap (عبر Overpass API، مجاني ومفتوح بترخيص ODbL، بلا مفتاح).
// البيانات يضيفها متطوعون: قد تكون ناقصة أو غير دقيقة، ولا تتضمن عادةً أوقات الفتح — فلا نعرض أي ادعاء عنها.
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { kv } from '../db/repos'

export interface Mosque { id: string; name: string; named: boolean; lat: number; lng: number; distance: number; bearing: number }
export interface MosqueResult { at: number; center: { lat: number; lng: number; label: string }; radius: number; mosques: Mosque[] }

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
async function postQuery(url: string, query: string, signal?: AbortSignal): Promise<{ elements?: OsmElement[] }> {
  const body = 'data=' + encodeURIComponent(query)
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.post({
      url, data: body, responseType: 'json', connectTimeout: 15000, readTimeout: 35000,
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

/** يبحث في الخادم الأول ثم البديل، ويحفظ آخر نتيجة لعرضها دون اتصال */
export async function findMosques(center: { lat: number; lng: number; label: string }, radius: number, signal?: AbortSignal): Promise<MosqueResult> {
  const q = overpassQuery(center.lat, center.lng, radius)
  let lastErr: unknown
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const json = await postQuery(ep, q, signal)
      const result: MosqueResult = { at: Date.now(), center, radius, mosques: parseOverpass(json, center).filter((m) => m.distance <= radius) }
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
