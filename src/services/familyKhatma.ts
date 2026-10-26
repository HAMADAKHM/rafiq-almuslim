// ختمة العائلة (رفيق بلس): توزيع الأجزاء الثلاثين على أفراد العائلة، ومتابعة الإتمام على جهاز المنظِّم،
// ومشاركة التوزيع برسالة (واتساب وغيره). لا خادم ولا حسابات: كل فرد يقرأ جزأه ويُبلغ المنظِّم.
export interface FamilyKhatma {
  id: string
  name: string
  /** إهداء اختياري يكتبه المستخدم (مثل: عن روح فلان) */
  dedication: string
  members: string[]
  /** الجزء (1–30) → فهرس الفرد في members */
  assign: number[]
  done: boolean[]
  createdAt: string
}

/** توزيع متوازن: أجزاء متتالية لكل فرد بالتساوي قدر الإمكان */
export function distribute(memberCount: number): number[] {
  const n = Math.max(1, Math.min(30, memberCount))
  const base = Math.floor(30 / n), extra = 30 % n
  const out: number[] = []
  for (let m = 0; m < n; m++) for (let k = 0; k < base + (m < extra ? 1 : 0); k++) out.push(m)
  return out
}

export function newFamilyKhatma(name: string, dedication: string, members: string[], today: string): FamilyKhatma {
  const clean = members.map((m) => m.trim()).filter(Boolean).slice(0, 30)
  return { id: Math.random().toString(36).slice(2, 10), name: name.trim() || 'ختمة العائلة', dedication: dedication.trim(), members: clean, assign: distribute(clean.length), done: Array(30).fill(false), createdAt: today }
}

export const juzOf = (k: FamilyKhatma, member: number) => k.assign.map((m, j) => (m === member ? j + 1 : 0)).filter(Boolean)

const AR = (n: number) => n.toLocaleString('ar-EG')

/** نص الرسالة لمشاركة التوزيع */
export function shareMessage(k: FamilyKhatma, juzStart: (juz: number) => string): string {
  const lines = [`📖 ${k.name}`]
  if (k.dedication) lines.push(k.dedication)
  lines.push('')
  k.members.forEach((m, i) => {
    const js = juzOf(k, i)
    if (!js.length) return
    lines.push(`• ${m}: ${js.length === 1 ? `الجزء ${AR(js[0])}` : `الأجزاء ${AR(js[0])}–${AR(js[js.length - 1])}`} (يبدأ من ${juzStart(js[0])})`)
  })
  const left = k.done.filter((d) => !d).length
  lines.push('', left ? `تمّ ${AR(30 - left)} من ٣٠ جزءًا — بارك الله فيكم` : 'تمّت الختمة بحمد الله، تقبّل الله منا ومنكم')
  lines.push('— من تطبيق رفيق المسلم')
  return lines.join('\n')
}
