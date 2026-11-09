// رسوم «حبر وذهب» للتفسير المصوّر: أسلوب خاص بالتطبيق، مرسوم بالشيفرة بالكامل (لا صور).
// - ورق عاجي بحبيبات خفيفة، وبقعة ألوان مائية خلف المشهد بلون يناسبه.
// - خطوط حبر يدوية «ترتجف» قليلًا ثماني مرات في الثانية كأنها رسوم يدوية متحركة.
// - لمسات ذهبية للنور والنجوم والعملة والمحراب.
// - شخصية «المسلم» بلا ملامح وجه (احترامًا، وتمثّل كل مسلم)، بثوب أبيض وطاقية بنقش ذهبي.
// - لا تُرسم شخصيات الأنبياء ولا الملائكة ولا الصحابة أبدًا: آيات القصص مشاهد رمزية بلا شخصية.

export type InkScene =
  | 'explain' | 'pray' | 'quran' | 'dua' | 'charity' | 'sky' | 'rain' | 'path' | 'heart' | 'scale'
  | 'sea' | 'garden' | 'mountains' | 'family' | 'warning' | 'light' | 'daynight' | 'knowledge'

export const INK_SCENES: { id: InkScene; name: string; figure: boolean }[] = [
  { id: 'explain', name: 'المسلم يتأمل', figure: true },
  { id: 'pray', name: 'الصلاة', figure: true },
  { id: 'quran', name: 'تلاوة القرآن', figure: true },
  { id: 'dua', name: 'الدعاء', figure: true },
  { id: 'charity', name: 'الإنفاق', figure: true },
  { id: 'sky', name: 'السماوات والنجوم', figure: true },
  { id: 'rain', name: 'المطر والنبات', figure: false },
  { id: 'path', name: 'الطريق المستقيم', figure: true },
  { id: 'heart', name: 'القلب والإيمان', figure: true },
  { id: 'scale', name: 'الميزان', figure: false },
  { id: 'sea', name: 'البحر والسفينة', figure: false },
  { id: 'garden', name: 'الجنات والأنهار', figure: false },
  { id: 'mountains', name: 'الجبال', figure: false },
  { id: 'family', name: 'بر الوالدين', figure: true },
  { id: 'warning', name: 'التحذير', figure: true },
  { id: 'light', name: 'النور', figure: false },
  { id: 'daynight', name: 'الليل والنهار', figure: false },
  { id: 'knowledge', name: 'العلم', figure: true },
]

/** أسماء تدل على قصة نبي أو ملك أو صحابي: المشهد عندها رمزي بلا شخصية (مطابقة كلمة كاملة مع حروف السوابق) */
const STORY_WORDS = ['نوح', 'إبراهيم', 'ابراهيم', 'موسى', 'عيسى', 'المسيح', 'مريم', 'يوسف', 'يونس', 'يعقوب', 'إسحاق', 'إسماعيل', 'اسماعيل', 'داود', 'سليمان', 'أيوب', 'ايوب', 'زكريا', 'يحيى', 'هود', 'صالح', 'شعيب', 'لوط', 'إدريس', 'إلياس', 'اليسع', 'محمد', 'أحمد', 'رسول', 'رسوله', 'رسولا', 'الرسول', 'رسله', 'الرسل', 'المرسلين', 'نبي', 'النبي', 'النبيين', 'الأنبياء', 'جبريل', 'ميكال', 'الملائكة', 'ملائكة', 'ملائكته', 'آدم', 'فرعون', 'قارون', 'هامان', 'الكهف', 'القرنين', 'لقمان', 'طالوت', 'جالوت', 'إبليس']
const AR = '\\u0621-\\u064A'
const wordsRe = (list: string[]) => new RegExp(`(?<![${AR}])(?:و|ف)?(?:ب|ل|ك)?(?:${list.join('|')})(?![${AR}])`)
const NO_FIGURE = wordsRe(STORY_WORDS)
/** في التفسير يكثر ذكر «الرسول» و«الملائكة» عرضًا؛ فيُعتبر فيه أسماء الأنبياء والأشخاص المعيّنين فقط */
const NAMED = wordsRe(STORY_WORDS.filter((w) => !/^(رسول|رسوله|رسولا|الرسول|رسله|الرسل|المرسلين|نبي|النبي|النبيين|الأنبياء|الملائكة|ملائكة|ملائكته|محمد|أحمد)$/.test(w)))

/** قواعد اختيار المشهد من كلمات الآية وتفسيرها (الأولوية للأول) */
const RULES: [InkScene, RegExp][] = [
  ['family', /(الوالدين|ولدين|والديك|ولديك|لوالديه|أمه|أبويه|الأبوين|الأب والأم|الأقربين|ذي القربى|اليتامى)/],
  ['pray', /(الصلاة|يصلون|صلاته|صلواتهم|ركع|سجد|الساجدين|الراكعين|أقيموا|يقيمون|المساجد|مسجد|القبلة)/],
  ['charity', /(ينفقون|أنفقوا|الإنفاق|الزكاة|الصدقات|صدقة|تصدق|المساكين|الفقراء|السائل|أموالهم|رزقناهم)/],
  ['dua', /(ادعوا|يدعون|دعاء|الدعاء|استغفر|استغفروا|المغفرة|توبوا|التوبة|تاب|ربنا|اغفر)/],
  ['quran', /(القرآن|الكتاب|تلاوة|يتلون|اقرأ|رتل|آياتنا|آيات الله|الذكر)/],
  ['scale', /(الميزان|الموازين|بالقسط|العدل|يعدلون|الحساب|مثقال)/],
  ['garden', /(الجنة|جنات|الأنهار|نعيم|الفردوس|خالدين فيها أبدا|ظلال)/],
  ['warning', /(النار|جهنم|عذاب|العذاب|الكافرين|كفروا|المنافقين|الظالمين|السعير|ويل)/],
  ['sea', /(البحر|البحار|الفلك|السفينة|الموج|السفن)/],
  ['rain', /(المطر|الماء|السحاب|أنزل من السماء|الزرع|النبات|الحب|الثمرات|الرياح)/],
  ['daynight', /(الليل|النهار|الشمس|القمر|الفجر|الضحى|الصبح|العشي)/],
  ['sky', /(السماوات|السماء|النجوم|الكواكب|خلق|الأرض|الآفاق|يتفكرون|بديع)/],
  ['mountains', /(الجبال|جبل|الأرض|رواسي|أوتادا)/],
  ['light', /(النور|نور|الظلمات|مصباح|سراج|يهدي|الهدى)/],
  ['path', /(الصراط|المستقيم|سبيل|طريق|اهدنا|الهداية|يتبعون|اتبعوا)/],
  ['heart', /(قلوب|القلوب|قلبه|الإيمان|آمنوا|المؤمنين|التقوى|المتقين|الصبر|الصابرين|اليقين|يخشون)/],
  ['knowledge', /(العلم|يعلمون|تعلمون|العلماء|أولي الألباب|يعقلون|القلم)/],
]

