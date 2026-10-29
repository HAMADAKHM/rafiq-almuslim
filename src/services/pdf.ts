// ملفات PDF على الجهاز دون مكتبات ولا خادم: تُرسم الصفحات على Canvas (فيتشكّل الخط العربي ويُكتب من
// اليمين كما في التطبيق)، ثم تُضمَّن صورًا (JPEG) في ملف PDF بقياس A4 يكتبه writePdf.

export interface PdfPage { jpeg: Uint8Array; width: number; height: number }

const enc = new TextEncoder()

/** يكتب ملف PDF صحيحًا: صفحة A4 لكل صورة، والصورة بملء الصفحة */
export function writePdf(pages: PdfPage[], title = 'رفيق المسلم'): Uint8Array {
  const W = 595.28, H = 841.89
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let size = 0
  const push = (b: Uint8Array | string) => { const u = typeof b === 'string' ? enc.encode(b) : b; chunks.push(u); size += u.length }
  const obj = (n: number, body: (string | Uint8Array)[]) => { offsets[n] = size; push(`${n} 0 obj\n`); body.forEach(push); push('\nendobj\n') }
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  // 1 الفهرس، 2 الصفحات، 3 المعلومات، ثم لكل صفحة: الصفحة والمحتوى والصورة
  const kids = pages.map((_, i) => `${4 + i * 3} 0 R`).join(' ')
  obj(1, ['<< /Type /Catalog /Pages 2 0 R >>'])
  obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`])
  // العنوان بترميز UTF-16BE (يدعم العربية)
  const t16 = ['FEFF', ...[...title].map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0').toUpperCase())].join('')
  obj(3, [`<< /Title <${t16}> /Producer (Rafiq Al-Muslim) >>`])
  pages.forEach((p, i) => {
    const pageN = 4 + i * 3, contN = pageN + 1, imgN = pageN + 2
    // الصورة تُحجَّم لتملأ الصفحة مع الحفاظ على النسبة
    const k = Math.min(W / p.width, H / p.height)
    const w = p.width * k, h = p.height * k, x = (W - w) / 2, y = (H - h) / 2
    const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`
    obj(pageN, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${imgN} 0 R >> >> /Contents ${contN} 0 R >>`])
    obj(contN, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`])
    obj(imgN, [`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream'])
  })
  const count = 4 + pages.length * 3
  const xref = size
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  const out = new Uint8Array(size)
  let o = 0
  for (const c of chunks) { out.set(c, o); o += c.length }
  return out
}

// ---------- تخطيط الصفحات ----------
export type PdfBlock =
  | { type: 'title'; text: string }
  | { type: 'subtitle'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string; arabic?: boolean }
  | { type: 'note'; text: string }
  | { type: 'divider' }
  | { type: 'table'; head: string[]; rows: string[][]; highlight?: number }

export interface PdfTheme { accent: string; ink: string; muted: string; paper: string }
export const PDF_THEME: PdfTheme = { accent: '#0B4A3E', ink: '#1d1d1d', muted: '#6b6b6b', paper: '#fffdf7' }

const PW = 1240, PH = 1754, M = 90
const FONT_TEXT = '"Noto Naskh Arabic", "Amiri", "Scheherazade New", serif'
const FONT_QURAN = '"Amiri Quran", "Amiri", "Scheherazade New", serif'

/** تقسيم النص إلى أسطر بعرض محدد (بالكلمات) */
export function wrapLines(measure: (s: string) => number, text: string, width: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ''
    for (const w of words) {
      const t = line ? `${line} ${w}` : w
      if (measure(t) <= width || !line) line = t
      else { out.push(line); line = w }
    }
    out.push(line)
  }
  return out
}

/** يرسم الكتل على صفحات A4 (150 نقطة/إنش) مع رأس وتذييل، ويعيدها صورًا */
export async function renderPdfPages(blocks: PdfBlock[], opts: { footer: string; theme?: PdfTheme } = { footer: '' }): Promise<PdfPage[]> {
  const theme = opts.theme ?? PDF_THEME
  try { await Promise.all([document.fonts?.load(`32px ${FONT_TEXT}`), document.fonts?.load(`40px ${FONT_QURAN}`)]) } catch { /* خطوط النظام */ }
  const pages: PdfPage[] = []
  let c = document.createElement('canvas')
  let ctx = c.getContext('2d')!
  let y = 0
  const start = () => {
    c = document.createElement('canvas'); c.width = PW; c.height = PH
    ctx = c.getContext('2d')!
    ctx.fillStyle = theme.paper; ctx.fillRect(0, 0, PW, PH)
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.strokeRect(40, 40, PW - 80, PH - 80)
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'
    y = M + 10
  }
  const finish = async () => {
    ctx.font = `24px ${FONT_TEXT}`; ctx.fillStyle = theme.muted; ctx.textAlign = 'center'
    ctx.fillText(`${opts.footer}${opts.footer ? ' — ' : ''}${pages.length + 1}`, PW / 2, PH - 60)
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/jpeg', 0.9))
    pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: PW, height: PH })
  }
  const need = async (h: number) => { if (y + h > PH - M - 40) { await finish(); start() } }
  const lines = async (text: string, font: string, size: number, color: string, lh: number, align: CanvasTextAlign = 'right') => {
    ctx.font = `${size}px ${font}`
    for (const l of wrapLines((s) => ctx.measureText(s).width, text, PW - 2 * M)) {
      await need(lh)
      ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.direction = 'rtl'
      ctx.fillText(l, align === 'center' ? PW / 2 : PW - M, y + size)
      y += lh
    }
  }
  start()
  for (const b of blocks) {
    if (b.type === 'title') { await lines(b.text, FONT_TEXT, 54, theme.accent, 80, 'center'); y += 6 }
    else if (b.type === 'subtitle') { await lines(b.text, FONT_TEXT, 30, theme.muted, 46, 'center'); y += 10 }
    else if (b.type === 'heading') { y += 10; await lines(b.text, FONT_TEXT, 36, theme.accent, 56) }
    else if (b.type === 'text') { await lines(b.text, b.arabic ? FONT_QURAN : FONT_TEXT, b.arabic ? 36 : 30, theme.ink, b.arabic ? 66 : 50); y += 8 }
    else if (b.type === 'note') { await lines(b.text, FONT_TEXT, 24, theme.muted, 38); y += 6 }
    else if (b.type === 'divider') { await need(30); ctx.strokeStyle = theme.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M + 120, y + 12); ctx.lineTo(PW - M - 120, y + 12); ctx.stroke(); ctx.globalAlpha = 1; y += 30 }
    else if (b.type === 'table') {
      const cols = b.head.length, cw = (PW - 2 * M) / cols, rh = 46
      const row = async (cells: string[], head: boolean, i: number) => {
        await need(rh)
        if (head) { ctx.fillStyle = theme.accent; ctx.fillRect(M, y, PW - 2 * M, rh) }
        else if (i === b.highlight) { ctx.fillStyle = 'rgba(226,194,126,0.35)'; ctx.fillRect(M, y, PW - 2 * M, rh) }
        else if (i % 2) { ctx.fillStyle = 'rgba(11,74,62,0.05)'; ctx.fillRect(M, y, PW - 2 * M, rh) }
        ctx.font = `${head ? 'bold ' : ''}24px ${FONT_TEXT}`; ctx.fillStyle = head ? '#fff' : theme.ink; ctx.textAlign = 'center'
        cells.forEach((t, k) => ctx.fillText(t, PW - M - cw * k - cw / 2, y + 32))
        y += rh
      }
      await row(b.head, true, -1)
      for (let i = 0; i < b.rows.length; i++) await row(b.rows[i], false, i)
      y += 16
    }
  }
  await finish()
  return pages
}

/** يبني الملف كاملًا (Blob) */
export async function buildPdf(blocks: PdfBlock[], title: string, footer = 'رفيق المسلم — صدقة جارية'): Promise<Blob> {
  const pages = await renderPdfPages(blocks, { footer })
  return new Blob([writePdf(pages, title) as BlobPart], { type: 'application/pdf' })
}
