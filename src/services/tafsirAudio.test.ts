// قراءة حزمة تسجيلات التفسير الميسّر (ZIP) جزئيًا: الفهرس وأسماء الملفات واستخراج ملف الآية.
import { describe, expect, it } from 'vitest'
import { extractLocal, findEocd, parseCentralDirectory, parseEntryName } from './tafsirAudio'

/** يبني ZIP صغيرًا (تخزين بلا ضغط) بأسماء ملفات المجمع نفسها */
function makeZip(files: { name: string; data: Uint8Array }[]) {
  const enc = new TextEncoder()
  const local: number[] = [], central: number[] = []
  const le16 = (a: number[], v: number) => a.push(v & 255, (v >> 8) & 255)
  const le32 = (a: number[], v: number) => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255)
  for (const f of files) {
    const n = enc.encode(f.name), off = local.length
    le32(local, 0x04034b50); le16(local, 20); le16(local, 0); le16(local, 0); le32(local, 0); le32(local, 0)
    le32(local, f.data.length); le32(local, f.data.length); le16(local, n.length); le16(local, 0)
    local.push(...n, ...f.data)
    le32(central, 0x02014b50); le16(central, 20); le16(central, 20); le16(central, 0); le16(central, 0); le32(central, 0); le32(central, 0)
    le32(central, f.data.length); le32(central, f.data.length); le16(central, n.length); le16(central, 0); le16(central, 0); le16(central, 0); le16(central, 0); le32(central, 0); le32(central, off)
    central.push(...n)
  }
  const eocd: number[] = []
  le32(eocd, 0x06054b50); le16(eocd, 0); le16(eocd, 0); le16(eocd, files.length); le16(eocd, files.length); le32(eocd, central.length); le32(eocd, local.length); le16(eocd, 0)
  return new Uint8Array([...local, ...central, ...eocd])
}

describe('تسجيلات التفسير الميسّر', () => {
  it('أسماء ملفات المجمع: السورة والآية، ومقدمات السور لا تُفهرس', () => {
    expect(parseEntryName('001_Al-Fatihah_الفاتحة/10-001001-104.mp3')).toEqual({ surah: 1, ayah: 1 })
    expect(parseEntryName('018_Al-Kahf_الكهف/10-018110-104.mp3')).toEqual({ surah: 18, ayah: 110 })
    expect(parseEntryName('001_Al-Fatihah_الفاتحة/10-001A00-104.mp3')).toBeNull()
    expect(parseEntryName('000_Intro_المقدمة/10-000L01-104.mp3')).toBeNull()
    expect(parseEntryName('001_Al-Fatihah_الفاتحة/')).toBeNull()
  })
  it('من نهاية الملف إلى الفهرس ثم استخراج ملف آية بعينه', async () => {
    const a = new Uint8Array([1, 2, 3, 4]), b = new Uint8Array([9, 8, 7])
    const zip = makeZip([
      { name: '001_Al-Fatihah_الفاتحة/', data: new Uint8Array() },
      { name: '001_Al-Fatihah_الفاتحة/10-001001-104.mp3', data: a },
      { name: '001_Al-Fatihah_الفاتحة/10-001A00-104.mp3', data: new Uint8Array([5]) },
      { name: '036_Ya-Sin_يس/10-036058-104.mp3', data: b },
    ])
    const e = findEocd(zip.subarray(zip.length - 100 < 0 ? 0 : 0))!
    const idx = parseCentralDirectory(zip.subarray(e.cdOff, e.cdOff + e.cdSize))
    expect(Object.keys(idx).sort()).toEqual(['1:1', '36:58'])
    const ent = idx['36:58']
    // كما يطلبها التطبيق: من بداية الرأس المحلي مع هامش زائد
    const out = await extractLocal(zip.subarray(ent.off, ent.off + 30 + 512 + ent.csize), ent)
    expect([...out]).toEqual([9, 8, 7])
    expect([...(await extractLocal(zip.subarray(idx['1:1'].off), idx['1:1']))]).toEqual([1, 2, 3, 4])
  })
  it('ملف تالف يُرفض بوضوح', async () => {
    await expect(extractLocal(new Uint8Array(64), { off: 0, csize: 4, size: 4, method: 0 })).rejects.toThrow()
    expect(findEocd(new Uint8Array(40))).toBeNull()
  })
})
