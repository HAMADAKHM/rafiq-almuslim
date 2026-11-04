import { describe, expect, it } from 'vitest'
import { activeSkin, SKINS } from './skins'
import { mergeSettings } from '../state/settings'

describe('الثيمات الغامرة', () => {
  it('أربعة وثلاثون ثيمًا (ستة أساسية، والتصاميم التسعة وثلاثة أخرى، وثمانية حيّة)، منها سبعة مجانية، وكل ثيم حيّ له مشهد ولوحة ألوان', () => {
    expect(SKINS).toHaveLength(36)
    expect(SKINS.filter((s) => s.identity)).toHaveLength(20)
    expect(SKINS.filter((s) => s.live)).toHaveLength(8)
    expect(SKINS.filter((s) => s.free).map((s) => s.id)).toEqual(['e-night', 'e-golden', 'e-ivory', 'e-white', 'e-dark', 't-classic', 'qadr', 'andalus', 'live-night'])
    for (const s of SKINS.filter((x) => x.live)) expect(s.palette).toBeTruthy()
  })
  it('الثيم المجاني يعمل دون اشتراك، والمدفوع مع اشتراك فقط', () => {
    expect(activeSkin('qadr', false)?.id).toBe('qadr')
    expect(activeSkin('royal', false)).toBeNull()
    expect(activeSkin('royal', true)?.id).toBe('royal')
    expect(activeSkin('', true)).toBeNull()
    expect(activeSkin('unknown', true)).toBeNull()
  })
  it('الإعدادات القديمة بلا ثيم تنتقل مرة واحدة إلى التصميم الذهبي المعتمد، ثم يبقى اختيار المستخدم', () => {
    const s = mergeSettings({ theme: 'dark' } as never)
    expect(s.skin).toBe('e-night')
    // من كان على الذهبي ينتقل مرة واحدة إلى «الليلي الذهبي»، ثم يبقى اختياره
    expect(mergeSettings({ skin: 'e-golden', goldenApplied: true } as never).skin).toBe('e-night')
    expect(mergeSettings({ skin: 'e-golden', goldenApplied: true, nightApplied: true } as never).skin).toBe('e-golden')
    expect(mergeSettings({ skin: '', goldenApplied: true, nightApplied: true } as never).skin).toBe('')
    expect(mergeSettings({ skin: 't-night' } as never).skin).toBe('t-night')
    expect(s.skinStill).toBe(false)
    expect(s.theme).toBe('dark')
  })
})
