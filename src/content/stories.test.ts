import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { STORIES, storyScenes } from './stories'

const quran = JSON.parse(readFileSync('public/data/quran/quran.json', 'utf8')) as { verses: string[][] }

describe('قصص القرآن', () => {
  it('كل نطاق داخل حدود السورة، ومعرّفات فريدة', () => {
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length)
    for (const s of STORIES) {
      const n = quran.verses[s.surah - 1].length
      expect(s.from).toBeGreaterThanOrEqual(1)
      expect(s.to).toBeLessThanOrEqual(n)
      expect(s.from).toBeLessThan(s.to)
    }
  })
  it('بدايات القصص كما في المصحف', () => {
    const start = (id: string) => { const s = STORIES.find((x) => x.id === id)!; return quran.verses[s.surah - 1][s.from - 1].normalize('NFC') }
    expect(start('yusuf')).toContain('يُوسُفُ'.normalize('NFC'))
    expect(start('kahf')).toContain('ٱلۡكَهۡفِ'.normalize('NFC'))
    expect(start('yunus')).toContain('يُونُسَ'.normalize('NFC'))
    expect(start('qarun')).toContain('قَٰرُونَ'.normalize('NFC'))
  })
  it('المشاهد تُقص على حدود القصة', () => {
    const groups = [{ from: 1, to: 3, text: 'a' }, { from: 4, to: 4, text: 'b' }, { from: 5, to: 8, text: 'c' }, { from: 9, to: 9, text: 'd' }]
    expect(storyScenes(groups, 3, 6)).toEqual([{ from: 3, to: 3, text: 'a' }, { from: 4, to: 4, text: 'b' }, { from: 5, to: 6, text: 'c' }])
  })
})
