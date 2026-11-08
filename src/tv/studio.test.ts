import { describe, expect, it } from 'vitest'
import jsQR from 'jsqr'
import { DEFAULT_STUDIO, normalizeStudio, pairLink, parsePairLink, qrMatrix, qrSvgPath } from './studio'

/** يرسم المصفوفة صورةً (4 بكسلات للخلية مع هامش) كما تلتقطها كاميرا الجوال */
function render(m: boolean[][], cell = 4) {
  const n = m.length + 8, w = n * cell
  const px = new Uint8ClampedArray(w * w * 4).fill(255)
  m.forEach((row, r) => row.forEach((on, c) => {
    if (!on) return
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) { const i = (((r + 4) * cell + y) * w + (c + 4) * cell + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0 }
  }))
  return { px, w }
}

describe('الربط برمز QR', () => {
  it('رمز التلفاز يُقرأ في الجوال ويعطي العنوان والمنفذ والرمز نفسها', () => {
    const link = pairLink('192.168.1.23', 8765, '048213')
    const { px, w } = render(qrMatrix(link))
    const got = jsQR(px, w, w)
    expect(got?.data).toBe(link)
    expect(parsePairLink(got!.data)).toEqual({ host: '192.168.1.23', port: 8765, code: '048213' })
  })
  it('يرفض العناوين خارج الشبكة المنزلية والرموز الخاطئة وأي رابط آخر', () => {
    expect(parsePairLink('rafiqtv://pair?h=8.8.8.8&p=8765&c=123456')).toBeNull()
    expect(parsePairLink('rafiqtv://pair?h=192.168.1.300&p=8765&c=123456')).toBeNull()
    expect(parsePairLink('rafiqtv://pair?h=10.0.0.5&p=80&c=123456')).toBeNull()
    expect(parsePairLink('rafiqtv://pair?h=10.0.0.5&p=8765&c=12345')).toBeNull()
    expect(parsePairLink('https://evil.example/pair?h=10.0.0.5&p=8765&c=123456')).toBeNull()
    expect(parsePairLink('rafiqtv://pair?h=172.20.1.2&p=8765&c=000111')).toEqual({ host: '172.20.1.2', port: 8765, code: '000111' })
  })
  it('مسار SVG بهامش 4 خلايا', () => {
    const m = qrMatrix('x')
    const s = qrSvgPath(m)
    expect(s.size).toBe(m.length + 8)
    expect(s.d.startsWith('M')).toBe(true)
  })
})

describe('إعدادات الاستوديو', () => {
  it('القيم غير المقبولة تعود للافتراضي، والألوان تُقبل بأي حالة أحرف', () => {
    expect(normalizeStudio(null)).toEqual(DEFAULT_STUDIO)
    expect(normalizeStudio({ clockScale: 130, prayersScale: 75, font: 'comic', accent: '#7FD8BE', clockSide: 'left', prayersPos: 'top', showCard: false }))
      .toEqual({ ...DEFAULT_STUDIO, clockScale: 130, accent: '#7fd8be', clockSide: 'left', prayersPos: 'top', showCard: false })
  })
})
