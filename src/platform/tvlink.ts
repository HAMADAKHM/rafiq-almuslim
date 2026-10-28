// جسر إضافة TvLink (Android): إيجاد شاشة التلفاز في الشبكة المنزلية وإرسال الطلبات إليها.
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'

export interface FoundTv { name: string; host: string; port: number }
export interface TvResponse { status: number; body: string }

const TvLink = registerPlugin<{
  discover(o: { timeoutMs?: number }): Promise<{ devices: FoundTv[] }>
  request(o: { host: string; port: number; method: string; path: string; body?: string; headers?: Record<string, string>; timeoutMs?: number }): Promise<TvResponse>
}>('TvLink')

/** متاح في تطبيق Android فقط (iOS يحتاج إضافة Bonjour منفصلة) */
export const tvLinkSupported = () => platformName() === 'android'

export async function discoverTvs(timeoutMs = 4000): Promise<FoundTv[]> {
  if (!tvLinkSupported()) return []
  return (await TvLink.discover({ timeoutMs })).devices ?? []
}

export function tvRequest(o: { host: string; port: number; method: string; path: string; body?: string; headers?: Record<string, string>; timeoutMs?: number }): Promise<TvResponse> {
  return TvLink.request({ ...o, timeoutMs: o.timeoutMs ?? 7000 })
}
