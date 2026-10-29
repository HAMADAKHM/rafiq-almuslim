// أيقونة التطبيق في الشاشة الرئيسية (Android فقط عبر AppIconPlugin). على iOS تحتاج نسخة مبنية على Mac.
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'
import type { AppIconId } from '../themes/appIcons'

const AppIcon = registerPlugin<{ get(): Promise<{ id: AppIconId }>; set(o: { id: AppIconId }): Promise<{ id: AppIconId }> }>('AppIcon')

export const appIconSupported = () => platformName() === 'android'
export async function getAppIcon(): Promise<AppIconId> {
  if (!appIconSupported()) return 'default'
  try { return (await AppIcon.get()).id } catch { return 'default' }
}
export async function setAppIcon(id: AppIconId): Promise<boolean> {
  if (!appIconSupported()) return false
  try { await AppIcon.set({ id }); return true } catch { return false }
}
