import { describe, expect, it } from 'vitest'
import { dailySuggestion, type SuggestInput } from './dailySuggest'

const base: SuggestInput = { hour: 9, hasLocation: true, adhkarDone: new Set(), memoDue: 0, khatma: { active: true, doneToday: true } }
const pick = (p: Partial<SuggestInput>) => dailySuggestion({ ...base, ...p }).id

describe('اقتراح اليوم', () => {
  it('بلا مدينة: اختيار المدينة أولًا', () => expect(pick({ hasLocation: false })).toBe('city'))
  it('صباحًا: أذكار الصباح ما لم تُسجَّل', () => {
    expect(pick({ hour: 7 })).toBe('morning')
    expect(pick({ hour: 7, adhkarDone: new Set(['morning']) })).toBe('reflect')
  })
  it('بعد العصر: أذكار المساء', () => expect(pick({ hour: 16 })).toBe('evening'))
  it('المراجعة المستحقة ثم ورد الختمة', () => {
    expect(pick({ hour: 13, memoDue: 2 })).toBe('review')
    expect(pick({ hour: 13, khatma: { active: true, doneToday: false, from: 5, to: 9 } })).toBe('wird')
  })
  it('بلا خطة ختمة: اقتراح خطة', () => expect(pick({ hour: 13, khatma: { active: false, doneToday: false } })).toBe('plan'))
  it('ليلًا: أذكار النوم', () => expect(pick({ hour: 23 })).toBe('sleep'))
  it('النص هادئ بلا لوم', () => {
    const all = [7, 13, 16, 23].map((hour) => dailySuggestion({ ...base, hour, khatma: { active: false, doneToday: false } }))
    for (const s of all) expect(s.title + s.body).not.toMatch(/قصّرت|تأخرت|فاتك|يجب عليك/)
  })
})
