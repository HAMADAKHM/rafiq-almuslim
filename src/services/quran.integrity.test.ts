// اختبارات سلامة المصحف: الاكتمال، الترتيب، التسلسل، المطابقة للمصدر، وسلامة التشكيل.
import { describe, expect, it, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import * as hafs from 'quran-meta/hafs'
import { ayahMeta, firstAyahOf, globalId, nextAyah, pageRange, parseRef, prevAyah, refFromGlobal, searchAyahs, searchSurahs, type QuranData } from './quran'

const require = createRequire(import.meta.url)
const root = path.resolve(__dirname, '../..')
let data: QuranData

beforeAll(() => {
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'public/data/quran/meta.json'), 'utf8'))
  const text = JSON.parse(fs.readFileSync(path.join(root, 'public/data/quran/quran.json'), 'utf8'))
  data = { meta, verses: text.verses }
})

describe('اكتمال المصحف وترتيبه', () => {
  it('يحتوي 114 سورة و6236 آية (العد الكوفي)', () => {
    expect(data.verses).toHaveLength(114)
    expect(data.meta.surahs).toHaveLength(114)
    expect(data.verses.reduce((n, s) => n + s.length, 0)).toBe(6236)
  })

  it('عدد آيات كل سورة يطابق مرجعًا مستقلًا (quran-meta)', () => {
    for (let s = 1; s <= 114; s++) {
      expect(data.verses[s - 1].length, `السورة ${s}`).toBe(hafs.getAyahCountInSurah(s))
      expect(data.meta.surahs[s - 1].n).toBe(s)
    }
  })

  it('أعداد آيات معروفة', () => {
    const known: Record<number, number> = { 1: 7, 2: 286, 3: 200, 9: 129, 18: 110, 26: 227, 36: 83, 55: 78, 67: 30, 103: 3, 108: 3, 112: 4, 114: 6 }
    for (const [s, c] of Object.entries(known)) expect(data.verses[Number(s) - 1].length).toBe(c)
  })

  it('أسماء السور الأولى والأخيرة صحيحة', () => {
    expect(data.meta.surahs[0].name).toBe('الفاتحة')
    expect(data.meta.surahs[1].name).toBe('البقرة')
    expect(data.meta.surahs[113].name).toBe('الناس')
  })

  it('لا توجد آيات فارغة، والترقيم المتسلسل متصل بلا فجوات أو تكرار', () => {
    const seen = new Set<number>()
    for (let s = 1; s <= 114; s++) {
      data.verses[s - 1].forEach((v, i) => {
        expect(v.trim().length).toBeGreaterThan(0)
        const g = globalId(data.meta, s, i + 1)
        expect(seen.has(g)).toBe(false)
        seen.add(g)
      })
    }
    expect(seen.size).toBe(6236)
    expect(Math.min(...seen)).toBe(1)
    expect(Math.max(...seen)).toBe(6236)
  })
})

