// يبني public/data/hisn.json من نصوص «حصن المسلم» (hisnmuslim.com) كما هي، مع رقم التسجيل الصوتي لكل ذكر.
// النص لا يُعدَّل: يُزال فقط علامة BOM والمسافات الزائدة في الطرفين.
// التشغيل (يحتاج إنترنت): node scripts/build-hisn-data.mjs [مجلد فيه ملفات API منزّلة مسبقًا]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const API = 'https://www.hisnmuslim.com/api/ar'
const local = process.argv[2]
const parse = (t) => JSON.parse(t.replace(/^﻿/, ''))
async function get(name) {
  if (local && existsSync(join(local, name))) return parse(readFileSync(join(local, name), 'utf8'))
  const r = await fetch(`${API}/${name}`)
  if (!r.ok) throw new Error(`${name}: ${r.status}`)
  return parse(await r.text())
}

const chapters = Object.values(await get('husn_ar.json'))[0]
const out = []
for (const ch of chapters) {
  const items = Object.values(await get(`${ch.ID}.json`))[0]
  out.push({
    id: Number(ch.ID),
    title: String(ch.TITLE).trim(),
    items: items.map((it) => ({
      n: Number(it.ID),
      text: String(it.ARABIC_TEXT).trim(),
      repeat: Number(it.REPEAT) > 1 ? Number(it.REPEAT) : undefined,
      audio: Number(/\/(\d+)\.mp3$/.exec(it.AUDIO ?? '')?.[1]) || undefined,
    })),
  })
}
const data = { source: 'حصن المسلم — سعيد بن علي بن وهف القحطاني (hisnmuslim.com)', chapters: out }
writeFileSync('public/data/hisn.json', JSON.stringify(data))
console.log(out.length, 'chapters,', out.reduce((a, c) => a + c.items.length, 0), 'items')
