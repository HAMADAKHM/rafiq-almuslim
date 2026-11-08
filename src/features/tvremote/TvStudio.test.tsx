// استوديو شاشة التلفاز في الجوال: المعاينة، والإرسال للتلفاز، واللقطة الحقيقية، والتصاميم المحفوظة على عدة تلفزيونات
import { beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { clearAll } from '../../db/backup'
import { kv } from '../../db/repos'
import { DEFAULT_STUDIO, pairLink, qrMatrix } from '../../tv/studio'
import { b64, type PairedTv, type Transport, type TvSettingsView } from '../../services/tvRemote'
import { readQr, TvMiniPreview, TvStudio } from './TvStudio'

beforeEach(async () => { cleanup(); await clearAll() })

const tv = (id: string): PairedTv => ({ tvId: id, name: `TV ${id}`, host: '192.168.1.5', port: 8765, deviceId: 'd' + id, token: b64(new Uint8Array(32)), pairedAt: 0 })

describe('المعاينة', () => {
  it('تعكس الأماكن والأحجام: الساعة يسارًا، والمواقيت أعلى، وبلا بطاقة', () => {
    const { container } = render(<TvMiniPreview studio={{ ...DEFAULT_STUDIO, clockSide: 'left', prayersPos: 'top', showCard: false, clockScale: 130, font: 'kufi' }} view={{ scene: 'kaaba', city: 'نابلس' }} />)
    const root = container.querySelector('.tvp')!
    expect(root.getAttribute('data-font')).toBe('kufi')
    expect((container.querySelector('.tvp-main') as HTMLElement).style.flexDirection).toBe('row-reverse')
    expect(container.querySelector('.tvp-card')).toBeNull()
    expect(root.children[1].className).toBe('tvp-prayers')
    expect((container.querySelector('.tvp-clock-col') as HTMLElement).style.fontSize).toBe('130%')
    expect(screen.getByText('الكعبة المشرفة')).toBeInTheDocument()
  })
})

describe('استوديو الشاشة', () => {
  it('كل اختيار يُرسل الاستوديو كاملًا للتلفاز، واللقطة الحقيقية تظهر', async () => {
    const sent: Partial<TvSettingsView>[] = []
    const set = async (p: Partial<TvSettingsView>) => { sent.push(p) }
    const send: Transport = async (o) => (o.path === '/screen' ? { status: 200, body: JSON.stringify({ jpeg: 'QUJD' }) } : { status: 200, body: '{}' })
    render(<TvStudio send={send} tv={tv('a')} st={{ premium: true, studio: DEFAULT_STUDIO, scene: 'rotate' }} set={set} busy={false} />)
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'حجم الساعة' })).getByRole('radio', { name: '130٪' }))
    expect(sent.at(-1)).toEqual({ studio: { ...DEFAULT_STUDIO, clockScale: 130 } })
    fireEvent.click(screen.getByRole('radio', { name: 'سماوي' }))
    expect(sent.at(-1)!.studio).toMatchObject({ clockScale: 130, accent: '#8ec9ff' })
    fireEvent.click(screen.getByRole('radio', { name: 'المواقيت أعلى' }))
    expect(sent.at(-1)!.studio!.prayersPos).toBe('top')
    fireEvent.click(screen.getByRole('button', { name: /لقطة من التلفاز/ }))
    expect(await screen.findByRole('img', { name: 'لقطة من شاشة التلفاز الآن' })).toHaveAttribute('src', 'data:image/jpeg;base64,QUJD')
  })

  it('التصاميم: حفظ باسم، وتطبيق على هذا التلفاز، وعلى كل التلفزيونات المرتبطة', async () => {
    await kv.set('tvremote:tvs', [tv('a'), tv('b'), tv('c')])
    const applied: Partial<TvSettingsView>[] = []
    const calls: { path: string; body?: string; host: string }[] = []
    const send: Transport = async (o) => { calls.push({ path: o.path, body: o.body, host: o.host }); return { status: 200, body: JSON.stringify({ ok: true, settings: {} }) } }
    render(<TvStudio send={send} tv={tv('a')} st={{ premium: true, studio: { ...DEFAULT_STUDIO, font: 'ruqaa' }, scene: 'gallery', galleryCat: 'nature' }} set={async (p) => { applied.push(p) }} busy={false} />)
    fireEvent.change(screen.getByLabelText('اسم التصميم'), { target: { value: 'رمضان' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    const list = await screen.findByRole('list', { name: 'التصاميم المحفوظة' })
    expect(within(list).getByText('رمضان')).toBeInTheDocument()
    expect(within(list).getByText(/صور جاهزة: طبيعة/)).toBeInTheDocument()
    fireEvent.click(within(list).getByRole('button', { name: 'تطبيق' }))
    await waitFor(() => expect(applied.at(-1)).toEqual({ studio: { ...DEFAULT_STUDIO, font: 'ruqaa' }, scene: 'gallery', galleryCat: 'nature' }))
    await act(async () => { fireEvent.click(within(list).getByRole('button', { name: 'على كل التلفزيونات' })) })
    await waitFor(() => expect(calls.filter((c) => c.path === '/settings')).toHaveLength(2))
    expect(JSON.parse(calls[0].body!)).toMatchObject({ studio: { font: 'ruqaa' }, scene: 'gallery' })
    // يبقى بعد إعادة الفتح، ويُحذف
    cleanup()
    render(<TvStudio send={send} tv={tv('a')} st={{ premium: true, studio: DEFAULT_STUDIO }} set={async () => {}} busy={false} />)
    const again = await screen.findByRole('list', { name: 'التصاميم المحفوظة' })
    fireEvent.click(within(again).getByRole('button', { name: 'حذف رمضان' }))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'التصاميم المحفوظة' })).toBeNull())
  })
})

describe('قراءة رمز QR في الجوال', () => {
  it('يقرأ رمز التلفاز من صورة ويستخرج العنوان والمنفذ والرمز', () => {
    const m = qrMatrix(pairLink('10.0.0.7', 8765, '930114'))
    const cell = 5, n = m.length + 8, w = n * cell, px = new Uint8ClampedArray(w * w * 4).fill(255)
    m.forEach((row, r) => row.forEach((on, c) => { if (on) for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) { const i = (((r + 4) * cell + y) * w + (c + 4) * cell + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0 } }))
    expect(readQr(px, w, w)).toEqual({ host: '10.0.0.7', port: 8765, code: '930114' })
    expect(readQr(new Uint8ClampedArray(40 * 40 * 4).fill(255), 40, 40)).toBeNull()
  })
})
