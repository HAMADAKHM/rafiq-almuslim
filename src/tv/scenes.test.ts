import { describe, expect, it, beforeEach } from 'vitest'
import { nextScene, SCENES, sceneInfo } from './scenes'
import { DEFAULT_TV, loadTv, saveTv } from './state'

describe('مكتبة مشاهد التلفاز', () => {
  it('ثمانية مشاهد مصنفة بأسماء عربية', () => {
    expect(SCENES).toHaveLength(8)
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(8)
    expect(sceneInfo('aurora')?.name).toBe('الشفق القطبي')
  })
  it('التنقل بالترتيب يدور على القائمة', () => {
    expect(nextScene(['desert', 'aurora', 'galaxy'], 'desert', false)).toBe('aurora')
    expect(nextScene(['desert', 'aurora', 'galaxy'], 'galaxy', false)).toBe('desert')
    expect(nextScene([], null, false)).toBe(SCENES[0].id)
  })
  it('التنقل العشوائي لا يكرر المشهد الحالي', () => {
    for (let i = 0; i < 50; i++) expect(nextScene(['desert', 'aurora', 'galaxy'], 'aurora', true)).not.toBe('aurora')
    expect(nextScene(['forest'], 'forest', true)).toBe('forest')
  })
})

describe('إعدادات المشاهد', () => {
  beforeEach(() => localStorage.clear())
  it('الإعدادات القديمة تبقى كما هي وتحصل على التنقل بين المشاهد افتراضيًا', () => {
    localStorage.setItem('rafiq-tv:settings', JSON.stringify({ hour12: false, animate: true, reciteOn: true }))
    const s = loadTv()
    expect(s.hour12).toBe(false)
    expect(s.reciteOn).toBe(true)
    expect(s.scene).toBe('rotate')
    expect(s.quality).toBe('auto')
  })
  it('القيم غير المعروفة تُستبعد، والاختيار يُحفظ ويبقى بعد إعادة التشغيل', () => {
    localStorage.setItem('rafiq-tv:settings', JSON.stringify({ scene: 'unknown', playlist: ['aurora', 'nope', 'desert'] }))
    expect(loadTv().scene).toBe('rotate')
    expect(loadTv().playlist).toEqual(['aurora', 'desert'])
    saveTv({ ...DEFAULT_TV, scene: 'galaxy', rotateMin: 30, shuffle: false })
    expect(loadTv()).toMatchObject({ scene: 'galaxy', rotateMin: 30, shuffle: false })
  })
})
