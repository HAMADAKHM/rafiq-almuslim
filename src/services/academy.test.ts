// الأكاديمية ونظام المحتوى والرقابة الأبوية
import { describe, expect, it } from 'vitest'
import { dailyQuestions, fillMatches, loadProgress, markLesson, recordDaily, recordQuiz } from './academy'
import { PACK_TEMPLATE, hadithNotes, importPack, listPacks, removePack, validatePack } from './contentStore'
import { checkPin, enterKidMode, activeKidId, exitKidMode, kidPathAllowed, newKid, saveKid, loadKids, setPin, timeLeft, addUsage, usedSeconds } from './kids'

describe('التقدم والنقاط', () => {
  it('النقاط عن التحسن فقط، والعلامة الكاملة تمنح شارة، والسلسلة اليومية', async () => {
    await markLesson('salah/salah-how', '2026-11-01', 't1')
    let r = await recordQuiz('salah/salah-how', 2, 3, '2026-11-01', 't1')
    expect(r.gained).toBe(20)
    r = await recordQuiz('salah/salah-how', 2, 3, '2026-11-01', 't1')
    expect(r.gained).toBe(0)
    r = await recordQuiz('salah/salah-how', 3, 3, '2026-11-02', 't1')
    expect(r.gained).toBe(30)
    expect(r.badges).toContain('perfect')
    const p = await loadProgress('t1')
    expect(p.points).toBe(55)
    expect(p.streak.count).toBe(2)
    expect((await recordDaily('2026-11-02', 4, 't1')).gained).toBe(40)
    expect((await recordDaily('2026-11-02', 5, 't1')).gained).toBe(0)
  })
  it('المسابقة اليومية ثابتة لليوم وتتغير بين الأيام، وأسئلة الأطفال من دروسهم فقط', () => {
    const a = dailyQuestions('2026-11-02')
    expect(a).toHaveLength(5)
    expect(dailyQuestions('2026-11-02').map((q) => q.id)).toEqual(a.map((q) => q.id))
    expect(dailyQuestions('2026-11-03').map((q) => q.id)).not.toEqual(a.map((q) => q.id))
    expect(dailyQuestions('2026-11-02', true).length).toBeGreaterThan(2)
  })
  it('إكمال الفراغ يتسامح مع الهمزات وأل التعريف', () => {
    expect(fillMatches('الكعبين', 'الكعبين')).toBe(true)
    expect(fillMatches('كعبين', 'الكعبين')).toBe(true)
    expect(fillMatches('الاحرام', 'الإحرام')).toBe(true)
    expect(fillMatches('', 'الإحرام')).toBe(false)
  })
})

describe('حزم المحتوى', () => {
  it('تُرفض الحزمة بلا مصدر أو حالة، والمعتمد بلا مراجع، والروابط الخارجية في الدروس', () => {
    expect(validatePack({}).ok).toBe(false)
    const bad = { ...PACK_TEMPLATE, items: [{ kind: 'hadith-note', book: 'bukhari', n: 1, sharh: 'نص', source: { title: '' }, review: { status: 'approved', verification: 'secondary' } }] }
    const v = validatePack(bad)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.errors.join(' ')).toMatch(/اسم المصدر|المراجع العلمي/)
    const ext = { ...PACK_TEMPLATE, items: [{ kind: 'lesson', course: 'salah', lesson: { id: 'x', title: 'x', summary: '', blocks: [{ type: 'link', to: 'https://x.y', title: 'x' }], sources: [{ title: 'م' }], review: { status: 'review', verification: 'secondary' } } }] }
    expect(validatePack(ext).ok).toBe(false)
  })
  it('القالب صالح، ويظهر شرحه على الحديث المحدد فقط، ويُحذف', async () => {
    const r = await importPack(PACK_TEMPLATE, 'test')
    expect(r.ok).toBe(true)
    const packs = await listPacks()
    expect(hadithNotes(packs, 'bukhari', 1)).toHaveLength(1)
    expect(hadithNotes(packs, 'bukhari', 2)).toHaveLength(0)
    await removePack(PACK_TEMPLATE.id)
    expect(await listPacks()).toHaveLength(0)
  })
})

describe('الرقابة الأبوية', () => {
  it('رمز PIN مُجزّأ، والخطأ يُرفض، ويُقفل بعد خمس محاولات', async () => {
    await setPin('2468')
    expect(await checkPin('2468', 1000)).toBe('ok')
    for (let i = 0; i < 4; i++) expect(await checkPin('0000', 1000)).toBe('wrong')
    expect(await checkPin('0000', 1000)).toBe('locked')
    expect(await checkPin('2468', 1000 + 60_000)).toBe('locked')
    expect(await checkPin('2468', 1000 + 6 * 60_000)).toBe('ok')
  })
  it('وضع الطفل يقصر المسارات على مساحة الأطفال، ووقت اليوم يُحسب', async () => {
    const k = newKid('سلمى', '7-9')
    await saveKid(k)
    expect((await loadKids()).some((x) => x.id === k.id)).toBe(true)
    await enterKidMode(k.id)
    expect(await activeKidId()).toBe(k.id)
    expect(kidPathAllowed('/kids/letters')).toBe(true)
    expect(kidPathAllowed('/hadith')).toBe(false)
    expect(kidPathAllowed('/settings')).toBe(false)
    await addUsage(k.id, '2026-11-02', 600)
    expect(timeLeft(k, await usedSeconds(k.id, '2026-11-02'), 0)).toBe(30 * 60 - 600)
    expect(timeLeft({ ...k, dailyMinutes: 0 }, 99999, 0)).toBeNull()
    await exitKidMode()
    expect(await activeKidId()).toBeNull()
  })
})
