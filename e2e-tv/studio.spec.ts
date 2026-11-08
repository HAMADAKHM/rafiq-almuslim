// استوديو الشاشة من الجوال على التلفاز: الأحجام والأماكن والألوان (بريميوم فقط)، ورمز QR للربط
import { expect, test, type Page } from '@playwright/test'
import jsQR from 'jsqr'
import { parsePairLink } from '../src/tv/studio'

const CITY = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' }
const STUDIO = { clockScale: 140, prayersScale: 120, cardScale: 100, clockSide: 'left', prayersPos: 'top', showCard: false, font: 'naskh', accent: '#7fd8be', text: '#f3ebd7' }

async function open(page: Page, url: string, settings: object) {
  await page.clock.install({ time: new Date('2026-11-08T10:00:00+02:00') })
  await page.addInitScript((s) => localStorage.setItem('rafiq-tv:settings', JSON.stringify(s)), settings)
  await page.goto(url)
  await expect(page.locator('.tv-clock')).toBeVisible()
}

test('استوديو الشاشة يُطبَّق في بريميوم: ساعة أكبر، والمواقيت أعلى، والبطاقة مخفية، واللون والخط المختاران', async ({ page }) => {
  await open(page, '/tv.html?ed=premium', { city: CITY, studio: STUDIO })
  const clock = await page.locator('.tv-clock').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(clock).toBeCloseTo(1920 * 0.074 * 1.4, 0)
  await expect(page.locator('.tv-card')).toBeHidden()
  await expect(page.locator('.tv-prayers')).toHaveCSS('order', '1')
  await expect(page.locator('.tv-next-time')).toHaveCSS('color', 'rgb(127, 216, 190)')
  await expect(page.locator('.tv-next-name')).toHaveCSS('font-family', /Noto Naskh Arabic/)
  await expect(page.locator('.tv')).toHaveClass(/swap/)
})

test('النسخة الجديدة تتجاهل إعدادات الاستوديو', async ({ page }) => {
  await open(page, '/tv.html', { city: CITY, studio: STUDIO })
  const clock = await page.locator('.tv-clock').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(clock).toBeCloseTo(1920 * 0.074, 0)
  await expect(page.locator('.tv-card')).toBeVisible()
})

async function fakeBridge(page: Page, snapshots: string[]) {
  await page.exposeFunction('__snap', (j: string) => { snapshots.push(j) })
  await page.addInitScript(() => {
    const st = { pairing: true, code: '048213', until: Date.now() + 300_000, ip: '192.168.1.23', port: 8765, devices: [] }
    ;(window as unknown as { RafiqTV: object }).RafiqTV = {
      startPairing: () => JSON.stringify(st), stopPairing: () => {}, getRemoteStatus: () => JSON.stringify(st), removeRemoteDevice: () => {},
      setRemoteSnapshot: (j: string) => (window as unknown as { __snap: (j: string) => void }).__snap(j), takeRemotePatch: () => '',
      getAutostart: () => true, canOpenFromBackground: () => true, getStatus: () => '{}', getDevice: () => '{}', getHomeMode: () => false, getIdleTakeover: () => true, getBackgrounds: () => '[]',
    }
  })
}

test('رمز QR للربط في بريميوم يحمل العنوان والمنفذ والرمز، ويقرؤه الجوال', async ({ page }) => {
  const snaps: string[] = []
  await fakeBridge(page, snaps)
  await open(page, '/tv.html?ed=premium&app=1', { city: CITY, studio: STUDIO })
  await expect.poll(() => snaps.some((j) => JSON.parse(j).premium === true && JSON.parse(j).studio?.clockScale === 140)).toBe(true)
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await page.getByRole('button', { name: /التحكم من الجوال/ }).click()
  const svg = page.getByRole('img', { name: 'رمز QR للربط' })
  await expect(svg).toBeVisible()
  // إعادة رسم المسار المعروض صورةً ثم قراءته بمكتبة الجوال نفسها
  const { d, size } = await svg.evaluate((el) => ({ d: el.querySelector('path')!.getAttribute('d')!, size: Number(el.getAttribute('viewBox')!.split(' ')[2]) }))
  const cell = 4, w = size * cell, px = new Uint8ClampedArray(w * w * 4).fill(255)
  for (const m of d.matchAll(/M(\d+) (\d+)/g)) {
    const x0 = Number(m[1]) * cell, y0 = Number(m[2]) * cell
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) { const i = ((y0 + y) * w + x0 + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0 }
  }
  const got = jsQR(px, w, w)
  expect(parsePairLink(got!.data)).toEqual({ host: '192.168.1.23', port: 8765, code: '048213' })
})

test('النسخة الجديدة: رمز الربط بالأرقام كما هو بلا QR', async ({ page }) => {
  await fakeBridge(page, [])
  await open(page, '/tv.html?app=1', { city: CITY })
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await page.getByRole('button', { name: /التحكم من الجوال/ }).click()
  await expect(page.locator('.tv-pair-code')).toHaveText('048 213')
  await expect(page.getByRole('img', { name: 'رمز QR للربط' })).toHaveCount(0)
})

test('الشريط السفلي كما كان: تشغيل القراءة، وواجهة التلفاز، والإعدادات — وكل أقسام الإعدادات وزر الحفظ ظاهرة', async ({ page }) => {
  await fakeBridge(page, [])
  await page.addInitScript(() => { const w = window as unknown as { RafiqTV: Record<string, unknown> }; w.RafiqTV.openOriginalHome = () => true; w.RafiqTV.getApps = () => '[]' })
  await open(page, '/tv.html?app=1', { city: CITY })
  const bar = page.locator('.tv-actions')
  for (const n of ['تشغيل القراءة', 'واجهة التلفاز', 'الإعدادات']) await expect(bar.getByRole('button', { name: new RegExp(n) })).toBeInViewport()
  await expect(bar.getByRole('button')).toHaveCount(3)
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  const nav = page.getByRole('navigation', { name: 'أقسام الإعدادات' })
  for (const n of ['المدينة', 'المشاهد', 'التحكم من الجوال', 'القارئ والصوت', 'التشغيل التلقائي']) await expect(nav.getByRole('button', { name: new RegExp(n) })).toBeAttached()
  await expect(nav.getByRole('button', { name: /حفظ وعرض الشاشة/ })).toBeInViewport()
})
