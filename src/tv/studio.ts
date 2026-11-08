// «استوديو الشاشة» المشترك بين التلفاز والجوال: أحجام العناصر وأماكنها والخط والألوان، ورابط الربط عبر رمز QR.
// القيم هنا هي نفسها التي يقبلها RemoteCore.validate في تطبيق التلفاز (قائمة بيضاء)، فلا تُرسل قيمة غير مقبولة.
import qrcode from 'qrcode-generator'

export const SCALES = [80, 90, 100, 110, 120, 130, 140] as const
export type StudioFont = 'plex' | 'amiri' | 'naskh' | 'kufi' | 'ruqaa'
export const FONTS: { id: StudioFont; label: string; css: string }[] = [
  { id: 'plex', label: 'عصري', css: "'IBM Plex Sans Arabic', sans-serif" },
  { id: 'amiri', label: 'أميري', css: "'Amiri', serif" },
  { id: 'naskh', label: 'نسخ', css: "'Noto Naskh Arabic', serif" },
  { id: 'kufi', label: 'كوفي', css: "'Reem Kufi Ink', 'Reem Kufi', sans-serif" },
  { id: 'ruqaa', label: 'رقعة', css: "'Aref Ruqaa', serif" },
]
export const ACCENTS: { id: string; label: string }[] = [
  { id: '#e2c27e', label: 'ذهبي' }, { id: '#ffffff', label: 'أبيض' }, { id: '#7fd8be', label: 'نعناعي' },
  { id: '#8ec9ff', label: 'سماوي' }, { id: '#f2a7b5', label: 'وردي' }, { id: '#ffb547', label: 'كهرماني' },
]
export const TEXTS: { id: string; label: string }[] = [
  { id: '#ffffff', label: 'أبيض' }, { id: '#f3ebd7', label: 'عاجي' }, { id: '#e8f1f8', label: 'ثلجي' },
]

export interface StudioSettings {
  /** أحجام: الساعة والصلاة القادمة، وشريط المواقيت، ونص البطاقة (بالمئة) */
  clockScale: number
  prayersScale: number
  cardScale: number
  /** الأماكن: جهة الساعة، ومكان شريط المواقيت، وإظهار البطاقة */
  clockSide: 'right' | 'left'
  prayersPos: 'bottom' | 'top' | 'hidden'
  showCard: boolean
  font: StudioFont
  accent: string
  text: string
}

export const DEFAULT_STUDIO: StudioSettings = {
  clockScale: 100, prayersScale: 100, cardScale: 100, clockSide: 'right', prayersPos: 'bottom', showCard: true, font: 'plex', accent: '#e2c27e', text: '#ffffff',
}

const pick = <T,>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)

export function normalizeStudio(raw: unknown): StudioSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_STUDIO
  return {
    clockScale: pick(r.clockScale, SCALES, d.clockScale as 100),
    prayersScale: pick(r.prayersScale, SCALES, d.prayersScale as 100),
    cardScale: pick(r.cardScale, SCALES, d.cardScale as 100),
    clockSide: pick(r.clockSide, ['right', 'left'] as const, d.clockSide),
    prayersPos: pick(r.prayersPos, ['bottom', 'top', 'hidden'] as const, d.prayersPos),
    showCard: typeof r.showCard === 'boolean' ? r.showCard : d.showCard,
    font: pick(r.font, FONTS.map((f) => f.id), d.font),
    accent: pick(typeof r.accent === 'string' ? r.accent.toLowerCase() : r.accent, ACCENTS.map((a) => a.id), d.accent),
    text: pick(typeof r.text === 'string' ? r.text.toLowerCase() : r.text, TEXTS.map((a) => a.id), d.text),
  }
}

export const fontCss = (f: StudioFont) => FONTS.find((x) => x.id === f)?.css ?? FONTS[0].css

// ---------- الربط برمز QR ----------
/** محتوى رمز QR على التلفاز: العنوان والمنفذ ورمز الربط (الرمز ظاهر على الشاشة أصلًا؛ يُشتق منه المفتاح ولا يُرسل) */
export function pairLink(ip: string, port: number, code: string): string {
  return `rafiqtv://pair?h=${encodeURIComponent(ip)}&p=${port}&c=${code}`
}

const PRIVATE_IP = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/

/** قراءة رمز QR في الجوال: يُقبل عنوان من الشبكة المنزلية فقط ورمز من 6 أرقام */
export function parsePairLink(text: string): { host: string; port: number; code: string } | null {
  const m = /^rafiqtv:\/\/pair\?(.+)$/.exec(text.trim())
  if (!m) return null
  const q = new Map(m[1].split('&').map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), decodeURIComponent(kv.slice(i + 1))] as [string, string] }))
  const host = q.get('h') ?? '', port = Number(q.get('p')), code = q.get('c') ?? ''
  if (!PRIVATE_IP.test(host) || host.split('.').some((n) => Number(n) > 255)) return null
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return null
  if (!/^\d{6}$/.test(code)) return null
  return { host, port, code }
}

/** مصفوفة رمز QR (true = مربع داكن) */
export function qrMatrix(text: string): boolean[][] {
  const q = qrcode(0, 'M')
  q.addData(text)
  q.make()
  const n = q.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)))
}

/** مسار SVG لرمز QR (مربع لكل خلية داكنة) مع هامش 4 خلايا */
export function qrSvgPath(m: boolean[][]): { size: number; d: string } {
  let d = ''
  m.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c + 4} ${r + 4}h1v1h-1z` }))
  return { size: m.length + 8, d }
}
