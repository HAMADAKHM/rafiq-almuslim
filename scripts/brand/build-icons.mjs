#!/usr/bin/env node
// يولّد أيقونات التطبيق كلها من شعار واحد (scripts/brand/logo-svg.mjs) باستخدام Chromium (Playwright).
// الاستخدام: node scripts/brand/build-icons.mjs   (PW_CHROMIUM_PATH اختياري)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { logoSvg } from './logo-svg.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
const page = await browser.newPage()

async function png(svg, size, out, transparent = false) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } })
}

const full = logoSvg()
// أيقونة مربعة بلا زوايا مستديرة للأنظمة التي تقص الأيقونة بنفسها (iOS، Android القديم المستدير)
const square = full.replace('rx="112"', 'rx="0"')
const fg = logoSvg({ background: false, scale: 0.82 }) // المنطقة الآمنة في الأيقونة التكيفية ≈ 66%

fs.writeFileSync(path.join(root, 'public/icon.svg'), full + '\n')
await png(full, 192, path.join(root, 'public/icon-192.png'))
await png(full, 512, path.join(root, 'public/icon-512.png'))
await png(square, 1024, path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'))
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(dens)) {
  const res = path.join(root, `android/app/src/main/res/mipmap-${d}`)
  await png(full, Math.round(48 * k), path.join(res, 'ic_launcher.png'), true)
  await png(full.replace('rx="112"', 'rx="256"'), Math.round(48 * k), path.join(res, 'ic_launcher_round.png'), true)
  await png(fg, Math.round(108 * k), path.join(res, 'ic_launcher_foreground.png'), true)
}
await browser.close()
console.log('✓ أُنشئت الأيقونات')
