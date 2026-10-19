// طبقة المزامنة السحابية المستقبلية (غير مفعّلة في الإصدار الأول).
// أي تنفيذ مستقبلي يجب أن يكون اختياريًا، وبموافقة صريحة، ولا يشترط حسابًا للوظائف الأساسية.
// مقترحات منخفضة التكلفة موثقة في docs/COSTS.md.
import type { Backup } from '../db/backup'

export interface SyncAdapter {
  readonly id: string
  readonly label: string
  isAvailable(): Promise<boolean>
  push(snapshot: Backup): Promise<void>
  pull(): Promise<Backup | null>
}

/** المحوّل الافتراضي: لا مزامنة، لا اتصال خارجي. */
export const noSync: SyncAdapter = {
  id: 'none',
  label: 'بدون مزامنة (البيانات على هذا الجهاز فقط)',
  async isAvailable() { return true },
  async push() {},
  async pull() { return null },
}

export function activeSyncAdapter(): SyncAdapter {
  return noSync
}
