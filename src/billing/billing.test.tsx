// اختبارات نظام «رفيق بلس» دون أي دفع حقيقي: الشراء والاستعادة والإلغاء والانتهاء، وعدم الوثوق بالمحفوظ محليًا وحده.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { clearAll } from '../db/backup'
import { kv } from '../db/repos'
import { fromCache, isEntitled, OFFLINE_GRACE_MS } from './entitlement'
import { createSandbox, sandboxEntitlement, SANDBOX_PERIOD_MS } from './sandbox'
import { PlusProvider, usePlus } from './PlusContext'
import { PlusGate } from './PlusGate'
import { BillingError, NO_ENTITLEMENT, type BillingProvider } from './types'

beforeEach(async () => { cleanup(); await clearAll() })

describe('قرار فتح المزايا', () => {
  const now = Date.UTC(2026, 9, 26, 12)
  const ent = { active: true, productId: 'rafiq_plus_monthly', expiresAt: now + 86_400_000, willRenew: true, manageUrl: null }
  it('نشط قبل انتهاء الفترة فقط', () => {
    expect(isEntitled(ent, now)).toBe(true)
    expect(isEntitled({ ...ent, expiresAt: now - 1 }, now)).toBe(false)
    expect(isEntitled({ ...ent, active: false }, now)).toBe(false)
  })
  it('المحفوظ محليًا لا يُقبل إن كان التحقق قديمًا أو من المستقبل أو منتهيًا', () => {
    expect(fromCache({ entitlement: ent, verifiedAt: now - 1000 }, now).active).toBe(true)
    expect(fromCache({ entitlement: ent, verifiedAt: now - OFFLINE_GRACE_MS - 1 }, now)).toEqual(NO_ENTITLEMENT)
    expect(fromCache({ entitlement: ent, verifiedAt: now + 60_000 }, now)).toEqual(NO_ENTITLEMENT)
    expect(fromCache({ entitlement: { ...ent, expiresAt: now - 1 }, verifiedAt: now - 1000 }, now)).toEqual(NO_ENTITLEMENT)
    expect(fromCache(null, now)).toEqual(NO_ENTITLEMENT)
  })
})

describe('متجر الاختبار', () => {
  it('الشراء ثم التجديد التلقائي ثم الإلغاء والانتهاء في نهاية الفترة', async () => {
    let t = 1_000_000
    const sb = createSandbox(() => t)
    expect((await sb.getEntitlement()).active).toBe(false)
    const e1 = await sb.purchase()
    expect(e1.active && e1.willRenew).toBe(true)
    expect(e1.expiresAt).toBe(t + SANDBOX_PERIOD_MS)
    t += SANDBOX_PERIOD_MS * 2 + 1000 // تجدد مرتين
    const e2 = await sb.getEntitlement()
    expect(e2.active).toBe(true)
    expect(e2.expiresAt).toBe(1_000_000 + SANDBOX_PERIOD_MS * 3)
    await sb.cancel()
    const e3 = await sb.getEntitlement()
    expect(e3.active && !e3.willRenew).toBe(true)
    t = e3.expiresAt! + 1
    expect((await sb.getEntitlement()).active).toBe(false)
    // الاستعادة لا تفتح اشتراكًا منتهيًا
    expect((await sb.restore()).active).toBe(false)
  })
  it('الاستعادة تعيد الاشتراك الساري (بعد إعادة التثبيت)', async () => {
    const sb = createSandbox()
    await sb.purchase()
    await kv.set('billing:entitlement', null) // حُذفت بيانات التطبيق المحلية
    expect((await sb.restore()).active).toBe(true)
  })
  it('فشل الدفع وانقطاع الإنترنت لا يفعّلان الاشتراك', async () => {
    const sb = createSandbox()
    sb.faults.declined = true
    await expect(sb.purchase()).rejects.toMatchObject({ kind: 'payment' })
    sb.faults.declined = false
    sb.faults.offline = true
    await expect(sb.purchase()).rejects.toMatchObject({ kind: 'offline' })
    sb.faults.offline = false
    expect((await sb.getEntitlement()).active).toBe(false)
  })
  it('السجل الفارغ = لا اشتراك', () => {
    expect(sandboxEntitlement(null, Date.now())).toEqual(NO_ENTITLEMENT)
  })
})

function Probe() {
  const p = usePlus()
  return (
    <div>
      <span data-testid="state">{p.ready ? (p.entitled ? 'plus' : 'free') : 'loading'}</span>
      <span data-testid="msg">{p.message?.text ?? ''}</span>
      <button onClick={p.purchase}>buy</button>
      <button onClick={p.restore}>restore</button>
      <PlusGate feature="test" title="ميزة"><span>محتوى مدفوع</span></PlusGate>
    </div>
  )
}
const ui = (provider: BillingProvider) => render(<MemoryRouter><PlusProvider provider={provider}><Probe /></PlusProvider></MemoryRouter>)

describe('حالة الاشتراك في التطبيق', () => {
  it('قيمة محلية مزورة لا تفتح المزايا حين يقول المتجر لا اشتراك', async () => {
    await kv.set('billing:entitlement', { entitlement: { active: true, productId: 'x', expiresAt: null, willRenew: true, manageUrl: null }, verifiedAt: Date.now() })
    ui(createSandbox())
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('free'))
    expect(screen.queryByText('محتوى مدفوع')).toBeNull()
    expect(document.querySelector('[data-plus-lock="test"]')).not.toBeNull()
  })
  it('الشراء يفتح الميزة، وفشل الدفع يعرض رسالة ولا يفتحها', async () => {
    const sb = createSandbox()
    sb.faults.declined = true
    ui(sb)
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('free'))
    await act(async () => { screen.getByText('buy').click() })
    await waitFor(() => expect(screen.getByTestId('msg').textContent).toMatch(/لم تكتمل عملية الدفع/))
    expect(screen.queryByText('محتوى مدفوع')).toBeNull()
    sb.faults.declined = false
    await act(async () => { screen.getByText('buy').click() })
    await waitFor(() => expect(screen.getByText('محتوى مدفوع')).toBeTruthy())
    expect(document.querySelector('[data-plus-lock]')).toBeNull()
  })
  it('دون إنترنت: آخر تحقق حديث يبقى ساريًا، ولا يتعطل التطبيق', async () => {
    const sb = createSandbox()
    await sb.purchase()
    await kv.set('billing:entitlement', { entitlement: await sb.getEntitlement(), verifiedAt: Date.now() - 60_000 })
    sb.faults.offline = true
    ui(sb)
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('plus'))
  })
  it('مزوّد غير متاح (نسخة منشورة بلا مفتاح متجر): لا شيء يُفتح ورسالة واضحة', async () => {
    const none: BillingProvider = {
      id: 'none', test: false, async init() {}, async getOffer() { return null }, async getEntitlement() { return NO_ENTITLEMENT },
      async purchase() { throw new BillingError('unavailable', 'x') }, async restore() { return NO_ENTITLEMENT },
    }
    ui(none)
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('free'))
    await act(async () => { screen.getByText('buy').click() })
    await waitFor(() => expect(screen.getByTestId('msg').textContent).toMatch(/غير متاح/))
  })
})
