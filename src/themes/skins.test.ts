import { describe, expect, it } from 'vitest'
import { activeSkin, SKINS } from './skins'
import { mergeSettings } from '../state/settings'

describe('الثيمات الغامرة', () => {
  it('ستة عشر ثيمًا (ثمانية حيّة)، منها ثلاثة مجانية، وكل ثيم حيّ له مشهد ولوحة ألوان', () => {
    expect(SKINS).toHaveLength(16)
    expect(SKINS.filter((s) => s.live)).toHaveLength(8)
    expect(SKINS.filter((s) => s.free).map((s) => s.id)).toEqual(['qadr', 'andalus', 'live-night'])
    for (const s of SKINS.filter((x) => x.live)) expect(s.palette).toBeTruthy()
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
