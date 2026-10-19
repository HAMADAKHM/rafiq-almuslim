import { describe, expect, it } from 'vitest'
import { Coordinates, Qibla } from 'adhan'
import { compassName, distanceToKaabaKm, qiblaBearing } from './qibla'

describe('حساب اتجاه القبلة', () => {
  // قيم مرجعية منشورة لاتجاه القبلة (درجات من الشمال الجغرافي)
  const known = [
    { name: 'نيويورك', lat: 40.7128, lng: -74.006, deg: 58.48 },
    { name: 'لندن', lat: 51.5074, lng: -0.1278, deg: 118.99 },
    { name: 'جاكرتا', lat: -6.2088, lng: 106.8456, deg: 295.15 },
    { name: 'القاهرة', lat: 30.0444, lng: 31.2357, deg: 136.14 },
  ]
  for (const k of known) {
    it(`${k.name} ≈ ${k.deg}°`, () => {
      expect(Math.abs(qiblaBearing(k.lat, k.lng) - k.deg)).toBeLessThan(0.3)
    })
  }

  it('يطابق حساب مكتبة adhan المستقلة لمدن عشوائية', () => {
    for (const [lat, lng] of [[32.22, 35.25], [31.5, 34.47], [-33.87, 151.21], [64.13, -21.9], [3.14, 101.69], [-1.29, 36.82]]) {
      expect(Math.abs(qiblaBearing(lat, lng) - Qibla(new Coordinates(lat, lng)))).toBeLessThan(0.01)
    }
  })

  it('نابلس: القبلة نحو الجنوب الجنوبي الشرقي (~158°)', () => {
    const b = qiblaBearing(32.2211, 35.2544)
    expect(b).toBeGreaterThan(156)
    expect(b).toBeLessThan(160)
    expect(compassName(b)).toBe('الجنوب')
  })

  it('المسافة إلى الكعبة', () => {
    expect(distanceToKaabaKm(21.4225, 39.8262)).toBeLessThan(0.01)
    expect(Math.abs(distanceToKaabaKm(40.7128, -74.006) - 10300)).toBeLessThan(100)
  })
})
