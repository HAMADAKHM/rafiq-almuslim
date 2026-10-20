// اختبارات الإصدار 0.4: الإعدادات الجديدة، والأذكار الشخصية، وسطر الصدقة الجارية.
import { describe, expect, it } from 'vitest'
import { DEFAULT_QUICK_LINKS, MAX_QUICK_LINKS, mergeSettings, normalizeQuickLinks } from '../state/settings'
import { toItem, validateDhikr } from '../features/adhkar/MyAdhkarPage'
import { SADAQAH_LINE, DECEASED_NAME, DECEASED_KUNYA } from '../content/dedication'
import { ADHKAR } from '../content/adhkar'
import { LINK_META, TABS } from '../app/nav'
import { QUICK_LINK_CHOICES } from '../state/settings'

describe('إعدادات 0.4', () => {
  it('إعدادات الإصدارات السابقة تُدمج بقيم افتراضية آمنة', () => {
    const s = mergeSettings({ theme: 'dark' } as never)
    expect(s.quickLinks).toEqual(DEFAULT_QUICK_LINKS)
    expect(s.adhkarAutoAdvance).toBe(true)
    expect(s.adhkarView).toBe('session')
    expect(s.keepAwake).toBe(true)
    expect(s.trackPrayers).toBe(false)
    expect(s.theme).toBe('dark')
  })
  it('الاختصارات: تُزال المسارات المجهولة والمكررة ويُحترم الحد الأقصى', () => {
    expect(normalizeQuickLinks(['/qibla', '/qibla', '/hack', '/tasbih'])).toEqual(['/qibla', '/tasbih'])
    expect(normalizeQuickLinks([])).toEqual(DEFAULT_QUICK_LINKS)
    expect(normalizeQuickLinks(QUICK_LINK_CHOICES).length).toBe(MAX_QUICK_LINKS)
  })
  it('لكل اختصار قابل للاختيار عنوان وأيقونة، ولكل تبويب سفلي مسار', () => {
    for (const to of QUICK_LINK_CHOICES) expect(LINK_META[to], to).toBeTruthy()
    expect(TABS.map((t) => t.to)).toEqual(['/', '/quran', '/prayer', '/adhkar', '/more'])
    expect(TABS[1].match.test('/mushaf/3')).toBe(true)
    expect(TABS[3].match.test('/my-adhkar')).toBe(true)
  })
})

describe('الأذكار الشخصية', () => {
  it('تُميَّز بنوع «شخصي» ولا تُنسب إلى السنة', () => {
    const it_ = toItem({ id: 'my-1', text: 'اللهم اغفر لوالدي', count: 3, createdAt: '2026-10-20' })
    expect(it_.kind).toBe('personal')
    expect(it_.grade).toBeUndefined()
    expect(it_.source).not.toMatch(/رواه|البخاري|مسلم/)
  })
  it('التحقق من المدخلات', () => {
    expect(validateDhikr('', '')).toMatch(/اكتب/)
    expect(validateDhikr('   ', '')).toMatch(/اكتب/)
    expect(validateDhikr('سبحان الله', '0')).toMatch(/العدد/)
    expect(validateDhikr('سبحان الله', '2.5')).toMatch(/العدد/)
    expect(validateDhikr('x'.repeat(601), '')).toMatch(/أطول/)
    expect(validateDhikr('سبحان الله', '')).toBeNull()
    expect(validateDhikr('سبحان الله', '33')).toBeNull()
  })
})

describe('المحتوى والإهداء', () => {
  it('سطر الصدقة الجارية يحمل الاسم والكنية دون تغيير', () => {
    expect(SADAQAH_LINE).toContain(DECEASED_NAME)
    expect(SADAQAH_LINE).toContain(DECEASED_KUNYA)
    expect(SADAQAH_LINE).toBe('صدقة جارية عن روح المرحوم الحاج قصي بديع خلفه «أبو محمد»')
  })
  it('قسم الاستغفار والصلاة على النبي ﷺ موجود وموثق', () => {
    const c = ADHKAR.find((x) => x.id === 'salawat')!
    expect(c.items.length).toBeGreaterThanOrEqual(3)
    for (const it_ of c.items) expect(it_.source.length).toBeGreaterThan(3)
  })
})
