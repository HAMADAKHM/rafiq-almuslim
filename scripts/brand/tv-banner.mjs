// يولّد شعار تطبيق التلفاز (Android TV banner) بمقاس 320×180 من شعار التطبيق: node scripts/brand/tv-banner.mjs
import { chromium } from '@playwright/test'
import { logoSvg } from './logo-svg.mjs'
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
const p = await b.newPage({ viewport: { width: 320, height: 180 } })
await p.setContent(`<html dir="rtl"><body style="margin:0;width:320px;height:180px;display:flex;align-items:center;justify-content:center;gap:14px;background:linear-gradient(155deg,#0B4A3E,#073B32);font-family:Amiri,'Noto Naskh Arabic',serif">
<div style="width:96px;height:96px">${logoSvg({ background: false, scale: 1 }).replace('<svg', '<svg width="96" height="96"')}</div>
<div style="color:#E9CF8E;text-align:center;line-height:1.2"><div style="font-size:34px;font-weight:700">رفيق المسلم</div><div style="font-size:17px;color:#F5F0E6">شاشة المواقيت</div></div></body></html>`)
await p.waitForTimeout(400)
await p.screenshot({ path: 'android-tv/app/src/main/res/drawable/banner.png' })
await b.close()
