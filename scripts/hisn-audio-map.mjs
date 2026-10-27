// يطابق أذكار التطبيق ونصوص «حصن المسلم» (hisnmuslim.com) نصًا بنص، ويطبع الملف الصوتي لكل ذكر مطابق.
// لا ربط بالتخمين: يُقبل فقط تطابق النص بعد إزالة التشكيل والترقيم، أو أن يكون أحدهما جزءًا كاملًا من الآخر
// بنسبة طول ≥ 0.85 (مثل «ثلاث مرات» في آخره)، أو تشابه كلمات ≥ 0.9 مع نسبة طول ≥ 0.9 (اختلاف حرف أو حرفين).
// التشغيل (يحتاج إنترنت): npx tsx scripts/hisn-audio-map.mjs
import { ADHKAR } from '../src/content/adhkar.ts'
import { DUAS } from '../src/content/duas.ts'
import { searchSkeleton } from '../src/lib/arabic.ts'

const API = 'https://www.hisnmuslim.com/api/ar'
const get = async (u) => { const r = await fetch(u); const t = (await r.text()).replace(/^﻿/, ''); return JSON.parse(t) }
const norm = (s) => searchSkeleton(String(s).replace(/[()«»﴿﴾،؛؟.,!:\-–—"']/g, ' ').replace(/\[[^\]]*\]/g, ' ')).replace(/\s+/g, ' ').trim()
const chapters = Object.values(await get(`${API}/husn_ar.json`))[0]
const hisn = []
for (const ch of chapters) {
  try {
    const items = Object.values(await get(`${API}/${ch.ID}.json`))[0]
    for (const it of items) if (it.AUDIO) hisn.push({ ch: ch.TITLE, n: /\/(\d+)\.mp3$/.exec(it.AUDIO)?.[1], sk: norm(it.ARABIC_TEXT ?? '') })
  } catch (e) { console.error('chapter', ch.ID, e.message) }
}
const ours = [...ADHKAR, ...DUAS].flatMap((c) => c.items.filter((x) => x.text).map((x) => ({ id: x.id, sk: norm(x.text) })))
const words = (s) => new Set(s.split(' ').filter(Boolean))
const jac = (a, b) => { const A = words(a), B = words(b); let i = 0; for (const w of A) if (B.has(w)) i++; return i / (A.size + B.size - i) }
const map = {}, review = [], none = []
for (const o of ours) {
  let best = null
  for (const h of hisn) {
    if (!h.n) continue
    const ratio = Math.min(h.sk.length, o.sk.length) / Math.max(h.sk.length, o.sk.length)
    let score = 0, how = ''
    if (h.sk === o.sk) { score = 1; how = 'eq' }
    else if ((h.sk.includes(o.sk) || o.sk.includes(h.sk)) && ratio >= 0.85) { score = 0.95 + ratio / 100; how = 'in' }
    else { const j = jac(o.sk, h.sk); if (j >= 0.9 && ratio >= 0.9) { score = j * 0.9; how = 'jw' } else if (j > 0.45) { score = j * 0.5; how = 'near' } }
    if (score > (best?.score ?? 0)) best = { ...h, score, how, ratio }
  }
  if (best && best.how !== 'near') map[o.id] = Number(best.n)
  if (best && best.how !== 'eq') review.push(`${o.id}#${best.n}[${best.how}${best.ratio.toFixed(2)}] ${o.sk.slice(0, 70)} ‖ ${best.sk.slice(0, 70)}`)
  if (!best) none.push(o.id)
}
console.log('SUM ' + JSON.stringify({ hisn: hisn.length, ours: ours.length, matched: Object.keys(map).length }))
console.log('MAP ' + JSON.stringify(map))
console.log('REVIEW ' + review.join(' ¦ '))
console.log('NONE ' + none.join(' '))