export interface ScenePick { scene: InkScene; figure: boolean }

/** يختار المشهد المناسب، ويحذف الشخصية إن ذُكر نبي أو ملك أو قصة */
export function pickInkScene(ayahText: string, tafsir: string): ScenePick {
  const ayah = stripMarks(ayahText)
  const plain = `${ayah} ${stripMarks(tafsir)}`
  // قصة: ذكر نبي أو ملك في نص الآية نفسها، أو اسم نبي معيّن في التفسير
  const story = NO_FIGURE.test(ayah) || NAMED.test(stripMarks(tafsir))
  for (const [scene, re] of RULES) {
    if (re.test(plain)) {
      const def = INK_SCENES.find((s) => s.id === scene)!
      if (story && def.figure) return { scene: symbolicFor(scene), figure: false }
      return { scene, figure: def.figure && !story }
    }
  }
  return story ? { scene: 'mountains', figure: false } : { scene: 'explain', figure: true }
}

/** بديل رمزي بلا شخصية لمشاهد الأشخاص */
function symbolicFor(s: InkScene): InkScene {
  const map: Partial<Record<InkScene, InkScene>> = { pray: 'light', quran: 'light', dua: 'light', charity: 'garden', sky: 'sky', path: 'mountains', heart: 'light', family: 'garden', warning: 'mountains', explain: 'mountains', knowledge: 'light' }
  return map[s] ?? 'mountains'
}

const ch = (n: number) => String.fromCharCode(n)
const rng = (a: number, b: number) => `${ch(a)}-${ch(b)}`
/** التشكيل وعلامات المصحف (تُبنى من أرقامها حتى لا تُكتب حروف الرسم العثماني في الشيفرة) */
const MARKS = new RegExp(`[${rng(0x610, 0x61a)}${rng(0x64b, 0x65f)}${ch(0x670)}${rng(0x6d6, 0x6ed)}${rng(0x8d3, 0x8ff)}]`, 'g')
const WASLA = new RegExp(ch(0x671), 'g')

/** إزالة التشكيل والرموز القرآنية للمطابقة بالكلمات */
export function stripMarks(s: string): string {
  return s.replace(MARKS, '').replace(WASLA, 'ا')
}

/* ───────────────────────── الألوان والأدوات ───────────────────────── */

export const INK = '#1f2b2a'
export const PAPER = '#f6efdf'
const GOLD = '#c9a24a'
const GOLD_LIGHT = '#e8cf8a'
const SKIN = '#e6c39b'
const WHITE = '#fffdf7'
type Ctx = CanvasRenderingContext2D

const WASH: Record<InkScene, string> = {
  explain: '#9cc9c0', pray: '#c9b27a', quran: '#8fbf9f', dua: '#a9c3e0', charity: '#e3c27a', sky: '#7f95c9', rain: '#8fc0d8',
  path: '#d9b77a', heart: '#e2a4a4', scale: '#c8b48c', sea: '#7fb3cf', garden: '#93c48f', mountains: '#b9a68c', family: '#d8b48f',
  warning: '#a7a2a8', light: '#ecd38c', daynight: '#9fb0d6', knowledge: '#a8c4b0',
}

/** عشوائية ثابتة: نفس الرقم لنفس البذرة (لارتجاف الخط اليدوي) */
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** أداة الرسم اليدوي: تحرّك النقاط قليلًا بحسب «إطار» الرسم (8 في الثانية) */
class Pen {
  ctx: Ctx; s: number; frame: number
  constructor(ctx: Ctx, s: number, frame: number) { this.ctx = ctx; this.s = s; this.frame = frame }
  j(x: number, y: number, k = 1): [number, number] {
    const seed = Math.round(x * 13 + y * 7) + this.frame * 31
    const a = this.s * 0.012 * k
    return [x + (rnd(seed) - 0.5) * a, y + (rnd(seed + 9) - 0.5) * a]
  }
  /** خط حبر يدوي عبر نقاط (منحنى ناعم) */
  line(pts: [number, number][], w = 0.03, color = INK, close = false) {
    const c = this.ctx
    const p = pts.map(([x, y]) => this.j(x, y))
    c.save(); c.strokeStyle = color; c.lineWidth = this.s * w; c.lineCap = 'round'; c.lineJoin = 'round'
    c.beginPath(); c.moveTo(p[0][0], p[0][1])
    for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; c.quadraticCurveTo(p[i][0], p[i][1], mx, my) }
    if (p.length > 1) c.lineTo(p[p.length - 1][0], p[p.length - 1][1])
    if (close) c.closePath()
    c.stroke(); c.restore()
  }
  /** شكل مملوء بحدود حبر */
  shape(pts: [number, number][], fill: string, w = 0.028) {
    const c = this.ctx
    const p = pts.map(([x, y]) => this.j(x, y))
    c.save(); c.beginPath(); c.moveTo(p[0][0], p[0][1])
    for (let i = 1; i < p.length; i++) { const n = p[(i + 1) % p.length]; c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + n[0]) / 2, (p[i][1] + n[1]) / 2) }
    c.closePath(); c.fillStyle = fill; c.fill()
    c.strokeStyle = INK; c.lineWidth = this.s * w; c.lineJoin = 'round'; c.stroke(); c.restore()
  }
  /** مضلع بزوايا مستقيمة وحدود حبر */
  poly(pts: [number, number][], fill: string, w = 0.028) {
    const c = this.ctx
    const p = pts.map(([x, y]) => this.j(x, y))
    c.save(); c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath()
    c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = this.s * w; c.lineJoin = 'round'; c.stroke(); c.restore()
  }
  /** طرف أبيض بحدود حبر (ذراع أو ساق تحت الثوب) */
  limb(pts: [number, number][], w: number, fill = WHITE) {
    this.line(pts, w + 0.05, INK)
    this.line(pts, w, fill)
  }
  circle(x: number, y: number, r: number, fill: string | null, w = 0.028, stroke = INK) {
    const c = this.ctx
    const [jx, jy] = this.j(x, y, 0.6)
    c.save(); c.beginPath(); c.ellipse(jx, jy, r * (1 + (rnd(this.frame + x) - 0.5) * 0.04), r, 0, 0, Math.PI * 2)
    if (fill) { c.fillStyle = fill; c.fill() }
    if (w > 0) { c.strokeStyle = stroke; c.lineWidth = this.s * w; c.stroke() }
    c.restore()
  }
}

