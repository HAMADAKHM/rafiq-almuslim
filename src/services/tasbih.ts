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
  /** تصميم حبات المسبحة ('classic' = الدائرة الأصلية للجميع، والباقي لمشتركي بلس) */
  bead: string
  /** خلفية المسبحة ('none' للجميع، والباقي لمشتركي بلس) */
  bg: string
}

/** تصاميم الحبات: ألوان التدرج [فاتح، أساسي، داكن] ولون الخيط والشرابة */
export const BEADS: { id: string; name: string; plus: boolean; c: [string, string, string]; cord: string }[] = [
  { id: 'classic', name: 'الدائرة الأصلية', plus: false, c: ['#2a8f7f', '#1F7064', '#0b3b33'], cord: '#C6A15B' },
  { id: 'amber', name: 'كهرمان', plus: true, c: ['#ffd27a', '#e08a1e', '#7a3b06'], cord: '#5a3a1a' },
  { id: 'pearl', name: 'لؤلؤ', plus: true, c: ['#ffffff', '#ebe6dc', '#b9b2a4'], cord: '#c8b88a' },
  { id: 'emerald', name: 'زمرد', plus: true, c: ['#7ff0b8', '#14a05c', '#06401f'], cord: '#d4af37' },
  { id: 'wood', name: 'خشب الصندل', plus: true, c: ['#d9a46a', '#8a5427', '#45240c'], cord: '#2f1a0c' },
  { id: 'onyx', name: 'عقيق أسود وذهب', plus: true, c: ['#5a5a5a', '#1a1a1a', '#000000'], cord: '#d4af37' },
  { id: 'turquoise', name: 'فيروز', plus: true, c: ['#9ff3ee', '#2bb5ae', '#0b5a57'], cord: '#e8d39a' },
  { id: 'crystal', name: 'كريستال', plus: true, c: ['#ffffff', '#cfe6ff', '#7aa2d6'], cord: '#b7c7dc' },
  { id: 'agate', name: 'عقيق يماني', plus: true, c: ['#ff9a8a', '#b8322a', '#4f0b08'], cord: '#d4af37' },
]
export const TASBIH_BGS: { id: string; name: string; plus: boolean }[] = [
  { id: 'none', name: 'بلا خلفية', plus: false },
  { id: 'night', name: 'ليلة مقمرة', plus: true },
  { id: 'mosque', name: 'مسجد عند الغروب', plus: true },
  { id: 'geometry', name: 'زخرفة إسلامية', plus: true },
  { id: 'garden', name: 'حديقة', plus: true },
  { id: 'desert', name: 'صحراء ذهبية', plus: true },
  { id: 'marble', name: 'رخام', plus: true },
  { id: 'velvet', name: 'مخمل وذهب', plus: true },
]
/** التصميم الفعلي: البديل لا يُطبَّق دون اشتراك */
export const activeBead = (s: TasbihState, entitled: boolean) => BEADS.find((b) => b.id === s.bead && (entitled || !b.plus)) ?? BEADS[0]
export const activeTasbihBg = (s: TasbihState, entitled: boolean) => TASBIH_BGS.find((b) => b.id === s.bg && (entitled || !b.plus)) ?? TASBIH_BGS[0]

export const DEFAULT_TASBIH: TasbihState = { dhikrId: 'subhanallah', customText: '', count: 0, target: 33, vibrate: true, sound: false, keepLog: true, log: {}, bead: 'classic', bg: 'none' }

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
