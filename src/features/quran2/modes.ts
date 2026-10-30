// القارئ الجديد (تجريبي): أوضاع القراءة السبعة وتفضيلاتها. التفضيلات منفصلة عن القارئ الحالي
// (مفتاح مستقل) حتى لا يتأثر القارئ القديم بالتجربة، ويُحذف كل شيء إن أُلغيت النسخة.
import { kv } from '../../db/repos'
import type { QuranFont } from '../../state/settings'

export type ModeId = 'classic' | 'comfortable' | 'senior' | 'dark' | 'tajweed' | 'kids' | 'translation'
export type ViewId = 'pages' | 'verses'

export interface ModeDef {
  id: ModeId
  name: string
  hint: string
  /** شكل المحتوى: نص متصل كالمصحف، أو آية في كتلة، أو آية واحدة في بطاقة */
  layout: 'flow' | 'blocks' | 'single'
  /** العناصر المبسطة (كبار السن والأطفال) */
  simple: boolean
  size: number
  maxSize: number
  lineHeight: number
  ayahGap: number
  page: string
  paper: string
  ink: string
  muted: string
  marker: string
  accent: string
  chrome: string
  chromeInk: string
  /** إطار ورقي للصفحة */
  frame: boolean
  translation: boolean
}

export const MODES: ModeDef[] = [
  { id: 'classic', name: 'المصحف الكلاسيكي', hint: 'كالمصحف الورقي', layout: 'flow', simple: false, size: 26, maxSize: 44, lineHeight: 2.25, ayahGap: 0, page: '#F4EEDF', paper: '#FFFDF6', ink: '#1E1B16', muted: '#6B6455', marker: '#C9A86A', accent: '#174B3C', chrome: '#F4EEDF', chromeInk: '#174B3C', frame: true, translation: false },
  { id: 'comfortable', name: 'القراءة المريحة', hint: 'خط أكبر ومسافات أوسع', layout: 'blocks', simple: false, size: 32, maxSize: 52, lineHeight: 2.35, ayahGap: 18, page: '#FFFFFF', paper: '#FFFFFF', ink: '#1F2A26', muted: '#69736D', marker: '#26745A', accent: '#174B3C', chrome: '#FFFFFF', chromeInk: '#174B3C', frame: false, translation: false },
  { id: 'senior', name: 'كبار السن', hint: 'خط كبير جدًا وأزرار كبيرة', layout: 'blocks', simple: true, size: 40, maxSize: 72, lineHeight: 2.1, ayahGap: 22, page: '#FFFFFF', paper: '#FFFFFF', ink: '#000000', muted: '#2E2E2E', marker: '#0B3D2E', accent: '#0B3D2E', chrome: '#FFFFFF', chromeInk: '#0B3D2E', frame: false, translation: false },
  { id: 'dark', name: 'الليلي', hint: 'كحلي داكن ونص هادئ', layout: 'flow', simple: false, size: 26, maxSize: 44, lineHeight: 2.25, ayahGap: 0, page: '#0D121D', paper: '#111827', ink: '#E6E1D4', muted: '#9AA3B5', marker: '#5B6B8C', accent: '#C9B37E', chrome: '#0D121D', chromeInk: '#E6E1D4', frame: true, translation: false },
  { id: 'tajweed', name: 'المصحف الملوّن', hint: 'أحكام التجويد بالألوان', layout: 'flow', simple: false, size: 26, maxSize: 44, lineHeight: 2.25, ayahGap: 0, page: '#F4EEDF', paper: '#FFFDF6', ink: '#1E1B16', muted: '#6B6455', marker: '#C9A86A', accent: '#174B3C', chrome: '#F4EEDF', chromeInk: '#174B3C', frame: true, translation: false },
  { id: 'kids', name: 'الأطفال', hint: 'آية آية بخط كبير', layout: 'single', simple: true, size: 40, maxSize: 60, lineHeight: 2.1, ayahGap: 0, page: '#FFF7EA', paper: '#FFFFFF', ink: '#2B2A26', muted: '#6E6A5E', marker: '#1F6F8B', accent: '#1F6F8B', chrome: '#FFF7EA', chromeInk: '#1F6F8B', frame: false, translation: false },
  { id: 'translation', name: 'القراءة والترجمة', hint: 'الترجمة تحت كل آية', layout: 'blocks', simple: false, size: 27, maxSize: 44, lineHeight: 2.2, ayahGap: 14, page: '#FAFAF7', paper: '#FAFAF7', ink: '#202B27', muted: '#69736D', marker: '#26745A', accent: '#174B3C', chrome: '#FFFFFF', chromeInk: '#174B3C', frame: false, translation: true },
]
export const modeById = (id: string): ModeDef => MODES.find((m) => m.id === id) ?? MODES[0]

