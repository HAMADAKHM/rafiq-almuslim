// تصدير بيانات المستخدم واستعادتها كملف JSON (نسخة احتياطية يملكها المستخدم).
import { db, STORES, DB_VERSION, type StoreName } from './db'
import { notifyChange } from './events'

export const BACKUP_FORMAT = 'islamic-companion-backup'

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  data: Record<StoreName, unknown[]>
  /** مفاتيح مخزن kv (لأنه بلا keyPath) */
  kvKeys: string[]
}

export async function exportAll(): Promise<Backup> {
  const d = await db()
  const data = {} as Record<StoreName, unknown[]>
  for (const s of STORES) data[s] = await d.getAll(s)
  const kvKeys = (await d.getAllKeys('kv')) as string[]
  return { format: BACKUP_FORMAT, version: DB_VERSION, exportedAt: new Date().toISOString(), data, kvKeys }
}

export function validateBackup(x: unknown): x is Backup {
  if (!x || typeof x !== 'object') return false
  const b = x as Backup
  return b.format === BACKUP_FORMAT && typeof b.version === 'number' && !!b.data && Array.isArray(b.kvKeys) &&
    STORES.every((s) => Array.isArray(b.data[s] ?? [])) && b.kvKeys.length === (b.data.kv ?? []).length
}

/** يستبدل البيانات الحالية بمحتوى النسخة الاحتياطية بعد التحقق منها. */
export async function importAll(b: unknown): Promise<void> {
  if (!validateBackup(b)) throw new Error('الملف ليس نسخة احتياطية صالحة لهذا التطبيق')
  if (b.version > DB_VERSION) throw new Error('النسخة الاحتياطية من إصدار أحدث من التطبيق')
  const d = await db()
  const tx = d.transaction(STORES, 'readwrite')
  for (const s of STORES) {
    const store = tx.objectStore(s)
    await store.clear()
    const rows = b.data[s] ?? []
    if (s === 'kv') rows.forEach((v, i) => store.put(v as never, b.kvKeys[i] as never))
    else for (const r of rows) await store.put(r as never)
  }
  await tx.done
  notifyChange('*')
}

export async function clearAll(): Promise<void> {
  const d = await db()
  const tx = d.transaction(STORES, 'readwrite')
  for (const s of STORES) await tx.objectStore(s).clear()
  await tx.done
  notifyChange('*')
}
