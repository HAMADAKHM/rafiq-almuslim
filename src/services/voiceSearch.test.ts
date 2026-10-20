// البحث الصوتي: نص منطوق بالإملاء الحديث (كما يخرجه التعرف على الكلام) يجب أن يجد الآية الصحيحة.
import { describe, expect, it, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { matchSpokenAyah } from './voiceSearch'
import type { QuranData } from './quran'

let data: QuranData
beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data/quran')
  data = { verses: JSON.parse(fs.readFileSync(path.join(dir, 'quran.json'), 'utf8')).verses, meta: JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) } as QuranData
})

describe('مطابقة الآية المنطوقة', () => {
  it('آية الكرسي من مقطع بالإملاء الحديث', () => {
    const r = matchSpokenAyah(data, 'الله لا اله الا هو الحي القيوم لا تاخذه سنة ولا نوم')
    expect(r[0]).toMatchObject({ surah: 2, ayah: 255, exact: true })
  })
  it('العبارة الأطول المسموعة تتقدم على البدائل القصيرة', () => {
    const r = matchSpokenAyah(data, ['الله لا اله الا هو الحي القيوم', 'الله لا اله'])
    expect(r.slice(0, 2).map((m) => `${m.surah}:${m.ayah}`).sort()).toEqual(['2:255', '3:2'])
  })
  it('سورة الإخلاص والمعوذتين', () => {
    expect(matchSpokenAyah(data, 'قل هو الله احد')[0]).toMatchObject({ surah: 112, ayah: 1 })
    expect(matchSpokenAyah(data, 'من شر الوسواس الخناس')[0]).toMatchObject({ surah: 114, ayah: 4 })
  })
  it('الصلاة والرحمن بالإملاء الحديث (الرسم العثماني الصلوٰة والرحمٰن)', () => {
    expect(matchSpokenAyah(data, 'واقيموا الصلاة واتوا الزكاة واركعوا مع الراكعين')[0]).toMatchObject({ surah: 2, ayah: 43 })
    expect(matchSpokenAyah(data, 'الرحمن علم القران')[0]).toMatchObject({ surah: 55, ayah: 1 })
  })
  it('مقطع يمتد عبر آيتين متتاليتين', () => {
    expect(matchSpokenAyah(data, 'الحمد لله رب العالمين الرحمن الرحيم')[0]).toMatchObject({ surah: 1, ayah: 2 })
  })
  it('يتسامح مع خطأ في كلمة واحدة من التعرف على الكلام', () => {
    const r = matchSpokenAyah(data, 'والعصر ان الانسان لفي خسرن')
    expect(r.some((m) => m.surah === 103)).toBe(true)
  })
  it('أفضل نتيجة من بين بدائل التعرف المتعددة', () => {
    expect(matchSpokenAyah(data, ['كلام غير مفهوم', 'انا اعطيناك الكوثر'])[0]).toMatchObject({ surah: 108, ayah: 1 })
  })
  it('نص قصير جدًا أو غير قرآني لا يعطي نتائج مضللة', () => {
    expect(matchSpokenAyah(data, 'زقطبون')).toEqual([])
    // «مرحبا» كلمة قرآنية فعلًا (ص 59)
    expect(matchSpokenAyah(data, 'لا مرحبا بهم')[0]).toMatchObject({ surah: 38, ayah: 59 })
    expect(matchSpokenAyah(data, 'كيف حالك اليوم يا صديقي العزيز').length).toBe(0)
  })
})
