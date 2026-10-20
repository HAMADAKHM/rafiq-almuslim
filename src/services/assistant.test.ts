import { describe, expect, it } from 'vitest'
import { findContent, isFiqhQuestion, matchTopics, queryWords, TOPICS } from './assistant'
import { ADHKAR } from '../content/adhkar'
import { DUAS } from '../content/duas'
import { HADITH } from '../content/hadith'

describe('المساعد الإسلامي (استرجاع محلي)', () => {
  it('يستخرج كلمات السؤال دون «ال» وكلمات التوقف', () => {
    expect(queryWords('ما هو دعاء الهم والحزن؟')).toEqual(['هم', 'حزن'])
    expect(queryWords('كيف أصبر على البلاء')).toContain('صبر')
  })
  it('يربط السؤال بمواضيع موجودة في التطبيق', () => {
    expect(matchTopics(queryWords('أشعر بالقلق ولا أستطيع النوم')).map((t) => t.id)).toEqual(expect.arrayContaining(['distress', 'sleep']))
    expect(matchTopics(queryWords('ما فضل صلاة الجماعة')).map((t) => t.id)).toContain('prayer')
  })
  it('كل روابط المواضيع تشير إلى أقسام موجودة فعلًا', () => {
    const ids = { adhkar: ADHKAR, duas: DUAS, hadith: HADITH } as const
    for (const t of TOPICS) for (const l of t.links) {
      const m = l.to.match(/^\/(adhkar|duas|hadith)\/(.+)$/)
      if (m) expect(ids[m[1] as keyof typeof ids].some((c) => c.id === m[2]), l.to).toBe(true)
    }
  })
  it('يجد الأحاديث بنصها ومصدرها كما هي', () => {
    const [h] = findContent(HADITH, queryWords('صلاة الجماعة'))
    expect(h.it.id).toBe('h-jamaah')
    expect(h.it.source).toMatch(/البخاري \(645\)/)
  })
  it('أسئلة الأحكام تُعرف ليُعرض تنبيه الرجوع إلى أهل العلم', () => {
    expect(isFiqhQuestion('هل يجوز الجمع بين الصلاتين؟')).toBe(true)
    expect(isFiqhQuestion('ما حكم صيام يوم الجمعة')).toBe(true)
    expect(isFiqhQuestion('دعاء السفر')).toBe(false)
  })
})
