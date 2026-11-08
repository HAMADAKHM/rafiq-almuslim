import { describe, expect, it, beforeEach } from 'vitest'
import { nextScene, SCENES, sceneInfo } from './scenes'
import { DEFAULT_TV, loadTv, saveTv } from './state'

describe('مكتبة مشاهد التلفاز', () => {
  it('اثنا عشر مشهدًا مصنفة بأسماء عربية، منها أربعة للمعالم الإسلامية', () => {
    expect(SCENES).toHaveLength(12)
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(12)
    expect(SCENES.filter((s) => s.category === 'المعالم الإسلامية').map((s) => s.name)).toEqual(['الكعبة المشرفة', 'المسجد النبوي', 'المسجد الأقصى', 'مسجد السلطان أحمد'])
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

describe('الصور الجاهزة لشاشة التلفاز', async () => {
  const { GALLERY, GALLERY_CATS, galleryIds, gallerySource } = await import('./gallery')
  const { existsSync } = await import('node:fs')
  it('الصور الجاهزة عالية الدقة فقط، ولكل منها ملف، والتصنيف الفارغ يعرض الكل ولا يظهر في القائمة', () => {
    expect(GALLERY).toHaveLength(1)
    for (const p of GALLERY) expect(existsSync(`tv-photos/${p.id}.jpg`), p.id).toBe(true)
    expect(galleryIds('islamic')).toEqual(['islamic-01'])
    expect(galleryIds('all')).toEqual(['islamic-01'])
    expect(galleryIds('nature')).toEqual(['islamic-01'])
    expect(GALLERY_CATS.map((c) => c.id)).toEqual(['all', 'islamic'])
    expect(gallerySource('islamic').load('islamic-01')).toBe('./tv-photos/islamic-01.jpg')
  })
  it('الإعداد يقبل وضع الصور الجاهزة وتصنيفه، والتصنيف الفارغ أو المجهول يصير «الكل»', () => {
    localStorage.setItem('rafiq-tv:settings', JSON.stringify({ scene: 'gallery', galleryCat: 'islamic' }))
    expect(loadTv()).toMatchObject({ scene: 'gallery', galleryCat: 'islamic' })
    localStorage.setItem('rafiq-tv:settings', JSON.stringify({ scene: 'gallery', galleryCat: 'nature' }))
    expect(loadTv().galleryCat).toBe('all')
    localStorage.setItem('rafiq-tv:settings', JSON.stringify({ scene: 'gallery', galleryCat: 'x' }))
    expect(loadTv().galleryCat).toBe('all')
  })
})
