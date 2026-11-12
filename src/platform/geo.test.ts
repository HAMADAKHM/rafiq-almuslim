// تصنيف أخطاء الموقع: «متوقف» فقط لما يعنيه فعلًا؛ خطأ فحص إعدادات Google ليس «متوقفًا».
import { describe, expect, it } from 'vitest'
import { classifyGeoError } from './index'

describe('أخطاء الموقع', () => {
  it('رفض الإذن', () => {
    expect(classifyGeoError({ code: 'OS-PLUG-GLOC-0003', message: 'Location permission request was denied.' })).toBe('denied')
    expect(classifyGeoError({ code: 'DENIED', message: 'denied' })).toBe('denied')
  })
  it('الموقع متوقف فعلًا', () => {
    expect(classifyGeoError({ code: 'OS-PLUG-GLOC-0007', message: 'Location services are not enabled.' })).toBe('off')
    expect(classifyGeoError({ code: 'OS-PLUG-GLOC-0017', message: 'device has both Network and Location turned off.' })).toBe('off')
  })
  it('خطأ إعدادات Google أو رفض نافذة الدقة: نجرّب طريقة أخرى (ليس متوقفًا)', () => {
    expect(classifyGeoError({ code: 'OS-PLUG-GLOC-0016', message: 'Location settings error.' })).toBe('other')
    expect(classifyGeoError({ code: 'OS-PLUG-GLOC-0009', message: 'Request to enable location was denied.' })).toBe('other')
    expect(classifyGeoError({ code: 'OS-PLUG-GLOC-0010', message: 'Could not obtain location in time.' })).toBe('other')
  })
})
