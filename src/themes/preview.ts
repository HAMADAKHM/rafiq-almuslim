// معاينة الثيم: يُطبَّق مؤقتًا على التطبيق كله (يتنقل المستخدم بين الصفحات ليرى شكلها) دون تغيير اختياره الدائم.
// في الذاكرة فقط: تزول عند الإلغاء أو التطبيق أو إعادة فتح التطبيق.
import { useSyncExternalStore } from 'react'

let current: string | null = null
const subs = new Set<() => void>()
export function setThemePreview(id: string | null) { current = id; subs.forEach((f) => f()) }
export const getThemePreview = () => current
export function useThemePreview(): string | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => current, () => null)
}
