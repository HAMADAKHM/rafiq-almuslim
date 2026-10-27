import { beforeEach, describe, expect, it } from 'vitest'
import { clearAll } from '../db/backup'
import { getRecording, recordedIds, removeRecording, saveRecording, validateRecording } from './dhikrAudio'

const meta = { reciter: 'الشيخ فلان', source: 'تسجيل خاص', license: 'إذن كتابي', rights: true }
beforeEach(async () => { await clearAll() })

describe('تسجيلات الأذكار المرخصة', () => {
  it('لا يُقبل تسجيل بلا بيانات الترخيص وتأكيد الحق', () => {
    const f = { name: 'a.mp3', type: 'audio/mpeg', size: 1000 }
    expect(validateRecording(f, meta)).toBeNull()
    expect(validateRecording(f, { ...meta, rights: false })).toContain('أكّد')
    expect(validateRecording(f, { ...meta, license: ' ' })).toContain('الترخيص')
    expect(validateRecording({ ...f, name: 'x.pdf', type: 'application/pdf' }, meta)).toContain('صوتيًا')
    expect(validateRecording({ ...f, size: 30 * 1024 * 1024 }, meta)).toContain('20')
  })
  it('يُحفظ ويُسترجع ويُحذف', async () => {
    await saveRecording({ itemId: 's-short', blob: new Blob([new Uint8Array([1, 2])], { type: 'audio/mpeg' }), ...meta, addedAt: 1 })
    expect(await recordedIds()).toEqual(['s-short'])
    expect((await getRecording('s-short'))?.reciter).toBe('الشيخ فلان')
    await removeRecording('s-short')
    expect(await recordedIds()).toEqual([])
    expect(await getRecording('s-short')).toBeNull()
  })
})