describe('المطابقة للمصدر وسلامة النص', () => {
  it('النص المولَّد مطابق حرفيًا لحزمة المصدر quran-json', () => {
    const src = require('quran-json/dist/quran.json') as { verses: { text: string }[] }[]
    src.forEach((s, i) => s.verses.forEach((v, k) => expect(data.verses[i][k]).toBe(v.text)))
  })

  it('بصمة SHA-256 المسجلة تطابق الملف', () => {
    const raw = fs.readFileSync(path.join(root, 'public/data/quran/quran.json'), 'utf8')
    expect(crypto.createHash('sha256').update(raw).digest('hex')).toBe(data.meta.source.sha256)
  })

  // المقارنة بعد توحيد ترتيب علامات التشكيل (NFC)، لأن ترتيب الشدة والحركة في المصدر يختلف عن ترتيب الكتابة اليدوية
  const same = (a: string, b: string) => expect(a.normalize('NFC')).toBe(b.normalize('NFC'))
  it('آيات مرجعية معروفة بنصها', () => {
    same(data.verses[0][0], 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ')
    same(data.verses[111][0], 'قُلۡ هُوَ ٱللَّهُ أَحَدٌ')
    same(data.verses[1][254].split(' ').slice(0, 5).join(' '), 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ')
    same(data.verses[113][5], 'مِنَ ٱلۡجِنَّةِ وَٱلنَّاسِ')
  })

  it('التشكيل موجود في كل آية (عدا الحروف المقطعة وحدها في أوائل السور)', () => {
    const marks = /[\u064B-\u0653\u0670\u06E1]/
    for (let s = 1; s <= 114; s++) {
      data.verses[s - 1].forEach((v, i) => {
        if (!marks.test(v)) expect(v.includes(' ') ? `${s}:${i + 1}` : 'muqattaat-only').toBe('muqattaat-only')
        if (v.split(' ').length > 1) expect(marks.test(v), `${s}:${i + 1}`).toBe(true)
      })
    }
  })

  it('البسملة ليست مضافة إلى أول آية في السور الأخرى (رواية حفص)', () => {
    same(data.verses[1][0], 'الٓمٓ')
    same(data.verses[8][0].split(' ')[0], 'بَرَآءَةٞ')
  })
})

describe('الأجزاء والأحزاب والصفحات', () => {
  it('بدايات أجزاء معروفة', () => {
    expect(firstAyahOf(data.meta, 'juz', 1)).toEqual({ surah: 1, ayah: 1 })
    expect(firstAyahOf(data.meta, 'juz', 2)).toEqual({ surah: 2, ayah: 142 })
    expect(firstAyahOf(data.meta, 'juz', 30)).toEqual({ surah: 78, ayah: 1 })
  })
  it('604 صفحات، والصفحة الأولى الفاتحة، وآية الكرسي في الصفحة 42', () => {
    expect(data.meta.pages).toBe(604)
    expect(pageRange(data.meta, 1)).toEqual({ from: { surah: 1, ayah: 1 }, to: { surah: 1, ayah: 7 } })
    expect(ayahMeta(data.meta, 2, 255).page).toBe(42)
    expect(pageRange(data.meta, 604)!.to).toEqual({ surah: 114, ayah: 6 })
  })
  it('15 موضع سجدة', () => {
    expect(data.meta.sajdas).toHaveLength(15)
    expect(ayahMeta(data.meta, 96, 19).sajda).toBe(true)
  })
})

describe('التنقل بين الآيات والسور', () => {
  it('التحويل بين المرجع والرقم المتسلسل', () => {
    expect(refFromGlobal(data.meta, 1)).toEqual({ surah: 1, ayah: 1 })
    expect(refFromGlobal(data.meta, 8)).toEqual({ surah: 2, ayah: 1 })
    expect(refFromGlobal(data.meta, 6236)).toEqual({ surah: 114, ayah: 6 })
    for (const g of [1, 7, 8, 293, 3000, 6230]) expect(globalId(data.meta, refFromGlobal(data.meta, g).surah, refFromGlobal(data.meta, g).ayah)).toBe(g)
  })
  it('الآية التالية والسابقة عبر حدود السور', () => {
    expect(nextAyah(data.meta, { surah: 1, ayah: 7 })).toEqual({ surah: 2, ayah: 1 })
    expect(prevAyah(data.meta, { surah: 2, ayah: 1 })).toEqual({ surah: 1, ayah: 7 })
    expect(nextAyah(data.meta, { surah: 114, ayah: 6 })).toBeNull()
    expect(prevAyah(data.meta, { surah: 1, ayah: 1 })).toBeNull()
  })
  it('تحليل المراجع', () => {
    expect(parseRef(data.meta, '2:255')).toEqual({ surah: 2, ayah: 255 })
    expect(parseRef(data.meta, '2:287')).toBeNull()
    expect(parseRef(data.meta, '115:1')).toBeNull()
  })
})

describe('البحث', () => {
  it('يجد الكلمات دون اعتبار للتشكيل والرسم العثماني', () => {
    expect(searchAyahs(data, 'الله الصمد').hits[0]).toMatchObject({ surah: 112, ayah: 2 })
    expect(searchAyahs(data, 'مالك يوم الدين').hits.some((h) => h.surah === 1 && h.ayah === 4)).toBe(true)
    expect(searchAyahs(data, 'يقيمون الصلاة').hits.some((h) => h.surah === 2 && h.ayah === 3)).toBe(true)
    expect(searchAyahs(data, 'الرحمن الرحيم').total).toBeGreaterThan(3)
  })
  it('لا يعدّل النص الأصلي المعروض في النتائج', () => {
    const h = searchAyahs(data, 'الله الصمد').hits[0]
    expect(h.text).toBe(data.verses[111][1])
  })
  it('البحث في أسماء السور بالعربية واللاتينية والرقم', () => {
    expect(searchSurahs(data.meta, 'الكهف')[0].n).toBe(18)
    expect(searchSurahs(data.meta, 'kahf')[0].n).toBe(18)
    expect(searchSurahs(data.meta, '36')[0].n).toBe(36)
    expect(searchSurahs(data.meta, 'ال عمران').map((s) => s.n)).toContain(3)
  })
})
