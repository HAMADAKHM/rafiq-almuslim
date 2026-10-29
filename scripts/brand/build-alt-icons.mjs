#!/usr/bin/env node
// يولّد أيقونات التطبيق البديلة لـ Android من src/themes/appIconSvg.ts (Chromium عبر Playwright):
// لكل أيقونة: صورة تقليدية مستديرة الزوايا ودائرية لكل كثافة، وطبقتا الأيقونة التكيفية (الخلفية بزخرفتها، والرمز).
// الاستخدام: npx tsx scripts/brand/build-alt-icons.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { APP_ICON_IDS, appIconSvg } from '../../src/themes/appIconSvg.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const res = path.join(root, 'android/app/src/main/res')
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
const page = await browser.newPage()
async function png(svg, size, out) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
}
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const id of APP_ICON_IDS) {
  const name = `ic_alt_${id}`
  for (const [d, k] of Object.entries(dens)) {
    const dir = path.join(res, `mipmap-${d}`)
    await png(appIconSvg(id), Math.round(48 * k), path.join(dir, `${name}.png`))
    await png(appIconSvg(id, { radius: 256 }), Math.round(48 * k), path.join(dir, `${name}_round.png`))
    await png(appIconSvg(id, { background: false, scale: 0.7 }), Math.round(108 * k), path.join(dir, `${name}_fg.png`))
    // خلفية مربعة بلا رمز (النظام يقصها بشكله)
    await png(appIconSvg(id, { radius: 0 }).replace(/<g transform="translate\(256 256\)[\s\S]*?<\/g>\s*<\/svg>/, '</svg>'), Math.round(108 * k), path.join(dir, `${name}_bg.png`))
  }
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/${name}_bg"/>\n    <foreground android:drawable="@mipmap/${name}_fg"/>\n</adaptive-icon>\n`
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', `${name}.xml`), xml)
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', `${name}_round.xml`), xml)
  console.log('✓', name)
}
await browser.close()
