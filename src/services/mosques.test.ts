import { describe, expect, it } from 'vitest'
import { bearingDeg, directionName, directionsUrl, distanceM, formatDistance, overpassQuery, parseOverpass } from './mosques'

describe('دليل المساجد', () => {
  it('المسافة: مكة–المدينة نحو 339 كم بخط مستقيم', () => {
    const d = distanceM({ lat: 21.4225, lng: 39.8262 }, { lat: 24.4672, lng: 39.6111 })
    expect(d / 1000).toBeGreaterThan(335)
    expect(d / 1000).toBeLessThan(342)
  })
  it('الاتجاه: نقطة شمالًا 0°، وشرقًا ~90°', () => {
    expect(bearingDeg({ lat: 32, lng: 35 }, { lat: 32.1, lng: 35 })).toBeCloseTo(0, 0)
    expect(bearingDeg({ lat: 32, lng: 35 }, { lat: 32, lng: 35.1 })).toBeCloseTo(90, 0)
    expect(directionName(0)).toBe('الشمال')
    expect(directionName(181)).toBe('الجنوب')
    expect(directionName(350)).toBe('الشمال')
  })
  it('الاستعلام يقتصر على أماكن عبادة المسلمين ضمن النطاق', () => {
    const q = overpassQuery(32.2211, 35.2544, 3000)
    expect(q).toContain('"amenity"="place_of_worship"')
    expect(q).toContain('"religion"="muslim"')
    expect(q).toContain('around:3000,32.22110,35.25440')
  })
  it('تحليل النتائج: الاسم العربي أولًا، ومراكز المباني، والترتيب بالمسافة', () => {
    const from = { lat: 32.22, lng: 35.25 }
    const r = parseOverpass({ elements: [
      { type: 'way', id: 2, center: { lat: 32.23, lon: 35.25 }, tags: { name: 'Big Mosque', 'name:ar': 'المسجد الكبير' } },
      { type: 'node', id: 1, lat: 32.221, lon: 35.25, tags: {} },
      { type: 'relation', id: 3, tags: { name: 'بلا موقع' } },
    ] }, from)
    expect(r.map((m) => m.id)).toEqual(['node/1', 'way/2'])
    expect(r[0]).toMatchObject({ name: 'مسجد (بلا اسم مسجّل)', named: false })
    expect(r[1].name).toBe('المسجد الكبير')
    expect(r[0].distance).toBeLessThan(r[1].distance)
  })
  it('تنسيق المسافة وروابط الخرائط', () => {
    expect(formatDistance(437)).toBe('440 م')
    expect(formatDistance(2350)).toBe('2.4 كم')
    expect(directionsUrl({ lat: 1, lng: 2 }, 'ios')).toContain('maps.apple.com')
    expect(directionsUrl({ lat: 1, lng: 2 }, 'android')).toContain('google.com/maps/dir')
  })
})
