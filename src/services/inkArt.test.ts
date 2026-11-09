// التفسير المصوّر: اختيار المشهد من المعنى، وعدم رسم شخصيات في آيات الأنبياء والملائكة، وتقسيم المعنى الطويل.
import { describe, expect, it } from 'vitest'
import { pickInkScene, prayerPose, stripMarks } from './inkArt'
import { clipSegments, inkTimeline, meaningPages, readSeconds } from './inkVideo'

describe('اختيار مشهد التفسير المصوّر', () => {
  it('يختار المشهد من كلمات المعنى', () => {
    expect(pickInkScene('', 'الذين يقيمون الصلاة في أوقاتها')).toEqual({ scene: 'pray', figure: true })
    expect(pickInkScene('', 'ومما رزقناهم ينفقون في سبيل الله')).toEqual({ scene: 'charity', figure: true })
    expect(pickInkScene('', 'وأمر بالإحسان إلى الوالدين')).toEqual({ scene: 'family', figure: true })
    expect(pickInkScene('', 'لهم جنات تجري من تحتها الأنهار').scene).toBe('garden')
    expect(pickInkScene('', 'كلام عام').scene).toBe('explain')
  })
  it('لا شخصية في ذكر الأنبياء والملائكة والقصص', () => {
    expect(pickInkScene('', 'وأقام موسى الصلاة').figure).toBe(false)
    expect(pickInkScene('وقالت الملائكة', '').figure).toBe(false)
    expect(pickInkScene('', 'ولقد أرسلنا نوحا إلى قومه في الفلك')).toEqual({ scene: 'sea', figure: false })
    expect(pickInkScene('يا أيها الرسول بلغ', '').figure).toBe(false)
  })
  it('مطابقة كلمة كاملة: «الصالحات» و«الملك» لا تعني قصة', () => {
    expect(pickInkScene('', 'الذين آمنوا وعملوا الصالحات').figure).toBe(true)
    expect(pickInkScene(stripMarks('مَٰلِكِ يَوْمِ ٱلدِّينِ'), 'وهو سبحانه وحده مالك يوم القيامة').figure).toBe(true)
  })
  it('دورة الصلاة تمر بالقيام والركوع والسجود', () => {
    expect(prayerPose(0.5).upright).toBe(1)
    expect(prayerPose(4.2).upright).toBe(0)
    expect(prayerPose(8.5).head[1]).toBeGreaterThan(-0.5)
  })
})

describe('فيديو التفسير المصوّر', () => {
  it('المقاطع تُقص على المدى المختار', () => {
    const g = [{ from: 1, to: 2, text: 'أ' }, { from: 3, to: 5, text: 'ب' }, { from: 6, to: 6, text: 'ج' }]
    expect(clipSegments(g, 2, 4)).toEqual([{ from: 2, to: 2, text: 'أ' }, { from: 3, to: 4, text: 'ب' }])
  })
  it('المعنى الطويل صفحات من خمسة أسطر، ومدته بقدر طوله', () => {
    const ctx = { font: '', measureText: (t: string) => ({ width: t.length * 10 }) } as unknown as CanvasRenderingContext2D
    const text = Array.from({ length: 60 }, () => 'كلمة').join(' ')
    const pages = meaningPages(ctx, text, 100)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.every((p) => p.length <= 5)).toBe(true)
    expect(pages.flat().join(' ')).toBe(text)
    expect(readSeconds('قصير')).toBe(7)
    expect(readSeconds('ا'.repeat(400))).toBe(21)
  })
  it('الجدول: التلاوة ثم المعنى (بمدة الصوت إن وُجد)', () => {
    const tl = inkTimeline([{ from: 1, to: 2, text: 'معنى' }], () => 3)
    expect(tl.map((c) => c.kind)).toEqual(['ayah', 'ayah', 'meaning'])
    expect(tl[2].end - tl[2].start).toBeCloseTo(7, 5)
  })
})

describe('حالات من المصحف', () => {
  it('ذكر «الرسل» و«الملائكة» في التفسير وحده لا يحذف الشخصية', () => {
    expect(pickInkScene('الذين يؤمنون بالغيب ويقيمون الصلاة', 'وهم الذين يصدقون بالغيب، مثل الإيمان بالملائكة ورسله، ويقيمون الصلاة')).toEqual({ scene: 'pray', figure: true })
  })
  it('«الوالدين» بالرسم العثماني (بلا ألف) يُعرف', () => {
    expect(pickInkScene('وقضى ربك ألا تعبدوا إلا إياه وبالولدين إحسانا', '').scene).toBe('family')
  })
  it('اسم نبي في التفسير يحذف الشخصية', () => {
    expect(pickInkScene('واذكر في الكتاب', 'واذكر -أيها الرسول- في القرآن قصة إبراهيم').figure).toBe(false)
  })
})
