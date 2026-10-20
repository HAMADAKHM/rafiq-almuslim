// المسبحة الإلكترونية: الحالة محفوظة محليًا فقط، ولا يُرسل شيء خارج الجهاز.
import { kv } from '../db/repos'

export interface TasbihDhikr { id: string; text: string }

export const TASBIH_DHIKR: TasbihDhikr[] = [
  { id: 'subhanallah', text: 'سُبْحَانَ اللَّهِ' },
  { id: 'alhamdulillah', text: 'الْحَمْدُ لِلَّهِ' },
  { id: 'allahuakbar', text: 'اللَّهُ أَكْبَرُ' },
  { id: 'tahlil', text: 'لَا إِلَهَ إِلَّا اللَّهُ' },
  { id: 'istighfar', text: 'أَسْتَغْفِرُ اللَّهَ' },
  { id: 'subhan-bihamdih', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ' },
  { id: 'hawqala', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ' },
  { id: 'salat', text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ' },
]

export interface TasbihState {
  dhikrId: string
  customText: string
  count: number
  target: number
  vibrate: boolean
  sound: boolean
  /** سجل اختياري: مجموع التسبيح لكل يوم ولكل ذكر */
  keepLog: boolean
  log: Record<string, Record<string, number>>
}

export const DEFAULT_TASBIH: TasbihState = { dhikrId: 'subhanallah', customText: '', count: 0, target: 33, vibrate: true, sound: false, keepLog: true, log: {} }

export async function loadTasbih(): Promise<TasbihState> {
  return { ...DEFAULT_TASBIH, ...(await kv.get<Partial<TasbihState> | null>('tasbih', null)) }
}

export async function saveTasbih(s: TasbihState) {
  await kv.set('tasbih', s)
}

export function dhikrText(s: TasbihState): string {
  if (s.dhikrId === 'custom') return s.customText.trim() || 'ذكر خاص'
  return TASBIH_DHIKR.find((d) => d.id === s.dhikrId)?.text ?? TASBIH_DHIKR[0].text
}

/** زيادة العداد: تعيد الحالة الجديدة وما إذا بُلغ الهدف بهذه الضغطة. */
export function increment(s: TasbihState, today: string): { state: TasbihState; reachedTarget: boolean } {
  const count = s.count + 1
  const log = s.keepLog ? { ...s.log, [today]: { ...s.log[today], [s.dhikrId]: (s.log[today]?.[s.dhikrId] ?? 0) + 1 } } : s.log
  return { state: { ...s, count, log }, reachedTarget: s.target > 0 && count % s.target === 0 }
}

export function todayTotal(s: TasbihState, today: string): number {
  return Object.values(s.log[today] ?? {}).reduce((a, b) => a + b, 0)
}
