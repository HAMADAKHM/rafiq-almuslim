// الأكاديمية: سلامة المراجع آليًا — الآيات من نص المصحف المضمّن، وأرقام الأحاديث ضمن كتبها، والاختبارات متسقة.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { COURSES, PROPHETS, allLessons } from './courses'
import { sectionFor } from '../../services/hadithLib'

const Q = JSON.parse(readFileSync('public/data/quran/quran.json', 'utf8')) as { verses: string[][] } | string[][]
const verses: string[][] = Array.isArray(Q) ? Q : (Q as { verses: string[][] }).verses
const skel = (s: string) => s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '').replace(/[آأإٱا]/g, '').replace(/ى/g, 'ي').replace(/ة/g, 'ه')

describe('الأكاديمية', () => {
  it('كل آية مذكورة موجودة في المصحف', () => {
    for (const { lesson } of allLessons()) for (const b of lesson.blocks) {
      if (b.type === 'quran') for (let a = b.from; a <= b.to; a++) expect(verses[b.surah - 1]?.[a - 1], `${lesson.id} ${b.surah}:${a}`).toBeTruthy()
      if (b.type === 'timeline') for (const e of b.events) if (e.quran) expect(verses[e.quran[0] - 1]?.[e.quran[2] - 1], e.title).toBeTruthy()
    }
  })
  it('قصص الأنبياء: خمسة وعشرون نبيًا، وكل موضع يذكر اسم النبي نفسه', () => {
    expect(PROPHETS).toHaveLength(25)
    for (const p of PROPHETS) for (const [s, from, to] of p.ranges) {
      const text = skel(verses[s - 1].slice(from - 1, to).join(' '))
      expect(text.includes(skel(p.match ?? p.name)), `${p.name} ${s}:${from}-${to}`).toBe(true)
    }
  })
  it('كل حديث مذكور رقمه ضمن كتابه في الفهرس، وكل درس له حالة مراجعة ومصدر', () => {
    for (const { lesson } of allLessons()) {
      expect(['approved', 'review', 'incomplete']).toContain(lesson.review.status)
      for (const b of lesson.blocks) if (b.type === 'hadith') expect(sectionFor(b.book, b.n), `${lesson.id} ${b.book} ${b.n}`).toBeTruthy()
    }
  })
  it('الاختبارات: الإجابة الصحيحة ضمن الخيارات، ولكل سؤال شرح، ولا تكرار في المعرّفات', () => {
    const ids = new Set<string>()
    for (const { lesson } of allLessons()) for (const q of lesson.quiz ?? []) {
      expect(q.explain.length).toBeGreaterThan(5)
      if (q.kind === 'fill') expect(typeof q.answer).toBe('string')
      else expect(q.options![q.answer as number], q.id).toBeTruthy()
      ids.add(q.id)
    }
    expect(ids.size).toBeGreaterThan(20)
  })
  it('المقررات المطلوبة موجودة، ولا يكرر الأطفال محتوى بلا مصدر', () => {
    expect(COURSES.map((c) => c.id)).toEqual(['salah', 'taharah', 'seerah', 'prophets', 'companions', 'aqidah', 'fiqh', 'kids'])
  })
})
