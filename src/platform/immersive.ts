// ملء الشاشة لصفحة المصحف (Android): إخفاء شريط الحالة وشريط التنقل أثناء القراءة.
import { registerPlugin } from '@capacitor/core'
import { platformName } from './index'

const Immersive = registerPlugin<{ enter(): Promise<void>; exit(): Promise<void> }>('Immersive')

export async function enterImmersive() { if (platformName() === 'android') await Immersive.enter().catch(() => {}) }
export async function exitImmersive() { if (platformName() === 'android') await Immersive.exit().catch(() => {}) }
