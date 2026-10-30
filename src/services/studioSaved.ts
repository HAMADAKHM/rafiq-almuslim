// تصاميمي: حفظ إعدادات التصاميم المفضلة على الجهاز فقط (المرجع والمظهر، لا الصورة الناتجة).
// النص لا يُحفظ أبدًا: يُعاد جلبه من المصحف أو من مكتبة المحتوى الموثقة عند الفتح، فلا يتغير نص قرآني أو نبوي.
import { kv } from '../db/repos'
import type { StudioStyle } from './studio'

export const SAVED_KEY = 'studio:saved'
export const MAX_SAVED = 40
export type StudioSource = 'ayah' | 'adhkar' | 'duas' | 'hadith' | 'deceased'

export interface SavedDesign {
  id: string
  at: number
  title: string
  source: StudioSource
  /** للآيات */
  surah?: number
  from?: number
  to?: number
  /** للأذكار والأدعية والأحاديث */
  category?: string
  item?: string
  style: StudioStyle
}

export const loadSaved = () => kv.get<SavedDesign[]>(SAVED_KEY, [])

/** صور المستخدم وفيديوهاته لا تُحفظ (قد تكون خاصة وكبيرة): تُستبدل بخلفية افتراضية */
export function portableStyle(s: StudioStyle): StudioStyle {
  return s.bg === 'photo' || s.bg === 'video' ? { ...s, bg: 'scene-sunset' } : { ...s }
}

export function addSaved(list: SavedDesign[], d: Omit<SavedDesign, 'id' | 'at'>, now = Date.now()): SavedDesign[] {
  const same = (x: SavedDesign) => x.source === d.source && x.surah === d.surah && x.from === d.from && x.to === d.to && x.item === d.item && JSON.stringify(x.style) === JSON.stringify(portableStyle(d.style))
  const item: SavedDesign = { ...d, style: portableStyle(d.style), id: `d${now.toString(36)}`, at: now }
  return [item, ...list.filter((x) => !same(x))].slice(0, MAX_SAVED)
}

export const saveDesigns = (list: SavedDesign[]) => kv.set(SAVED_KEY, list)
