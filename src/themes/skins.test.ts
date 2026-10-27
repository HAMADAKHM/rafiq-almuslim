import { describe, expect, it } from 'vitest'
import { activeSkin, SKINS } from './skins'
import { mergeSettings } from '../state/settings'

describe('الثيمات الغامرة', () => {
  it('ثمانية ثيمات، منها اثنان مجانيان', () => {
    expect(SKINS).toHaveLength(8)
    expect(SKINS.filter((s) => s.free).map((s) => s.id)).toEqual(['qadr', 'andalus'])
  })
  it('الثيم المجاني يعمل دون اشتراك، والمدفوع مع اشتراك فقط', () => {
    expect(activeSkin('qadr', false)?.id).toBe('qadr')
    expect(activeSkin('royal', false)).toBeNull()
    expect(activeSkin('royal', true)?.id).toBe('royal')
    expect(activeSkin('', true)).toBeNull()
    expect(activeSkin('unknown', true)).toBeNull()
  })
  it('الإعدادات القديمة بلا ثيم تبقى كما هي', () => {
    const s = mergeSettings({ theme: 'dark' } as never)
    expect(s.skin).toBe('')
    expect(s.skinStill).toBe(false)
    expect(s.theme).toBe('dark')
  })
})
