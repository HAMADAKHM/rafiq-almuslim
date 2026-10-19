// قاعدة المدن (GeoNames عبر حزمة all-the-cities) مع المنطقة الزمنية لكل مدينة.
import { searchSkeleton } from '../lib/arabic'
import { CITY_NAMES_AR } from '../content/cityNamesAr'

export interface City {
  id: number
  name: string
  nameAr?: string
  country: string
  lat: number
  lng: number
  tz: string
  pop: number
}

let cache: Promise<City[]> | null = null

export function loadCities(fetcher: typeof fetch = fetch): Promise<City[]> {
  if (!cache) {
    cache = fetcher((import.meta.env?.BASE_URL ?? '/') + 'data/cities.json')
      .then((r) => { if (!r.ok) throw new Error('cities'); return r.json() })
      .then((j: { cities: [number, string, string, number, number, string, number][] }) =>
        j.cities.map(([id, name, country, lat, lng, tz, pop]) => ({ id, name, country, lat, lng, tz, pop, nameAr: CITY_NAMES_AR[`${country}:${name}`] })),
      )
    cache.catch(() => { cache = null })
  }
  return cache
}

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['ar'], { type: 'region' }) : null
export function countryNameAr(code: string): string {
  if (code === 'PS') return 'فلسطين'
  try {
    return regionNames?.of(code) ?? code
  } catch {
    return code
  }
}

export function countryList(cities: City[]): { code: string; name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of cities) counts.set(c.country, (counts.get(c.country) ?? 0) + 1)
  return [...counts].map(([code, count]) => ({ code, name: countryNameAr(code), count })).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

/** بحث بالاسم العربي أو اللاتيني، مرتب حسب التطابق ثم عدد السكان */
export function searchCities(cities: City[], query: string, country?: string, limit = 40): City[] {
  const q = query.trim()
  const pool = country ? cities.filter((c) => c.country === country) : cities
  if (!q) return pool.slice(0, limit)
  const lat = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '')
  const ar = searchSkeleton(q)
  const scored: [number, City][] = []
  for (const c of pool) {
    const n = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '')
    let score = -1
    if (lat && n.startsWith(lat)) score = 3
    else if (lat && n.includes(lat)) score = 1
    if (ar && c.nameAr) {
      const a = searchSkeleton(c.nameAr)
      if (a.startsWith(ar)) score = Math.max(score, 4)
      else if (a.includes(ar)) score = Math.max(score, 2)
    }
    if (score >= 0) scored.push([score, c])
  }
  return scored.sort((a, b) => b[0] - a[0] || b[1].pop - a[1].pop).slice(0, limit).map((x) => x[1])
}

export function cityLabel(c: Pick<City, 'name' | 'nameAr' | 'country'>): string {
  return `${c.nameAr ?? c.name}، ${countryNameAr(c.country)}`
}
