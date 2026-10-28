// التوافق مع RemoteCore.java: القيم المرجعية نفسها في RemoteCoreTest.interopWithPhoneCrypto
import { describe, expect, it } from 'vitest'
import { addTvBackground, b64, decryptSecret, fitSize, listTvBackgrounds, pairKey, pairProof, parseAddress, removeTvBackground, signRequest, unb64, type Transport } from './tvRemote'
import { nextPhoto } from '../tv/PhotoScene'

const PN = 'AQEBAQEBAQEBAQEBAQEBAQ==', TN = 'AgICAgICAgICAgICAgICAg=='

describe('التحكم بالتلفاز: التشفير مطابق للتلفاز', () => {
  it('مفتاح الربط والإثبات', async () => {
    const k = await pairKey('123456', PN, TN)
    expect(b64(k)).toBe('M9HUOG9XUCVIMqRfA/nRcXbzalUV71Tik81SrN5O6t8=')
    expect(await pairProof(k, 'جوال أحمد')).toBe('pyfJ7uOk93Tev/fv8nf64MrGupiJNfpf6fRvUB+PCko=')
  })
  it('فك سر الربط المشفّر من التلفاز (AES-GCM)', async () => {
    const k = await pairKey('123456', PN, TN)
    expect(await decryptSecret(k, b64(new Uint8Array(12).fill(3)), 'JcImyhT7fRqvvKTzaybuUEXPo5CVpqg=')).toBe('{"a":1}')
    // رمز خاطئ = مفتاح خاطئ = فشل الفك
    await expect(decryptSecret(await pairKey('654321', PN, TN), b64(new Uint8Array(12).fill(3)), 'JcImyhT7fRqvvKTzaybuUEXPo5CVpqg=')).rejects.toThrow()
  })
  it('توقيع الطلبات', async () => {
    const token = b64(new Uint8Array(32).fill(4))
    expect(await signRequest(token, 'POST', '/settings', 1_800_000_000_000, '{"scene":"aurora"}')).toBe('a0tjemxrvC6OftbagatrX1/u0+APThYJYetba1jUsCU=')
    expect(await signRequest(token, 'POST', '/settings', 1_800_000_000_001, '{"scene":"aurora"}')).not.toBe('a0tjemxrvC6OftbagatrX1/u0+APThYJYetba1jUsCU=')
    expect([...unb64(b64(new Uint8Array([1, 2, 250])))]).toEqual([1, 2, 250])
  })
  it('العنوان اليدوي: الشبكة المحلية فقط', () => {
    expect(parseAddress('192.168.1.20')).toEqual({ host: '192.168.1.20', port: 8765 })
    expect(parseAddress(' 10.0.0.5:8766 ')).toEqual({ host: '10.0.0.5', port: 8766 })
    expect(parseAddress('172.20.1.1')).not.toBeNull()
    expect(parseAddress('8.8.8.8')).toBeNull()
    expect(parseAddress('192.168.1.300')).toBeNull()
    expect(parseAddress('tv.local')).toBeNull()
  })
})

describe('خلفيات من صورك', () => {
  it('التصغير لشاشة التلفاز دون تكبير الصور الصغيرة', () => {
    expect(fitSize(4032, 3024)).toEqual({ w: 1920, h: 1440 })
    expect(fitSize(1080, 2400)).toEqual({ w: 864, h: 1920 })
    expect(fitSize(800, 600)).toEqual({ w: 800, h: 600 })
    expect(fitSize(0, 0)).toEqual({ w: 0, h: 0 })
  })
  it('الإرسال والقائمة والحذف بطلبات موقّعة، ومهلة أطول للإرسال، ورسالة واضحة لتطبيق تلفاز قديم', async () => {
    const calls: { method: string; path: string; body?: string; timeoutMs?: number; sig?: string }[] = []
    let stored: { id: string; at: number; size: number }[] = []
    const send: Transport = async (o) => {
      calls.push({ method: o.method, path: o.path, body: o.body, timeoutMs: o.timeoutMs, sig: o.headers?.['X-Rafiq-Sig'] })
      if (o.path === '/backgrounds' && o.method === 'POST') stored = [...stored, { id: 'a' + stored.length, at: 1, size: 1000 }]
      if (o.path === '/backgrounds/delete') stored = stored.filter((x) => x.id !== JSON.parse(o.body!).id)
      return { status: 200, body: JSON.stringify({ ok: true, items: stored }) }
    }
    const tv = { tvId: 't', name: 'TV', host: '192.168.1.5', port: 8765, deviceId: 'd', token: b64(new Uint8Array(32)), pairedAt: 0 }
    expect(await addTvBackground(send, tv, '/9j/AAAA')).toHaveLength(1)
    expect(calls[0].timeoutMs).toBe(15000)
    expect(calls[0].sig).toBeTruthy()
    expect(JSON.parse(calls[0].body!)).toEqual({ data: '/9j/AAAA' })
    expect(await listTvBackgrounds(send, tv)).toHaveLength(1)
    expect(await removeTvBackground(send, tv, 'a0')).toHaveLength(0)
    const old: Transport = async () => ({ status: 404, body: '{"error":"not_found"}' })
    await expect(listTvBackgrounds(old, tv)).rejects.toThrow(/حدّثه/)
  })
})

describe('عرض الصور على التلفاز', () => {
  it('الصورة التالية: بالترتيب، أو عشوائيًا دون تكرار الحالية', () => {
    expect(nextPhoto([], null, false)).toBeNull()
    expect(nextPhoto(['a'], 'a', true)).toBe('a')
    expect(nextPhoto(['a', 'b', 'c'], null, false)).toBe('a')
    expect(nextPhoto(['a', 'b', 'c'], 'c', false)).toBe('a')
    for (let i = 0; i < 20; i++) expect(nextPhoto(['a', 'b', 'c'], 'b', true)).not.toBe('b')
  })
})
