// حالة الطقس (رفيق بلس) من معهد الأرصاد النرويجي MET Norway (api.met.no): مجاني ويسمح بالاستخدام التجاري
// مع ذكر المصدر (CC BY 4.0). لا يُرسل إلا إحداثيات المدينة مقرّبة، ويُحفظ الناتج 30 دقيقة على الجهاز.
import { kv } from '../db/repos'

export const WEATHER_SOURCE = 'بيانات الطقس: معهد الأرصاد النرويجي (MET Norway)'
const TTL_MS = 30 * 60_000

export interface WeatherNow {
  /** درجة الحرارة الآن (°م) */
  temp: number
  symbol: string
  label: string
  icon: string
  wind: number | null
  humidity: number | null
  /** أعلى وأدنى حرارة في الساعات الأربع والعشرين القادمة */
  high: number
  low: number
  /** الساعات القادمة كل 3 ساعات */
  hours: { at: number; temp: number; icon: string; label: string }[]
  fetchedAt: number
}

/** رموز MET Norway (بلا لاحقة النهار/الليل) ← وصف عربي ورمز */
const SYMBOLS: [RegExp, string, string, string][] = [
  [/^clearsky/, 'صافٍ', '☀️', '🌙'],
  [/^fair/, 'صحو غالبًا', '🌤️', '🌙'],
  [/^partlycloudy/, 'غائم جزئيًا', '⛅', '☁️'],
  [/^cloudy/, 'غائم', '☁️', '☁️'],
  [/^fog/, 'ضباب', '🌫️', '🌫️'],
  [/thunder/, 'عواصف رعدية', '⛈️', '⛈️'],
  [/sleet/, 'مطر مع ثلج', '🌨️', '🌨️'],
  [/snow/, 'ثلج', '❄️', '❄️'],
  [/^(lightrain|lightrainshowers)/, 'مطر خفيف', '🌦️', '🌧️'],
  [/^(heavyrain|heavyrainshowers)/, 'مطر غزير', '🌧️', '🌧️'],
  [/rain/, 'مطر', '🌧️', '🌧️'],
]

export function describe(symbol: string): { label: string; icon: string } {
  const night = symbol.endsWith('_night')
  for (const [re, label, day, nightIcon] of SYMBOLS) if (re.test(symbol)) return { label, icon: night ? nightIcon : day }
  return { label: 'غير معروف', icon: '🌡️' }
}

interface MetSeries { time: string; data: { instant: { details: { air_temperature?: number; wind_speed?: number; relative_humidity?: number } }; next_1_hours?: { summary: { symbol_code: string } }; next_6_hours?: { summary: { symbol_code: string } } } }

/** يحوّل استجابة locationforecast/2.0/compact إلى ملخص للعرض */
export function parseMet(json: { properties?: { timeseries?: MetSeries[] } }, now: number): WeatherNow {
  const ts = (json.properties?.timeseries ?? []).filter((s) => typeof s.data?.instant?.details?.air_temperature === 'number')
  if (!ts.length) throw new Error('no data')
  const idx = Math.max(0, ts.findIndex((s) => Date.parse(s.time) + 3_600_000 > now))
  const cur = ts[idx]
  const sym = (s: MetSeries) => s.data.next_1_hours?.summary.symbol_code ?? s.data.next_6_hours?.summary.symbol_code ?? 'cloudy'
  const day = ts.filter((s) => { const t = Date.parse(s.time); return t >= now - 3_600_000 && t <= now + 24 * 3_600_000 })
  const temps = (day.length ? day : [cur]).map((s) => s.data.instant.details.air_temperature!)
  const d = describe(sym(cur))
  const hours = ts.slice(idx + 1).filter((s) => new Date(s.time).getUTCHours() % 3 === 0).slice(0, 6).map((s) => ({ at: Date.parse(s.time), temp: Math.round(s.data.instant.details.air_temperature!), ...describe(sym(s)) }))
  return {
    temp: Math.round(cur.data.instant.details.air_temperature!), symbol: sym(cur), label: d.label, icon: d.icon,
    wind: cur.data.instant.details.wind_speed ?? null, humidity: cur.data.instant.details.relative_humidity ?? null,
    high: Math.round(Math.max(...temps)), low: Math.round(Math.min(...temps)), hours, fetchedAt: now,
  }
}

const round = (x: number) => Math.round(x * 100) / 100

/** الطقس لموقع: من المحفوظ إن كان حديثًا، وإلا من MET Norway؛ دون إنترنت يُعاد آخر محفوظ (ولو قديمًا) */
export async function getWeather(lat: number, lng: number, fetcher: typeof fetch = fetch, now = Date.now()): Promise<WeatherNow> {
  const key = `weather:${round(lat)},${round(lng)}`
  const cached = await kv.get<WeatherNow | null>(key, null)
  if (cached && now - cached.fetchedAt < TTL_MS) return cached
  try {
    const r = await fetcher(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${round(lat)}&lon=${round(lng)}`, { headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const w = parseMet(await r.json(), now)
    await kv.set(key, w)
    return w
  } catch (e) {
    if (cached) return cached
    throw new Error('تعذر جلب حالة الطقس. تحقق من الاتصال بالإنترنت.', { cause: e })
  }
}