/* ───────────────────────── الشخصية ───────────────────────── */

type P = [number, number]
/** مفاصل الشخصية بوحدة طولها (القدمان عند 0,0 والأعلى سالب) */
export interface Joints { head: P; neck: P; hip: P; kneeL: P; kneeR: P; footL: P; footR: P; elbowL: P; handL: P; elbowR: P; handR: P; upright: number }

const POSES: Record<string, Joints> = {
  stand: { head: [0, -2.2], neck: [0, -1.8], hip: [0, -1.0], kneeL: [-0.12, -0.5], kneeR: [0.12, -0.5], footL: [-0.16, 0], footR: [0.16, 0], elbowL: [-0.38, -1.35], handL: [-0.4, -0.95], elbowR: [0.38, -1.35], handR: [0.4, -0.95], upright: 1 },
  explain: { head: [0.02, -2.2], neck: [0, -1.8], hip: [0, -1.0], kneeL: [-0.12, -0.5], kneeR: [0.12, -0.5], footL: [-0.16, 0], footR: [0.16, 0], elbowL: [-0.38, -1.35], handL: [-0.36, -0.95], elbowR: [0.45, -1.45], handR: [0.62, -1.75], upright: 1 },
  qiyam: { head: [0, -2.2], neck: [0, -1.8], hip: [0, -1.0], kneeL: [-0.1, -0.5], kneeR: [0.1, -0.5], footL: [-0.14, 0], footR: [0.14, 0], elbowL: [-0.32, -1.38], handL: [0.04, -1.5], elbowR: [0.3, -1.42], handR: [-0.02, -1.55], upright: 1 },
  ruku: { head: [1.15, -1.02], neck: [0.82, -1.02], hip: [0, -1.0], kneeL: [0.02, -0.5], kneeR: [0.06, -0.5], footL: [-0.05, 0], footR: [0.05, 0], elbowL: [0.4, -0.78], handL: [0.08, -0.55], elbowR: [0.45, -0.8], handR: [0.12, -0.55], upright: 0 },
  sujood: { head: [0.95, -0.17], neck: [0.68, -0.32], hip: [-0.2, -0.62], kneeL: [0.22, -0.06], kneeR: [0.26, -0.06], footL: [-0.5, -0.02], footR: [-0.46, -0.02], elbowL: [0.6, -0.1], handL: [0.82, -0.02], elbowR: [0.64, -0.1], handR: [0.86, -0.02], upright: 0 },
  dua: { head: [0, -2.2], neck: [0, -1.8], hip: [0, -1.0], kneeL: [-0.1, -0.5], kneeR: [0.1, -0.5], footL: [-0.14, 0], footR: [0.14, 0], elbowL: [-0.36, -1.45], handL: [-0.2, -1.85], elbowR: [0.36, -1.45], handR: [0.2, -1.85], upright: 1 },
  give: { head: [0.04, -2.2], neck: [0, -1.8], hip: [0, -1.0], kneeL: [-0.12, -0.5], kneeR: [0.12, -0.5], footL: [-0.16, 0], footR: [0.16, 0], elbowL: [-0.38, -1.35], handL: [-0.38, -0.95], elbowR: [0.42, -1.5], handR: [0.85, -1.55], upright: 1 },
  look: { head: [0.06, -2.24], neck: [0, -1.8], hip: [0, -1.0], kneeL: [-0.12, -0.5], kneeR: [0.12, -0.5], footL: [-0.16, 0], footR: [0.16, 0], elbowL: [-0.38, -1.35], handL: [-0.38, -0.95], elbowR: [0.42, -1.75], handR: [0.7, -2.35], upright: 1 },
  sit: { head: [0.12, -1.55], neck: [0.08, -1.15], hip: [0, -0.32], kneeL: [-0.5, -0.12], kneeR: [0.5, -0.12], footL: [0.15, -0.05], footR: [-0.15, -0.05], elbowL: [0.25, -0.72], handL: [0.55, -0.72], elbowR: [0.32, -0.8], handR: [0.62, -0.8], upright: 0.5 },
  walkA: { head: [0.05, -2.2], neck: [0.02, -1.8], hip: [0, -1.0], kneeL: [-0.2, -0.52], kneeR: [0.22, -0.5], footL: [-0.34, 0], footR: [0.32, 0], elbowL: [-0.3, -1.35], handL: [-0.12, -0.98], elbowR: [0.3, -1.35], handR: [0.5, -1.05], upright: 1 },
  walkB: { head: [0.05, -2.2], neck: [0.02, -1.8], hip: [0, -1.0], kneeL: [0.2, -0.52], kneeR: [-0.22, -0.5], footL: [0.32, 0], footR: [-0.34, 0], elbowL: [-0.3, -1.35], handL: [-0.5, -1.05], elbowR: [0.3, -1.35], handR: [0.12, -0.98], upright: 1 },
  hold: { head: [0.02, -2.2], neck: [0, -1.8], hip: [0, -1.0], kneeL: [-0.12, -0.5], kneeR: [0.12, -0.5], footL: [-0.16, 0], footR: [0.16, 0], elbowL: [-0.38, -1.35], handL: [-0.4, -0.95], elbowR: [0.42, -1.3], handR: [0.72, -1.25], upright: 1 },
  elder: { head: [-0.12, -2.0], neck: [-0.06, -1.62], hip: [0, -0.95], kneeL: [-0.1, -0.48], kneeR: [0.1, -0.48], footL: [-0.15, 0], footR: [0.15, 0], elbowL: [-0.4, -1.25], handL: [-0.55, -1.0], elbowR: [0.3, -1.3], handR: [0.45, -1.1], upright: 1 },
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lp = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
const ease = (k: number) => k * k * (3 - 2 * k)

export function blendPose(a: Joints, b: Joints, k: number): Joints {
  const e = ease(Math.max(0, Math.min(1, k)))
  const out = {} as Joints
  for (const key of Object.keys(a) as (keyof Joints)[]) {
    if (key === 'upright') out.upright = lerp(a.upright, b.upright, e)
    else (out as unknown as Record<string, P>)[key] = lp(a[key] as P, b[key] as P, e)
  }
  return out
}

/** دورة الصلاة: قيام ← ركوع ← قيام ← سجود ← جلسة قصيرة ← سجود ← قيام */
export function prayerPose(t: number): Joints {
  const seq: [string, number][] = [['qiyam', 3.2], ['ruku', 2.2], ['qiyam', 1.4], ['sujood', 2.2], ['sit', 1.2], ['sujood', 2.0]]
  const total = seq.reduce((n, [, d]) => n + d, 0)
  let x = t % total
  for (let i = 0; i < seq.length; i++) {
    const [name, d] = seq[i]
    if (x < d) {
      const next = seq[(i + 1) % seq.length][0]
      const tr = 0.7
      return x > d - tr ? blendPose(POSES[name], POSES[next], (x - (d - tr)) / tr) : POSES[name]
    }
    x -= d
  }
  return POSES.qiyam
}

interface FigureOpts { x: number; y: number; u: number; flip?: boolean; pose: Joints; cap?: boolean; cane?: boolean; small?: boolean; glowHeart?: number }

/** يرسم الشخصية: ثوب أبيض، وجه بلا ملامح، وطاقية بنقش ذهبي */
export function drawFigure(pen: Pen, o: FigureOpts) {
  const { pose: J, u } = o
  const f = o.flip ? -1 : 1
  const X = (p: P): P => [o.x + p[0] * u * f, o.y + p[1] * u]
  const s = u / pen.s // نسبة سماكة الخط للحجم
  const limbW = 0.24 * s
  const c = pen.ctx
  // الظل
  c.save(); c.fillStyle = 'rgba(31,43,42,0.12)'; c.beginPath(); c.ellipse(o.x + (J.hip[0] * u * f) * 0.3, o.y + u * 0.04, u * 0.62, u * 0.09, 0, 0, Math.PI * 2); c.fill(); c.restore()
  // الساقان والقدمان
  if (J.upright < 0.75) {
    pen.limb([X(J.hip), X(J.kneeL), X(J.footL)], limbW * 1.25)
    pen.limb([X(J.hip), X(J.kneeR), X(J.footR)], limbW * 1.25)
  }
  for (const ft of [J.footL, J.footR]) { const [fx, fy] = X(ft); c.save(); c.fillStyle = INK; c.beginPath(); c.ellipse(fx + u * 0.06 * f, fy - u * 0.02, u * 0.13, u * 0.06, 0, 0, Math.PI * 2); c.fill(); c.restore() }
  // العصا (لكبير السن)
  if (o.cane) pen.line([X([J.handL[0], J.handL[1]]), X([J.handL[0] - 0.05, 0])], 0.045 * s * 2, '#7a5a35')
  // الذراع الخلفية
  pen.limb([X(J.neck), X(J.elbowL), X(J.handL)], limbW * 0.85)
  pen.circle(...X(J.handL), u * 0.085, SKIN, 0.02 * s * 2)
  // الجسم: ثوب
  if (J.upright >= 0.75) {
    const [hx, hy] = X(J.hip), [nx, ny] = X(J.neck)
    const w1 = u * 0.36
    const fa = o.x + J.footL[0] * u * f, fb = o.x + J.footR[0] * u * f
    const left = Math.min(fa, fb) - u * 0.2, right = Math.max(fa, fb) + u * 0.2
    pen.shape([[nx - w1, ny + u * 0.06], [nx, ny - u * 0.04], [nx + w1, ny + u * 0.06], [hx + w1 * 1.12, hy], [right, o.y - u * 0.1], [(left + right) / 2, o.y - u * 0.05], [left, o.y - u * 0.1], [hx - w1 * 1.12, hy]], WHITE, 0.03 * s * 2)
    // خط الثوب الأوسط
    pen.line([[nx, ny + u * 0.08], [nx, ny + u * 0.42]], 0.016 * s * 2, 'rgba(31,43,42,0.55)')
  } else {
    pen.limb([X(J.hip), X(J.neck)], limbW * 2.4)
  }
  // نور القلب
  if (o.glowHeart) {
    const [cx, cy] = lp(X(J.neck), X(J.hip), 0.35)
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, u * 0.7)
    g.addColorStop(0, `rgba(232,207,138,${0.85 * o.glowHeart})`); g.addColorStop(1, 'rgba(232,207,138,0)')
    c.save(); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, u * 0.7, 0, Math.PI * 2); c.fill(); c.restore()
    heartShape(c, cx, cy, u * 0.16 * (0.9 + 0.1 * o.glowHeart), GOLD)
  }
  // الذراع الأمامية
  pen.limb([X(J.neck), X(J.elbowR), X(J.handR)], limbW * 0.85)
  pen.circle(...X(J.handR), u * 0.085, SKIN, 0.02 * s * 2)
  // الرأس بلا ملامح
  const [hx, hy] = X(J.head)
  pen.circle(hx, hy, u * 0.36, SKIN, 0.03 * s * 2)
  if (o.cap !== false) {
    // الطاقية: نصف دائرة بيضاء مع شريط ذهبي بنقش
    const ang = Math.atan2(J.head[1] - J.neck[1], (J.head[0] - J.neck[0]) * f) + Math.PI / 2
    c.save(); c.translate(hx, hy); c.rotate(ang)
    c.beginPath(); c.arc(0, -u * 0.05, u * 0.35, Math.PI * 1.02, Math.PI * 1.98); c.closePath()
    c.fillStyle = WHITE; c.fill(); c.strokeStyle = INK; c.lineWidth = pen.s * 0.026 * s * 2; c.stroke()
    c.fillStyle = GOLD; c.fillRect(-u * 0.34, -u * 0.13, u * 0.68, u * 0.075)
    c.strokeStyle = INK; c.lineWidth = pen.s * 0.008 * s * 2
    c.beginPath(); for (let k = -0.31; k < 0.3; k += 0.09) { c.moveTo(k * u, -u * 0.12); c.lineTo((k + 0.045) * u, -u * 0.05); c.lineTo((k + 0.09) * u, -u * 0.12) } c.stroke()
    c.restore()
  } else {
    // شعر أبيض لكبير السن
    c.save(); c.fillStyle = '#ece6da'; c.beginPath(); c.arc(hx, hy - u * 0.05, u * 0.34, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.restore()
  }
}

