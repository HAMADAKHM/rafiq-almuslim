// مكتبة الأحاديث: الفهرس، والتنزيل والتخزين، والبحث، والأحكام — بمقتطفات حقيقية من قاعدة fawazahmed0/hadith-api
import { describe, expect, it, beforeEach } from 'vitest'
import SAMPLE from '../test/fixtures/hadith-sample.json'
import { BOOKS, bookIndex, getHadith, loadSection, searchHadith, searchTopics, sectionFor, splitIsnad, takhrijFromGrades, normalizeAr, toggleFav, loadFavs } from './hadithLib'
import { translateGrade, gradeLevel } from './hadithGrades'

const S = SAMPLE as unknown as Record<string, unknown[]>
let calls: string[] = []
const fetcher = (async (url: string) => {
  calls.push(url)
  const m = /ara-([a-z]+)\/sections\/(\d+)\.min\.json/.exec(url)
  const list = m ? S[`${m[1]}/${m[2]}`] : null
  return { ok: !!list, status: list ? 200 : 404, json: async () => ({ hadiths: list }) } as Response
}) as unknown as typeof fetch

describe('فهرس المكتبة', () => {
  it('سبعة كتب بعناوين عربية لكل كتبها الفرعية، ومسند أحمد غير مدرج حتى تتوفر قاعدة كاملة', () => {
    expect(BOOKS.map((b) => b.id)).toEqual(['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik'])
    for (const b of BOOKS) {
      const idx = bookIndex(b.id)!
      expect(idx.sections.length).toBeGreaterThan(30)
      expect(idx.sections.every((s) => !!s.ar)).toBe(true)
    }
    expect(bookIndex('bukhari')!.sections[0].ar).toBe('كتاب بدء الوحى')
    expect(sectionFor('bukhari', 1)?.n).toBe(1)
  })
  it('البحث بالموضوع في عناوين الكتب دون تنزيل', () => {
    const r = searchTopics('الطهارة')
    expect(r.length).toBeGreaterThan(3)
    expect(r.some((x) => x.book.id === 'abudawud')).toBe(true)
  })
})

describe('التنزيل والبحث', () => {
  beforeEach(() => { calls = [] })
  it('يُنزَّل الكتاب الفرعي مرة واحدة ثم يُقرأ من الجهاز، والحديث الأول للبخاري بنصه', async () => {
    const list = await loadSection('bukhari', 1, fetcher)
    expect(normalizeAr(list[0].text)).toContain('انما الاعمال بالنيات')
    await loadSection('bukhari', 1, fetcher)
    expect(calls.length).toBeLessThanOrEqual(2) // المصدر الأول (وقد يُجرَّب البديل إن فشل)
    const h = await getHadith('bukhari', 1, fetcher)
    expect(h?.grades).toEqual([])
    expect(normalizeAr(splitIsnad(h!.text).isnad)).toContain('حدثنا الحميدي')
  })
  it('أحكام سنن أبي داود منسوبة إلى قائليها بالعربية', async () => {
    const h = (await loadSection('abudawud', 1, fetcher))[0]
    expect(h.grades.map((g) => g.byAr)).toContain('محمد ناصر الدين الألباني')
    expect(h.grades.find((g) => g.by === 'Al-Albani')?.ar).toBe('حسن صحيح')
  })
  it('البحث بالكلمات والعبارة والراوي في المحفوظ على الجهاز، دون تشكيل', async () => {
    await loadSection('abudawud', 1, fetcher)
    expect((await searchHadith('انما الاعمال بالنيات', 'phrase', null)).hits[0].h.book).toBe('bukhari')
    expect((await searchHadith('عمر الخطاب', 'narrator', ['bukhari'])).total).toBeGreaterThan(0)
    const r = await searchHadith('الخلاء', 'words', ['abudawud'])
    expect(r.total).toBeGreaterThan(0)
    expect(r.searchedBooks).toEqual(['abudawud'])
  })
  it('المفضلة تُحفظ وتُزال', async () => {
    const h = (await getHadith('bukhari', 1, fetcher))!
    expect(await toggleFav(h)).toBe(true)
    expect((await loadFavs())[0]).toMatchObject({ book: 'bukhari', n: 1 })
    expect(await toggleFav(h)).toBe(false)
  })
})

describe('ترجمة الأحكام', () => {
  it('المصطلحات والتخريج كما في القاعدة، والمستوى للون', () => {
    expect(translateGrade('Sahih Bukhari (1023) Sahih Muslim (894)').ar).toBe('صحيح، أخرجه البخاري (1023) ومسلم (894)')
    expect(translateGrade('Isnaad Hasan').ar).toBe('إسناده حسن')
    expect(translateGrade('Very Daif').ar).toBe('ضعيف جدًا')
    expect(gradeLevel('Mawdu')).toBe('fabricated')
    expect(gradeLevel('Daif Isnaad')).toBe('daif')
    expect(normalizeAr('إِنَّمَا الْأَعْمَالُ')).toBe('انما الاعمال')
    expect(takhrijFromGrades({ grades: [{ ar: 'صحيح، أخرجه مسلم (537)' }] } as never)).toEqual(['أخرجه مسلم (537)'])
  })
})
