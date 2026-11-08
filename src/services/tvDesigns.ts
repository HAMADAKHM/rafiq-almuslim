// تصاميم شاشة التلفاز المحفوظة في الجوال: استوديو الشاشة مع المشهد، تُطبَّق على أي تلفاز مرتبط أو عليها كلها.
import { kv } from '../db/repos'
import { normalizeStudio, type StudioSettings } from '../tv/studio'
import type { TvSettingsView } from './tvRemote'

export interface TvDesign { id: string; name: string; studio: StudioSettings; scene?: string; galleryCat?: TvSettingsView['galleryCat']; at: number }
const KEY = 'tvremote:designs'
export const MAX_DESIGNS = 20

export const loadDesigns = () => kv.get<TvDesign[]>(KEY, [])

/** يحفظ تصميمًا باسم (اسم مكرر يستبدل القديم) */
export async function saveDesign(name: string, view: Pick<TvSettingsView, 'studio' | 'scene' | 'galleryCat'>): Promise<TvDesign[]> {
  const clean = name.trim().slice(0, 40)
  if (!clean) throw new Error('empty')
  const d: TvDesign = { id: `d${Date.now().toString(36)}`, name: clean, studio: normalizeStudio(view.studio), scene: view.scene, galleryCat: view.galleryCat, at: Date.now() }
  const list = [d, ...(await loadDesigns()).filter((x) => x.name !== clean)].slice(0, MAX_DESIGNS)
  await kv.set(KEY, list)
  return list
}

export async function removeDesign(id: string): Promise<TvDesign[]> {
  const list = (await loadDesigns()).filter((x) => x.id !== id)
  await kv.set(KEY, list)
  return list
}

/** ما يُرسل للتلفاز عند تطبيق التصميم */
export function designPatch(d: TvDesign): Partial<TvSettingsView> {
  return { studio: normalizeStudio(d.studio), ...(d.scene ? { scene: d.scene } : {}), ...(d.galleryCat ? { galleryCat: d.galleryCat } : {}) }
}
