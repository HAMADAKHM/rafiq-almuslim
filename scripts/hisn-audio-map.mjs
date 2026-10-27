// يطابق أذكار التطبيق ونصوص «حصن المسلم» (hisnmuslim.com) نصًا بنص، ويطبع الملف الصوتي لكل ذكر مطابق.
// لا ربط بالتخمين: المطابقة بعد إزالة التشكيل والترقيم فقط (تطابق تام، أو أحدهما جزء كامل من الآخر بنسبة طول ≥ 0.9).
// التشغيل (يحتاج إنترنت): npx tsx scripts/hisn-audio-map.mjs
import { ADHKAR } from '../src/content/adhkar.ts'
import { DUAS } from '../src/content/duas.ts'
import { searchSkeleton } from '../src/lib/arabic.ts'

const API = 'https://www.hisnmuslim.com/api/ar'
const get = async (u) => { const r = await fetch(u); const t = (await r.text()).replace(/^﻿/, ''); return JSON.parse(t) }
const chapters = Object.values(await get(`${API}/husn_ar.json`))[0]
const hisn = []
for (const ch of chapters) {
  try {
    const items = Object.values(await get(`${API}/${ch.ID}.json`))[0]
    for (const it of items) if (it.AUDIO) hisn.push({ ch: ch.TITLE, id: it.ID, audio: it.AUDIO, sk: searchSkeleton(String(it.ARABIC_TEXT ?? '').replace(/\(|\)|«|»|﴿|﴾/g, ' ')), repeat: it.REPEAT })
  } catch (e) { console.error('chapter', ch.ID, e.message) }
}
const ours = [...ADHKAR, ...DUAS].flatMap((c) => c.items.filter((x) => x.text).map((x) => ({ cat: c.id, id: x.id, sk: searchSkeleton(x.text), count: x.count })))
const out = {}
const report = []
for (const o of ours) {
  let best = null
  for (const h of hisn) {
    let score = 0
    if (h.sk === o.sk) score = 1
    else if (h.sk.includes(o.sk) || o.sk.includes(h.sk)) score = Math.min(h.sk.length, o.sk.length) / Math.max(h.sk.length, o.sk.length)
    if (score > (best?.score ?? 0)) best = { ...h, score }
  }
  if (best && best.score >= 0.9) {
    const n = /\/(\d+)\.mp3$/.exec(best.audio)?.[1]
    if (n) { out[o.id] = Number(n); report.push(`${o.id}=${n}@${best.score.toFixed(2)}`) }
  }
}
console.log(JSON.stringify({ hisnItems: hisn.length, ours: ours.length, matched: Object.keys(out).length }))
console.log('MAP ' + JSON.stringify(out))
console.log('REPORT ' + report.join(' '))
