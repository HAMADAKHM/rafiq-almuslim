// «أذكار الأحبة»: ملف لكل عزيز فيه أدعية مختارة من المكتبة الموثقة بحسب صلته، وأدعية يكتبها المستخدم.
// على الجهاز فقط (IndexedDB)، ولا يُنشأ أي نص ديني من عندنا.
import { kv } from '../db/repos'

export type Relation = 'parents' | 'child' | 'spouse' | 'sick' | 'deceased' | 'other'
export interface BelovedProfile { id: string; name: string; relation: Relation; items: string[]; custom: string[]; createdAt: number }

/** الصلات وأدعيتها المقترحة (معرّفات من src/content/duas.ts) */
export const RELATIONS: { id: Relation; label: string; suggest: string[] }[] = [
  { id: 'parents', label: 'الوالدان', suggest: ['dp-1', 'dp-2', 'dp-4', 'dp-5'] },
  { id: 'child', label: 'الأبناء', suggest: ['dq-12', 'dq-7', 'dq-4'] },
  { id: 'spouse', label: 'الزوج أو الزوجة', suggest: ['dq-12', 'dq-1'] },
  { id: 'sick', label: 'مريض', suggest: ['dh-1', 'dh-3', 'dh-4', 'dh-5'] },
  { id: 'deceased', label: 'متوفى', suggest: ['dp-6', 'dp-3', 'dq-13'] },
  { id: 'other', label: 'قريب أو صديق', suggest: ['dq-13', 'dq-1'] },
]

const KEY = 'beloved:list'
export const MAX_PROFILES = 30
export const loadBeloved = () => kv.get<BelovedProfile[]>(KEY, [])
export const saveBeloved = (list: BelovedProfile[]) => kv.set(KEY, list.slice(0, MAX_PROFILES))

export function newProfile(name: string, relation: Relation, now = Date.now()): BelovedProfile {
  const r = RELATIONS.find((x) => x.id === relation) ?? RELATIONS[RELATIONS.length - 1]
  return { id: `b${now.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, name: name.trim().slice(0, 40), relation: r.id, items: [...r.suggest], custom: [], createdAt: now }
}

export const relationLabel = (r: Relation) => RELATIONS.find((x) => x.id === r)?.label ?? ''
