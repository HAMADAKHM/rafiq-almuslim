// اختبارات المزايا الجديدة: كاتب PDF، وأذكار الأحبة والصغار، وصفحة المزايا، والشريط السفلي، والسجل الطويل
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { wrapLines, writePdf } from './pdf'
import { newProfile, RELATIONS } from './beloved'
import { findItem } from '../content/itemText'
import { KIDS } from '../features/kids/KidsAdhkarPage'
import { FEATURE_GROUPS } from '../features/plus/FeaturesPage'
import { bookletBlocks } from '../features/booklet/BookletPage'
import { belovedBlocks } from '../features/beloved/BelovedPage'
import { DEFAULT_TABS, tabsFor } from '../app/nav'
import { computeInsights } from './insights'

const dec = (u: Uint8Array) => new TextDecoder('latin1').decode(u)

describe('كاتب PDF', () => {
  it('ملف صحيح: الترويسة، والصفحات، وجدول المراجع يشير إلى مواضع الكائنات بدقة', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9])
    const pdf = writePdf([{ jpeg, width: 100, height: 141 }, { jpeg, width: 100, height: 141 }], 'تجربة')
    const s = dec(pdf)
    expect(s.startsWith('%PDF-1.4')).toBe(true)
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(s).toMatch(/\/Count 2/)
    const xref = Number(/startxref\n(\d+)/.exec(s)![1])
    expect(s.slice(xref, xref + 4)).toBe('xref')
    const offs = [...s.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
    offs.forEach((o, i) => expect(s.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`))
    expect(s).toMatch(/\/Title <FEFF062A062C0631062806A9>|\/Title <FEFF/)
  })
  it('تقسيم الأسطر بالكلمات دون كسرها', () => {
    const lines = wrapLines((t) => t.length, 'كلمة كلمة كلمة كلمة', 10)
    expect(lines).toEqual(['كلمة كلمة', 'كلمة كلمة'])
    expect(wrapLines((t) => t.length, 'سطر\nثان', 50)).toEqual(['سطر', 'ثان'])
  })
})

describe('أذكار الأحبة والصغار والكتيّب: من المكتبة الموثقة فقط', () => {
  it('كل دعاء مقترح لكل صلة موجود في المكتبة', () => {
    for (const r of RELATIONS) for (const id of r.suggest) expect(findItem(id), `${r.id}:${id}`).toBeTruthy()
    const p = newProfile('  أمي  ', 'parents', 1)
    expect(p.name).toBe('أمي')
    expect(p.items).toEqual(RELATIONS[0].suggest)
  })
  it('أذكار الصغار: كل ذكر موجود بنصه ومصدره، وقصير', () => {
    for (const k of KIDS) {
      const it = findItem(k.id)
      expect(it?.text, k.id).toBeTruthy()
      expect(it!.source.length).toBeGreaterThan(3)
      expect(it!.text!.replace(/[ً-ْ]/g, '').length).toBeLessThan(75)
    }
  })
  it('الكتيّب وملف الأحبة: النصوص والمصادر كما هي، والدعاء الشخصي موسوم', () => {
    const b = bookletBlocks({ title: 'كتيب', dedication: 'إهداء', cats: ['morning'] }, null)
    expect(b[0]).toEqual({ type: 'title', text: 'كتيب' })
    expect(b.some((x) => x.type === 'text' && x.text.startsWith('أَصْبَحْنَا'))).toBe(true)
    expect(b.some((x) => x.type === 'note' && x.text.includes('رواه مسلم (2723)'))).toBe(true)
    const p = { ...newProfile('أبي', 'deceased', 1), custom: ['اللهم ارحمه'] }
    const bl = belovedBlocks(p, (id) => { const it = findItem(id); return it?.text ? { text: it.text, source: it.source, quran: false } : null })
    expect(bl.some((x) => x.type === 'note' && x.text === 'دعاء كتبته بنفسي')).toBe(true)
  })
})

describe('صفحة المزايا', () => {
  const app = readFileSync('src/app/App.tsx', 'utf8')
  it('كل بطاقة تفتح صفحة موجودة فعلًا', () => {
    for (const g of FEATURE_GROUPS) for (const f of g.items) {
      const path = f.to.split(/[?#]/)[0].replace(/^\//, '')
      const base = path.split('/').slice(0, 2).join('/')
      const ok = app.includes(`path="${path}"`) || app.includes(`path="${base}"`) || app.includes(`path="${path.split('/')[0]}/:`)
      expect(ok, f.to).toBe(true)
    }
  })
  it('القرآن والأذكار الأساسية والمواقيت مجانية في الصفحة', () => {
    const tier = (to: string) => FEATURE_GROUPS.flatMap((g) => g.items).find((f) => f.to === to)?.tier
    for (const to of ['/quran', '/adhkar/morning', '/duas', '/prayer', '/qibla', '/reminders']) expect(tier(to), to).toBe('free')
  })
})

describe('الشريط السفلي والسجل', () => {
  it('ثلاثة أقسام في الوسط، والرئيسية و«المزيد» ثابتان', () => {
    expect(tabsFor(undefined).map((t) => t.to)).toEqual(['/', ...DEFAULT_TABS, '/more'])
    expect(tabsFor(['/duas', '/tasbih', '/qibla']).map((t) => t.to)).toEqual(['/', '/duas', '/tasbih', '/qibla', '/more'])
    expect(tabsFor(['/nope', '/tasbih', '/qibla']).map((t) => t.to)).toEqual(['/', ...DEFAULT_TABS, '/more'])
  })
  it('السجل حتى سنة كاملة', () => {
    const logs = { read: [], listen: [], adhkar: [{ date: '2026-01-05', category: 'morning', at: 0 }], memo: [] } as never
    const y = computeInsights(logs, '2026-10-29', [7], undefined, 364)
    expect(y.heat.length).toBe(364)
    expect(y.heat.some((h) => h.date === '2026-01-05' && h.level > 0)).toBe(true)
    expect(computeInsights(logs, '2026-10-29', [7]).heat.length).toBe(84)
  })
})