function heartShape(c: Ctx, x: number, y: number, r: number, fill: string) {
  c.save(); c.translate(x, y); c.beginPath()
  c.moveTo(0, r * 0.9)
  c.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.8, -r * 1.4, 0, -r * 0.5)
  c.bezierCurveTo(r * 0.8, -r * 1.4, r * 1.6, -r * 0.2, 0, r * 0.9)
  c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = Math.max(2, r * 0.18); c.stroke(); c.restore()
}

/* ───────────────────────── الخلفية والمشاهد ───────────────────────── */

/** ورق عاجي بحبيبات خفيفة وحافة داكنة قليلًا */
export function drawPaper(c: Ctx, W: number, H: number) {
  c.fillStyle = PAPER; c.fillRect(0, 0, W, H)
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75)
  v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(120,95,50,0.16)')
  c.fillStyle = v; c.fillRect(0, 0, W, H)
  c.save(); c.globalAlpha = 0.05; c.fillStyle = '#5a4a2a'
  for (let i = 0; i < 900; i++) { const x = rnd(i) * W, y = rnd(i + 0.5) * H; c.fillRect(x, y, 1.6, 1.6) }
  c.restore()
}

/** بقعة ألوان مائية غير منتظمة خلف المشهد */
function wash(c: Ctx, x: number, y: number, r: number, color: string, t: number) {
  c.save()
  for (let layer = 0; layer < 3; layer++) {
    c.globalAlpha = 0.22 - layer * 0.05
    c.fillStyle = color
    c.beginPath()
    const n = 14
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const rr = r * (0.82 + 0.18 * rnd(i * 3 + layer * 17) + 0.02 * Math.sin(t * 0.6 + i)) * (1 - layer * 0.12)
      const px = x + Math.cos(a) * rr * 1.25, py = y + Math.sin(a) * rr * 0.85
      if (i === 0) c.moveTo(px, py); else c.quadraticCurveTo(x + Math.cos(a - 0.2) * rr * 1.35, y + Math.sin(a - 0.2) * rr * 0.95, px, py)
    }
    c.fill()
  }
  c.restore()
}

