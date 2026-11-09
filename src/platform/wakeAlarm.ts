// منبّه الصحوة (Android عبر AlarmPlugin): المنبهات تُحفظ في التطبيق وتُجدول بمنبه النظام الدقيق.
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'
import type { WakeAlarm } from '../state/settings'

const WakeAlarmNative = registerPlugin<{
  set(o: { data: string }): Promise<{ exact: boolean; next: number }>
  status(): Promise<{ exact: boolean; next: number }>
  openExactSettings(): Promise<void>
  test(o: { alarm: string }): Promise<void>
  stop(): Promise<void>
}>('WakeAlarm')

export const wakeAlarmSupported = () => platformName() === 'android'

export interface WakeStatus { exact: boolean; next: number }

export async function syncWakeAlarms(list: WakeAlarm[]): Promise<WakeStatus | null> {
  if (!wakeAlarmSupported()) return null
  try { return await WakeAlarmNative.set({ data: JSON.stringify(list) }) } catch { return null }
}
export async function wakeStatus(): Promise<WakeStatus | null> {
  if (!wakeAlarmSupported()) return null
  try { return await WakeAlarmNative.status() } catch { return null }
}
export async function openExactAlarmSettings(): Promise<void> {
  try { await WakeAlarmNative.openExactSettings() } catch { /* غير متاح */ }
}
export async function testWakeAlarm(a: WakeAlarm): Promise<boolean> {
  if (!wakeAlarmSupported()) return false
  try { await WakeAlarmNative.test({ alarm: JSON.stringify(a) }); return true } catch { return false }
}
export async function stopWakeAlarm(): Promise<void> {
  try { await WakeAlarmNative.stop() } catch { /* لا شيء */ }
}