/** ألوان الخلفية والنص المتاحة في الإعدادات (null = لون الوضع) */
export const PAPERS = [
  { id: 'ivory', label: 'عاجي', paper: '#FFFDF6', ink: '#1E1B16' },
  { id: 'white', label: 'أبيض', paper: '#FFFFFF', ink: '#000000' },
  { id: 'sepia', label: 'بني فاتح', paper: '#F3E7CF', ink: '#3A2A14' },
  { id: 'green', label: 'أخضر مريح', paper: '#E8F1EA', ink: '#16302A' },
  { id: 'night', label: 'ليلي', paper: '#111827', ink: '#E6E1D4' },
  { id: 'black', label: 'أسود', paper: '#000000', ink: '#F2F2F2' },
]
export const INKS = [
  { id: 'black', label: 'أسود', ink: '#000000' },
  { id: 'brown', label: 'بني داكن', ink: '#3A2A14' },
  { id: 'green', label: 'أخضر داكن', ink: '#0B3D2E' },
  { id: 'navy', label: 'كحلي', ink: '#14213D' },
  { id: 'soft', label: 'أبيض هادئ', ink: '#E6E1D4' },
]

export interface Reader2Prefs {
  mode: ModeId
  view: ViewId
  /** تجاوزات المستخدم (null = قيمة الوضع) */
  size: number | null
  font: QuranFont
  paper: string | null
  ink: string | null
  lineHeight: number | null
  ayahGap: number | null
  translation: boolean | null
  tashkeel: boolean
  tajweed: boolean
  reciterId: string | null
}
export const DEFAULT_PREFS: Reader2Prefs = { mode: 'classic', view: 'pages', size: null, font: 'amiri-quran', paper: null, ink: null, lineHeight: null, ayahGap: null, translation: null, tashkeel: true, tajweed: true, reciterId: null }
export const PREFS_KEY = 'reader2:prefs'
export const loadPrefs = async (): Promise<Reader2Prefs> => ({ ...DEFAULT_PREFS, ...(await kv.get<Partial<Reader2Prefs> | null>(PREFS_KEY, null)) })
export const savePrefs = (p: Reader2Prefs) => kv.set(PREFS_KEY, p)

/** القيم الفعلية بعد تطبيق تجاوزات المستخدم على الوضع */
export function resolveLook(p: Reader2Prefs) {
  const m = modeById(p.mode)
  const paper = PAPERS.find((x) => x.id === p.paper)
  const ink = INKS.find((x) => x.id === p.ink)
  return {
    mode: m,
    size: Math.max(16, Math.min(m.maxSize, p.size ?? m.size)),
    lineHeight: p.lineHeight ?? m.lineHeight,
    ayahGap: p.ayahGap ?? m.ayahGap,
    paper: paper?.paper ?? m.paper,
    ink: ink?.ink ?? paper?.ink ?? m.ink,
    translation: p.translation ?? m.translation,
  }
}

/**
 * إخفاء الحركات للعرض فقط (الفتحة والضمة والكسرة والتنوين والشدة والسكون) — النص المحفوظ لا يتغير،
 * وتبقى الحروف وعلامات الوقف والألف الخنجرية والمد كما هي.
 */
export function hideHarakat(text: string): string {
  return text.replace(/[\u064B-\u0652\u06E1]/g, '')
}