function star(c: Ctx, x: number, y: number, r: number, a: number) {
  c.save(); c.globalAlpha = a; c.fillStyle = GOLD; c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * 0.15)
  c.beginPath()
  for (let i = 0; i < 8; i++) { const ang = (i * Math.PI) / 4, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr) }
  c.closePath(); c.fill(); c.stroke(); c.restore()
}

function crescent(pen: Pen, x: number, y: number, r: number) {
  const c = pen.ctx
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2, true)
  c.fillStyle = GOLD_LIGHT; c.fill('evenodd'); c.restore()
  pen.circle(x, y, r, null, 0.02)
}

function cloud(pen: Pen, x: number, y: number, r: number, fill = WHITE) {
  pen.shape([[x - r * 1.6, y + r * 0.4], [x - r * 1.5, y - r * 0.3], [x - r * 0.8, y - r * 0.7], [x - r * 0.2, y - r * 1.1], [x + r * 0.6, y - r * 0.8], [x + r * 1.3, y - r * 0.5], [x + r * 1.7, y + r * 0.2], [x + r * 1.2, y + r * 0.5], [x, y + r * 0.55]], fill, 0.026)
}

function tree(pen: Pen, x: number, y: number, h: number, t: number, fruit = true) {
  pen.line([[x, y], [x + h * 0.02, y - h * 0.5]], 0.09 * h / pen.s, '#7a5a35')
  const sway = Math.sin(t * 1.2 + x) * h * 0.02
  pen.shape([[x - h * 0.35 + sway, y - h * 0.5], [x - h * 0.42 + sway, y - h * 0.8], [x - h * 0.15 + sway, y - h * 1.05], [x + h * 0.2 + sway, y - h * 1.02], [x + h * 0.42 + sway, y - h * 0.78], [x + h * 0.33 + sway, y - h * 0.5]], '#7fb37a', 0.024)
  if (fruit) for (let i = 0; i < 4; i++) pen.circle(x + sway + (rnd(i + x) - 0.5) * h * 0.55, y - h * (0.62 + rnd(i * 2 + x) * 0.3), h * 0.035, GOLD, 0.012)
}

function ground(pen: Pen, W: number, y: number) {
  pen.line([[W * 0.04, y], [W * 0.3, y + 3], [W * 0.6, y - 2], [W * 0.96, y + 2]], 0.022)
  for (let i = 0; i < 9; i++) { const x = W * (0.08 + i * 0.105); pen.line([[x, y + 14], [x + 22, y + 14]], 0.012, 'rgba(31,43,42,0.4)') }
}

export interface InkFrame { scene: InkScene; figure: boolean; t: number }

/**
 * يرسم المشهد داخل مستطيل (x, y, w, h). t بالثواني منذ بداية المشهد.
 * الشخصية بطول نحو نصف ارتفاع المستطيل.
 */
