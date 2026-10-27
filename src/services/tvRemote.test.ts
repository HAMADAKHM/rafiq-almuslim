// التوافق مع RemoteCore.java: القيم المرجعية نفسها في RemoteCoreTest.interopWithPhoneCrypto
import { describe, expect, it } from 'vitest'
import { b64, decryptSecret, pairKey, pairProof, parseAddress, signRequest, unb64 } from './tvRemote'

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
