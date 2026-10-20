import { describe, expect, it, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { suggestTheme } from './sceneThemes'

let verses: string[][]
beforeAll(() => { verses = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/quran/quran.json'), 'utf8')).verses })
const ayah = (s: number, a: number) => verses[s - 1][a - 1]

describe('اقتراح المشهد من كلمات الآية', () => {
  it('كلمات حسية صريحة من نص المصحف', () => {
    expect(suggestTheme(ayah(55, 19))?.theme).toBe('sea') // مرج البحرين يلتقيان
    expect(suggestTheme(ayah(97, 1) + ' ' + ayah(97, 2))?.theme).toBe('stars') // ليلة القدر
    expect(suggestTheme(ayah(78, 7))?.theme).toBe('mountains') // والجبال أوتادا
    expect(suggestTheme(ayah(2, 25))?.theme).toBe('garden') // جنات تجري من تحتها الأنهار
    expect(suggestTheme(ayah(89, 1))?.theme).toBe('dawn') // والفجر
    expect(suggestTheme(ayah(24, 43))?.theme).toBe('rain') // يزجي سحابا … الودق
  })
  it('لا اقتراح حين لا توجد كلمة حسية', () => {
    expect(suggestTheme(ayah(112, 1))).toBeNull()
  })
  it('لا تطابق «ليل» داخل «قليل»', () => {
    expect(suggestTheme('قليلا ما تشكرون')).toBeNull()
  })
})
