// حالة «رفيق بلس» في التطبيق: يُسأل المتجر عند الفتح وعند العودة للتطبيق وكل 15 دقيقة.
// المحفوظ على الجهاز يُستخدم فقط دون إنترنت ولمدة محدودة بعد آخر تحقق ناجح (انظر entitlement.ts).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { kv } from '../db/repos'
import { useSettings } from '../state/SettingsContext'
import { setPlusActive } from './active'
import { isPlusPalette } from './palettes'
import { billing } from './index'
import { fromCache, isEntitled, type CachedEntitlement } from './entitlement'
import { BillingError, NO_ENTITLEMENT, type BillingProvider, type Entitlement, type Offer } from './types'

const CACHE_KEY = 'billing:entitlement'
/** نسخة معاينة لصاحب التطبيق: كل مزايا بلس مفتوحة للتجربة (VITE_PLUS_UNLOCK=1)، ولا تُستخدم في النسخ المنشورة */
const PREVIEW_UNLOCK = import.meta.env.VITE_PLUS_UNLOCK === '1'
const REFRESH_MS = 15 * 60_000

export interface PlusState {
  provider: BillingProvider
  /** انتهى أول تحقق (أو تعذر) */
  ready: boolean
  /** المزايا المدفوعة مفتوحة الآن (اشتراك ساري، أو نسخة معاينة مفتوحة للتجربة) */
  entitled: boolean
  /** اشتراك ساري فعلًا من المتجر (تعتمد عليه الإعلانات) */
  realEntitled: boolean
  /** نسخة تجريبية: كل المزايا مفتوحة دون اشتراك */
  previewUnlocked: boolean
  entitlement: Entitlement
  offer: Offer | null
  /** آخر تحقق ناجح من المتجر */
  verifiedAt: number | null
  busy: 'purchase' | 'restore' | 'refresh' | null
  /** رسالة للمستخدم بعد شراء أو استعادة أو خطأ */
  message: { kind: 'ok' | 'error' | 'info'; text: string } | null
  purchase(): Promise<void>
  restore(): Promise<void>
  refresh(): Promise<void>
  clearMessage(): void
}

const Ctx = createContext<PlusState | null>(null)

function explain(e: unknown): string {
  if (e instanceof BillingError) {
    if (e.kind === 'cancelled') return 'أُلغيت العملية، ولم يُدفع أي مبلغ.'
    if (e.kind === 'offline') return 'تعذر الاتصال بالمتجر. تحقق من الإنترنت ثم حاول مرة أخرى. التطبيق المجاني يعمل كما هو.'
    if (e.kind === 'payment') return 'لم تكتمل عملية الدفع في المتجر، ولم يُفعَّل الاشتراك. يمكنك المحاولة لاحقًا.'
    if (e.kind === 'unavailable') return 'الاشتراك غير متاح حاليًا. كل ميزات التطبيق المجانية تعمل كما هي.'
    return e.message
  }
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.'
}

export function PlusProvider({ children, provider = billing() }: { children: ReactNode; provider?: BillingProvider }) {
  const [ready, setReady] = useState(false)
  const [entitlement, setEntitlement] = useState<Entitlement>(NO_ENTITLEMENT)
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [busy, setBusy] = useState<PlusState['busy']>(null)
  const [message, setMessage] = useState<PlusState['message']>(null)
  const [now, setNow] = useState(() => Date.now())
  const inited = useRef<Promise<void> | null>(null)

  const save = useCallback(async (e: Entitlement) => {
    const at = Date.now()
    setEntitlement(e); setVerifiedAt(at); setNow(at)
    await kv.set(CACHE_KEY, { entitlement: e, verifiedAt: at } satisfies CachedEntitlement)
  }, [])

  const init = useCallback(() => (inited.current ??= provider.init().catch(() => {})), [provider])

  const refresh = useCallback(async () => {
    setBusy((b) => b ?? 'refresh')
    try {
      await init()
      await save(await provider.getEntitlement())
      setOffer(await provider.getOffer().catch(() => null))
    } catch {
      // دون اتصال: يبقى آخر تحقق ناجح ضمن المهلة فقط
      const c = await kv.get<CachedEntitlement | null>(CACHE_KEY, null)
      setEntitlement(fromCache(c, Date.now()))
      setVerifiedAt(c?.verifiedAt ?? null)
    } finally {
      setReady(true)
      setBusy((b) => (b === 'refresh' ? null : b))
    }
  }, [init, provider, save])

  useEffect(() => {
    let alive = true
    kv.get<CachedEntitlement | null>(CACHE_KEY, null).then((c) => { if (alive) { setEntitlement(fromCache(c, Date.now())); setVerifiedAt(c?.verifiedAt ?? null) } })
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(refresh, REFRESH_MS)
    // انتهاء الفترة يُغلق المزايا فورًا حتى قبل التحقق التالي
    const tick = setInterval(() => setNow(Date.now()), 30_000)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); clearInterval(t); clearInterval(tick) }
  }, [refresh])

  const purchase = useCallback(async () => {
    setBusy('purchase'); setMessage(null)
    try {
      await init()
      const e = await provider.purchase()
      await save(e)
      setMessage(isEntitled(e, Date.now()) ? { kind: 'ok', text: 'تم تفعيل رفيق بلس. جزاك الله خيرًا.' } : { kind: 'info', text: 'لم يُفعَّل الاشتراك بعد. إن دفعت فعلًا اضغط «استعادة المشتريات» بعد قليل.' })
    } catch (e) {
      setMessage({ kind: e instanceof BillingError && e.kind === 'cancelled' ? 'info' : 'error', text: explain(e) })
    } finally { setBusy(null) }
  }, [init, provider, save])

  const restore = useCallback(async () => {
    setBusy('restore'); setMessage(null)
    try {
      await init()
      const e = await provider.restore()
      await save(e)
      setMessage(isEntitled(e, Date.now()) ? { kind: 'ok', text: 'تمت استعادة اشتراكك في رفيق بلس.' } : { kind: 'info', text: 'لا يوجد اشتراك ساري مرتبط بحساب المتجر على هذا الجهاز.' })
    } catch (e) {
      setMessage({ kind: 'error', text: explain(e) })
    } finally { setBusy(null) }
  }, [init, provider, save])

  const value = useMemo<PlusState>(() => ({
    provider, ready, entitlement, offer, verifiedAt, busy, message,
    entitled: PREVIEW_UNLOCK || isEntitled(entitlement, now),
    realEntitled: isEntitled(entitlement, now),
    previewUnlocked: PREVIEW_UNLOCK,
    purchase, restore, refresh, clearMessage: () => setMessage(null),
  }), [provider, ready, entitlement, offer, verifiedAt, busy, message, now, purchase, restore, refresh])

  useEffect(() => { setPlusActive(value.entitled) }, [value.entitled])

  return <Ctx.Provider value={value}><PlusPaletteApplier entitled={value.entitled} />{children}</Ctx.Provider>
}

/** لوحة الألوان الإضافية تُطبَّق مع اشتراك ساري فقط، وتعود ألوان التطبيق الأصلية عند انتهائه */
function PlusPaletteApplier({ entitled }: { entitled: boolean }) {
  const { settings } = useSettings()
  useEffect(() => {
    const root = document.documentElement
    const id = settings.plusPalette
    if (entitled && id && isPlusPalette(id)) root.dataset.palette = id
    else delete root.dataset.palette
  }, [entitled, settings.plusPalette])
  return null
}

export function usePlus(): PlusState {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePlus خارج PlusProvider')
  return v
}
