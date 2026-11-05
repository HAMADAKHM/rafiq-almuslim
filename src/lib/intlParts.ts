// بديل آمن لـ Intl.DateTimeFormat#formatToParts: غير موجود في المتصفحات القديمة (مثل WebView في تلفزيونات
// Android 7 بإصدار Chrome 51). عند غيابه يُستخرج كل حقل بتنسيق مستقل له وحده، فتبقى المواقيت والتواريخ صحيحة.

export type Part = { type: string; value: string }
const FIELDS = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const

const toLatin = (s: string) => s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))

export function formatParts(locale: string, opts: Intl.DateTimeFormatOptions, date: Date): Part[] {
  const f = new Intl.DateTimeFormat(locale, opts)
  const native = (f as unknown as { formatToParts?: ((d: Date) => Part[]) & { __rafiq?: boolean } }).formatToParts
  if (typeof native === 'function' && !native.__rafiq) return native.call(f, date)
  const out: Part[] = []
  for (const k of FIELDS) {
    if (!opts[k]) continue
    const one: Intl.DateTimeFormatOptions = { timeZone: opts.timeZone, [k]: opts[k] }
    if (k === 'hour') one.hour12 = false
    const raw = toLatin(new Intl.DateTimeFormat(locale, one).format(date))
    const digits = raw.match(/\d+/)?.[0] ?? '0'
    const n = k === 'hour' ? Number(digits) % 24 : Number(digits)
    out.push({ type: k, value: opts[k] === '2-digit' ? String(n).padStart(2, '0') : String(n) })
  }
  return out
}

/** قيمة حقل رقمية من الأجزاء */
export const partNum = (parts: Part[], t: string) => Number(toLatin(parts.find((p) => p.type === t)?.value ?? '0').replace(/\D/g, '') || 0)

/** يضيف formatToParts للمتصفحات القديمة، فتعمل أي شيفرة تستخدمه (بما فيها المكتبات) */
export function installFormatToParts() {
  try {
    const proto = Intl.DateTimeFormat.prototype as { formatToParts?: unknown }
    if (typeof proto.formatToParts === 'function') return
    const fn = function (this: Intl.DateTimeFormat, d?: Date | number) {
      const ro = this.resolvedOptions() as Intl.DateTimeFormatOptions & { locale: string }
      return formatParts(ro.locale, ro, d === undefined ? new Date() : new Date(d))
    } as ((d?: Date | number) => Part[]) & { __rafiq?: boolean }
    fn.__rafiq = true
    Object.defineProperty(proto, 'formatToParts', { value: fn, configurable: true, writable: true })
  } catch { /* لا شيء */ }
}
