import { describe, expect, it } from 'vitest'
import { radarPoint, toggleFav } from './mosques'

describe('المساجد: المفضلة والرادار', () => {
  const m = { id: 'node/1', name: 'مسجد', named: true, lat: 32.2, lng: 35.2 }
  it('إضافة وإزالة من المفضلة دون تكرار', () => {
    const l = toggleFav([], m)
    expect(l).toHaveLength(1)
    expect(toggleFav(l, m)).toHaveLength(0)
  })
  it('الشمال للأعلى والشرق لليمين، والمسافة نسبة من النطاق', () => {
    const n = radarPoint({ distance: 500, bearing: 0 }, 1000)
    expect(n.x).toBeCloseTo(0); expect(n.y).toBeCloseTo(-0.5)
    const e = radarPoint({ distance: 1000, bearing: 90 }, 1000)
    expect(e.x).toBeCloseTo(1); expect(e.y).toBeCloseTo(0)
    expect(radarPoint({ distance: 5000, bearing: 180 }, 1000).y).toBeCloseTo(1)
  })
})