export function drawInkScene(c: Ctx, x: number, y: number, w: number, h: number, f: InkFrame) {
  const frame = Math.floor(f.t * 8)
  const pen = new Pen(c, Math.min(w, h) * 0.1, frame)
  const t = f.t
  const cx = x + w / 2, gy = y + h * 0.86
  const u = h * 0.2
  const intro = ease(Math.min(1, t / 0.9))
  c.save()
  c.beginPath(); c.rect(x, y, w, h); c.clip()
  wash(c, cx, y + h * 0.5, Math.min(w, h) * 0.42, WASH[f.scene], t)
  c.globalAlpha = intro
  const fig = (pose: Joints, dx = 0, extra: Partial<FigureOpts> = {}) => { if (f.figure) drawFigure(pen, { x: cx + dx, y: gy, u, pose, ...extra }) }

  switch (f.scene) {
    case 'explain': {
      ground(pen, w, gy + 4)
      const k = (Math.sin(t * 2.2) + 1) / 2
      fig(blendPose(POSES.stand, POSES.explain, k), -w * 0.05)
      // فقاعة فكرة ذهبية
      const bx = cx + w * 0.22, by = y + h * 0.22
      pen.circle(cx + w * 0.08, y + h * 0.4, h * 0.018, WHITE, 0.012); pen.circle(cx + w * 0.13, y + h * 0.33, h * 0.03, WHITE, 0.014)
      cloud(pen, bx, by, h * 0.08)
      star(c, bx, by - h * 0.01, h * 0.035, 0.6 + 0.4 * Math.sin(t * 3))
      break
    }
    case 'pray': {
      // سجادة بمحراب ذهبي
      const rx = cx - w * 0.28, rw = w * 0.56, ry = gy - h * 0.035, rh = h * 0.07
      pen.shape([[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]], '#c74d4d', 0.024)
      pen.line([[rx + rw * 0.06, ry + rh * 0.5], [rx + rw * 0.8, ry + rh * 0.5]], 0.02, GOLD)
      pen.line([[rx + rw * 0.82, ry + rh * 0.15], [rx + rw * 0.9, ry + rh * 0.5], [rx + rw * 0.82, ry + rh * 0.85]], 0.02, GOLD)
      for (let i = 0; i < 6; i++) pen.line([[rx - 6, ry + (i + 0.5) * rh / 6], [rx - 18, ry + (i + 0.5) * rh / 6]], 0.01, INK)
      // نافذة مسجد بقوس في الخلفية
      const ax = cx + w * 0.3, ay = y + h * 0.18
      pen.shape([[ax - w * 0.08, ay + h * 0.36], [ax - w * 0.08, ay + h * 0.1], [ax, ay - h * 0.02], [ax + w * 0.08, ay + h * 0.1], [ax + w * 0.08, ay + h * 0.36]], 'rgba(255,253,247,0.7)', 0.02)
      crescent(pen, ax, ay + h * 0.15, h * 0.04)
      fig(prayerPose(t), -w * 0.05, { flip: false })
      break
    }
    case 'quran': {
      ground(pen, w, gy + 4)
      // رحل وعليه مصحف أخضر بزخرفة ذهبية، ونور يصعد
      const sx = cx + w * 0.14, sy = gy - h * 0.02
      pen.line([[sx - w * 0.1, sy], [sx + w * 0.06, sy - h * 0.16]], 0.05, '#8a6238'); pen.line([[sx + w * 0.1, sy], [sx - w * 0.06, sy - h * 0.16]], 0.05, '#8a6238')
      // مصحف مفتوح: غلاف أخضر وصفحتان عاجيتان بسطور ذهبية
      pen.poly([[sx - w * 0.15, sy - h * 0.13], [sx, sy - h * 0.17], [sx + w * 0.15, sy - h * 0.13], [sx + w * 0.15, sy - h * 0.1], [sx, sy - h * 0.14], [sx - w * 0.15, sy - h * 0.1]], '#1f6b4f', 0.024)
      pen.poly([[sx - w * 0.135, sy - h * 0.135], [sx, sy - h * 0.2], [sx, sy - h * 0.155], [sx - w * 0.135, sy - h * 0.11]], WHITE, 0.018)
      pen.poly([[sx + w * 0.135, sy - h * 0.135], [sx, sy - h * 0.2], [sx, sy - h * 0.155], [sx + w * 0.135, sy - h * 0.11]], WHITE, 0.018)
      for (let i = 1; i < 4; i++) { const k = i / 4; pen.line([[sx - w * 0.12, sy - h * (0.13 - 0.0) - k * h * 0.0 + (k - 0.5) * h * 0.02], [sx - w * 0.02, sy - h * 0.17 + (k - 0.5) * h * 0.02]], 0.008, GOLD); pen.line([[sx + w * 0.12, sy - h * 0.13 + (k - 0.5) * h * 0.02], [sx + w * 0.02, sy - h * 0.17 + (k - 0.5) * h * 0.02]], 0.008, GOLD) }
      for (let i = 0; i < 5; i++) { const p = (t * 0.35 + i / 5) % 1; star(c, sx + Math.sin(i * 2 + t) * w * 0.05, sy - h * (0.22 + p * 0.5), h * 0.014 * (1 - p * 0.5), 1 - p) }
      fig(POSES.sit, -w * 0.12, {})
      break
    }
    case 'dua': {
      ground(pen, w, gy + 4)
      // نور ينزل من الأعلى
      const g = c.createLinearGradient(0, y, 0, gy)
      g.addColorStop(0, 'rgba(232,207,138,0.55)'); g.addColorStop(1, 'rgba(232,207,138,0)')
      c.save(); c.globalAlpha *= 0.7 + 0.3 * Math.sin(t * 1.5); c.fillStyle = g; c.beginPath(); c.moveTo(cx - w * 0.08, y); c.lineTo(cx + w * 0.08, y); c.lineTo(cx + w * 0.22, gy); c.lineTo(cx - w * 0.22, gy); c.fill(); c.restore()
      for (let i = 0; i < 6; i++) { const p = (t * 0.25 + i / 6) % 1; star(c, cx + (rnd(i) - 0.5) * w * 0.3, gy - u * 2.2 - p * h * 0.35, h * 0.012, 1 - p) }
      fig(POSES.dua)
      break
    }
    case 'charity': {
      ground(pen, w, gy + 4)
      const k = (t % 3.2) / 3.2
      fig(blendPose(POSES.stand, POSES.give, Math.min(1, k * 3)), -w * 0.16)
      // المحتاج جالس (شخصية صغيرة)
      if (f.figure) drawFigure(pen, { x: cx + w * 0.24, y: gy, u: u * 0.82, pose: POSES.sit, flip: true })
      // عملة ذهبية تنتقل من اليد إلى اليد
      const from: P = [cx - w * 0.16 + 0.85 * u, gy - 1.55 * u], to: P = [cx + w * 0.24 - 0.62 * u * 0.82, gy - 0.8 * u * 0.82]
      const m = Math.max(0, Math.min(1, (k - 0.35) / 0.45))
      const [px, py] = lp(from, to, ease(m)); const arc = Math.sin(m * Math.PI) * h * 0.08
      pen.circle(px, py - arc, h * 0.03, GOLD, 0.016)
      if (k > 0.8) star(c, to[0], to[1] - h * 0.06, h * 0.02, (1 - k) * 5)
      break
    }
    case 'sky': {
      ground(pen, w, gy + 4)
      crescent(pen, x + w * 0.24, y + h * 0.2, h * 0.07)
      for (let i = 0; i < 14; i++) star(c, x + w * (0.12 + rnd(i) * 0.78), y + h * (0.08 + rnd(i + 3) * 0.42), h * (0.012 + rnd(i + 7) * 0.014), 0.5 + 0.5 * Math.sin(t * 2 + i))
      // مدارات
      c.save(); c.strokeStyle = 'rgba(31,43,42,0.35)'; c.setLineDash([8, 10]); c.lineWidth = 2
      c.beginPath(); c.ellipse(x + w * 0.68, y + h * 0.28, w * 0.16, h * 0.06, -0.2, 0, Math.PI * 2); c.stroke(); c.restore()
      const a = t * 0.8; pen.circle(x + w * 0.68 + Math.cos(a) * w * 0.16, y + h * 0.28 + Math.sin(a) * h * 0.06, h * 0.022, '#7f95c9', 0.014)
      pen.circle(x + w * 0.68, y + h * 0.28, h * 0.035, GOLD_LIGHT, 0.016)
      fig(POSES.look, -w * 0.12)
      break
    }
    case 'rain': {
      ground(pen, w, gy + 4)
      cloud(pen, cx - w * 0.15, y + h * 0.18, h * 0.08); cloud(pen, cx + w * 0.18, y + h * 0.14, h * 0.09)
      c.save(); c.strokeStyle = '#4f8fb8'; c.lineWidth = 3; c.lineCap = 'round'
      for (let i = 0; i < 26; i++) { const rx = x + w * (0.18 + rnd(i) * 0.64), p = (t * 0.9 + rnd(i + 5)) % 1, ry = y + h * 0.26 + p * (gy - y - h * 0.3); c.globalAlpha = intro * (1 - p * 0.3); c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 16); c.stroke() }
      c.restore()
      // نبات ينمو
      for (let i = 0; i < 5; i++) {
        const px = x + w * (0.2 + i * 0.15), g = Math.min(1, Math.max(0, (t - i * 0.4) / 3))
        pen.line([[px, gy], [px, gy - h * 0.16 * g]], 0.022, '#3f7d4a')
        if (g > 0.4) { pen.shape([[px, gy - h * 0.1 * g], [px - w * 0.04 * g, gy - h * 0.14 * g], [px, gy - h * 0.13 * g]], '#7fb37a', 0.014); pen.shape([[px, gy - h * 0.13 * g], [px + w * 0.04 * g, gy - h * 0.17 * g], [px, gy - h * 0.16 * g]], '#7fb37a', 0.014) }
      }
      break
    }
    case 'path': {
      // طريق يمتد نحو الأفق والشمس تشرق
      const hy = y + h * 0.42
      const sun = h * 0.08, sy = hy - Math.min(1, t / 4) * h * 0.06
      c.save(); const g = c.createRadialGradient(cx, sy, 0, cx, sy, sun * 3); g.addColorStop(0, 'rgba(232,207,138,0.8)'); g.addColorStop(1, 'rgba(232,207,138,0)'); c.fillStyle = g; c.fillRect(x, y, w, hy - y + 10); c.restore()
      pen.circle(cx, sy, sun, GOLD_LIGHT, 0.02)
      pen.line([[x + w * 0.04, hy], [x + w * 0.96, hy]], 0.02)
      pen.poly([[cx - w * 0.03, hy], [cx + w * 0.03, hy], [cx + w * 0.34, y + h + 4], [cx - w * 0.34, y + h + 4]], '#ead9b4', 0.024)
      for (let i = 0; i < 6; i++) { const p = ((t * 0.3 + i / 6) % 1); const yy = hy + (y + h - hy) * p * p; pen.line([[cx, yy], [cx, yy + h * 0.03 * (0.3 + p)]], 0.02 * (0.4 + p), GOLD) }
      const k = Math.floor(t * 2.4) % 2
      fig(blendPose(POSES.walkA, POSES.walkB, (Math.sin(t * Math.PI * 2.4) + 1) / 2), w * 0.02 + (k ? 0 : 0), {})
      break
    }
    case 'heart': {
      ground(pen, w, gy + 4)
      const pulse = (Math.sin(t * 3) + 1) / 2
      fig(POSES.stand, 0, { glowHeart: 0.6 + 0.4 * pulse })
      for (let i = 0; i < 4; i++) { const p = (t * 0.3 + i / 4) % 1; heartShape(c, cx + (i % 2 ? 1 : -1) * w * (0.18 + p * 0.06), gy - u * 1.4 - p * h * 0.3, h * 0.02 * (1 - p * 0.4), `rgba(226,164,164,${1 - p})`) }
      break
    }
    case 'scale': {
      ground(pen, w, gy + 4)
      const tilt = Math.sin(t * 1.1) * 0.12
      const px = cx, top = y + h * 0.22
      pen.line([[px, gy], [px, top]], 0.05, '#8a6238')
      pen.shape([[px - w * 0.08, gy], [px + w * 0.08, gy], [px + w * 0.05, gy - h * 0.04], [px - w * 0.05, gy - h * 0.04]], '#a87a48', 0.02)
      const L: P = [px - Math.cos(tilt) * w * 0.25, top + Math.sin(tilt) * w * 0.25], R: P = [px + Math.cos(tilt) * w * 0.25, top - Math.sin(tilt) * w * 0.25]
      pen.line([L, R], 0.04, GOLD)
      pen.circle(px, top, h * 0.025, GOLD_LIGHT, 0.016)
      for (const [qx, qy] of [L, R]) {
        pen.line([[qx, qy], [qx - w * 0.07, qy + h * 0.2]], 0.012); pen.line([[qx, qy], [qx + w * 0.07, qy + h * 0.2]], 0.012)
        pen.shape([[qx - w * 0.09, qy + h * 0.2], [qx + w * 0.09, qy + h * 0.2], [qx + w * 0.05, qy + h * 0.25], [qx - w * 0.05, qy + h * 0.25]], GOLD_LIGHT, 0.018)
      }
      break
    }
    case 'sea': {
      const sl = y + h * 0.58
      cloud(pen, x + w * 0.25, y + h * 0.18, h * 0.06)
      const bob = Math.sin(t * 1.6) * h * 0.015, sx = x + w * (0.3 + ((t * 0.03) % 0.4))
      pen.shape([[sx - w * 0.16, sl - h * 0.02 + bob], [sx + w * 0.16, sl - h * 0.02 + bob], [sx + w * 0.1, sl + h * 0.06 + bob], [sx - w * 0.1, sl + h * 0.06 + bob]], '#a87a48', 0.024)
      pen.line([[sx, sl - h * 0.02 + bob], [sx, sl - h * 0.3 + bob]], 0.03, '#7a5a35')
      pen.shape([[sx + 4, sl - h * 0.29 + bob], [sx + w * 0.13, sl - h * 0.08 + bob], [sx + 4, sl - h * 0.06 + bob]], WHITE, 0.022)
      for (let r = 0; r < 4; r++) {
        const yy = sl + h * 0.06 + r * h * 0.075
        const pts: P[] = []
        for (let i = 0; i <= 12; i++) pts.push([x + (w * i) / 12, yy + Math.sin(i * 1.3 + t * 2 + r) * h * 0.012])
        pen.line(pts, 0.022, r % 2 ? '#3f7fa6' : INK)
      }
      break
    }
    case 'garden': {
      ground(pen, w, gy + 4)
      // نهر متعرج
      const pts: P[] = []
      for (let i = 0; i <= 10; i++) pts.push([x + w * (0.1 + i * 0.08), gy - h * 0.05 + Math.sin(i * 0.9 + t) * h * 0.02])
      c.save(); c.globalAlpha *= 0.9; pen.line(pts, 0.12, '#8fc0d8'); c.restore(); pen.line(pts.map(([a, b]) => [a, b - h * 0.03] as P), 0.012, '#3f7fa6')
      tree(pen, x + w * 0.2, gy - h * 0.1, h * 0.42, t); tree(pen, x + w * 0.52, gy - h * 0.12, h * 0.5, t); tree(pen, x + w * 0.82, gy - h * 0.1, h * 0.38, t)
      for (let i = 0; i < 5; i++) { const p = (t * 0.2 + i / 5) % 1; star(c, x + w * (0.15 + rnd(i) * 0.7), y + h * (0.1 + p * 0.1), h * 0.012, Math.sin(p * Math.PI)) }
      break
    }
    case 'mountains': {
      pen.circle(x + w * 0.72, y + h * 0.22, h * 0.06, GOLD_LIGHT, 0.018)
      cloud(pen, x + w * 0.3 + Math.sin(t * 0.3) * w * 0.03, y + h * 0.2, h * 0.05)
      pen.poly([[x - w * 0.05, gy], [x + w * 0.25, y + h * 0.32], [x + w * 0.4, y + h * 0.5], [x + w * 0.6, y + h * 0.28], [x + w * 1.05, gy]], '#c7b596', 0.026)
      pen.poly([[x + w * 0.25, y + h * 0.32], [x + w * 0.31, y + h * 0.39], [x + w * 0.27, y + h * 0.38], [x + w * 0.22, y + h * 0.37]], WHITE, 0.016)
      pen.poly([[x + w * 0.6, y + h * 0.28], [x + w * 0.66, y + h * 0.36], [x + w * 0.61, y + h * 0.34], [x + w * 0.55, y + h * 0.35]], WHITE, 0.016)
      pen.poly([[x + w * 0.15, gy], [x + w * 0.45, y + h * 0.52], [x + w * 0.78, gy]], '#a99474', 0.024)
      for (let i = 0; i < 3; i++) { const bx = x + w * ((0.2 + t * 0.04 + i * 0.25) % 1), by = y + h * (0.15 + i * 0.05); pen.line([[bx - 12, by], [bx, by + 6], [bx + 12, by]], 0.014) }
      break
    }
    case 'family': {
      ground(pen, w, gy + 4)
      const k = (Math.sin(t * 1.4) + 1) / 2
      if (f.figure) drawFigure(pen, { x: cx + w * 0.14, y: gy, u: u * 0.95, pose: POSES.elder, cap: false, cane: true, flip: true })
      fig(blendPose(POSES.stand, POSES.hold, 0.7 + 0.3 * k), -w * 0.12)
      heartShape(c, cx + w * 0.01, gy - u * 2.4 - k * h * 0.03, h * 0.025, '#e2a4a4')
      break
    }
    case 'warning': {
      ground(pen, w, gy + 4)
      cloud(pen, cx + w * 0.15, y + h * 0.2, h * 0.1, '#8e8a92')
      if (Math.floor(t * 1.3) % 3 === 0) pen.line([[cx + w * 0.2, y + h * 0.26], [cx + w * 0.16, y + h * 0.36], [cx + w * 0.22, y + h * 0.37], [cx + w * 0.17, y + h * 0.5]], 0.03, GOLD)
      fig(POSES.dua, -w * 0.16)
      break
    }
    case 'light': {
      // قنديل معلّق ينير
      const lx = cx, ly = y + h * 0.42 + Math.sin(t * 1.2) * h * 0.01
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, h * 0.42)
      g.addColorStop(0, `rgba(240,214,140,${0.75 + 0.15 * Math.sin(t * 2.5)})`); g.addColorStop(1, 'rgba(240,214,140,0)')
      c.save(); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore()
      pen.line([[lx, y], [lx, ly - h * 0.16]], 0.016)
      pen.shape([[lx - w * 0.06, ly - h * 0.16], [lx + w * 0.06, ly - h * 0.16], [lx + w * 0.09, ly - h * 0.05], [lx + w * 0.07, ly + h * 0.1], [lx - w * 0.07, ly + h * 0.1], [lx - w * 0.09, ly - h * 0.05]], 'rgba(255,240,200,0.9)', 0.026)
      pen.line([[lx - w * 0.08, ly - h * 0.05], [lx + w * 0.08, ly - h * 0.05]], 0.016, GOLD)
      pen.shape([[lx - w * 0.015, ly + h * 0.05], [lx, ly - h * 0.03 + Math.sin(t * 6) * 4], [lx + w * 0.015, ly + h * 0.05]], '#f0b54a', 0.012)
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + t * 0.2; pen.line([[lx + Math.cos(a) * h * 0.2, ly + Math.sin(a) * h * 0.2], [lx + Math.cos(a) * h * 0.27, ly + Math.sin(a) * h * 0.27]], 0.014, GOLD) }
      break
    }
    case 'daynight': {
      const k = (Math.sin(t * 0.7) + 1) / 2 // 0 نهار، 1 ليل
      wash(c, cx, y + h * 0.5, Math.min(w, h) * 0.44, `rgba(52,64,110,${0.9 * k})`, t)
      const arc = (a: number): P => [cx + Math.cos(a) * w * 0.34, y + h * 0.72 - Math.sin(a) * h * 0.5]
      const sa = Math.PI * (0.15 + 0.7 * (1 - k)), ma = Math.PI * (0.15 + 0.7 * k)
      if (k < 0.85) { const [sx, sy] = arc(sa); pen.circle(sx, sy, h * 0.07, GOLD_LIGHT, 0.02) }
      if (k > 0.15) { const [mx, my] = arc(Math.PI - ma); crescent(pen, mx, my, h * 0.055) }
      if (k > 0.5) for (let i = 0; i < 10; i++) star(c, x + w * (0.1 + rnd(i + 20) * 0.8), y + h * (0.08 + rnd(i + 40) * 0.35), h * 0.012, (k - 0.5) * 2)
      pen.shape([[x - 10, gy], [x + w * 0.3, gy - h * 0.12], [x + w * 0.6, gy - h * 0.06], [x + w + 10, gy - h * 0.14], [x + w + 10, y + h + 10], [x - 10, y + h + 10]], '#b9a68c', 0.024)
      break
    }
    case 'knowledge': {
      ground(pen, w, gy + 4)
      // كتب مكدسة وقلم
      const bx = cx + w * 0.22
      const books: [string, number][] = [['#1f6b4f', 0], ['#a8473f', 1], ['#c9a24a', 2]]
      for (const [col, i] of books) pen.shape([[bx - w * 0.12, gy - h * 0.045 * i], [bx + w * 0.12, gy - h * 0.045 * i], [bx + w * 0.12, gy - h * 0.045 * (i + 1)], [bx - w * 0.12, gy - h * 0.045 * (i + 1)]], col, 0.02)
      pen.line([[bx - w * 0.04, gy - h * 0.2], [bx + w * 0.08, gy - h * 0.32]], 0.03, '#7a5a35')
      for (let i = 0; i < 4; i++) { const p = (t * 0.3 + i / 4) % 1; star(c, bx + Math.sin(i + t) * w * 0.05, gy - h * (0.18 + p * 0.35), h * 0.014, 1 - p) }
      fig(blendPose(POSES.stand, POSES.explain, (Math.sin(t * 1.8) + 1) / 2), -w * 0.14)
      break
    }
  }
  c.restore()
}
