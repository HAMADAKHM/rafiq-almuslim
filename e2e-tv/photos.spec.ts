// صور الجوال على التلفاز: الصورة التي تصل الآن تظهر فورًا (لا تنتظر دورها)، والحذف يزيلها
import { expect, test } from '@playwright/test'

const CITY = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' }
// صور صغيرة مختلفة الألوان (PNG 1×1)
const PNG: Record<string, string> = {
  a: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  b: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  c: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
}

test('صورة جديدة من الجوال تظهر فورًا على الشاشة، والمحذوفة تختفي', async ({ page }) => {
  await page.addInitScript((png) => {
    const w = window as unknown as { __ids: string[]; RafiqPhotos: object }
    w.__ids = ['a', 'b']
    w.RafiqPhotos = { getBackgrounds: () => JSON.stringify(w.__ids), getBackground: (id: string) => (w.__ids.includes(id) ? `data:image/png;base64,${png[id]}` : '') }
  }, PNG)
  await page.addInitScript((city) => localStorage.setItem('rafiq-tv:settings', JSON.stringify({ city, scene: 'photos', rotateMin: 30, shuffle: false })), CITY)
  await page.goto('/tv.html')
  const top = page.locator('.tv-photo.on')
  await expect(top).toHaveAttribute('style', /iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/)
  // وصلت صورة «c» من الجوال (التطبيق يرسل حدث rafiq-backgrounds)
  await page.evaluate(() => { (window as unknown as { __ids: string[] }).__ids.push('c'); window.dispatchEvent(new Event('rafiq-backgrounds')) })
  await expect(top).toHaveAttribute('style', new RegExp(PNG.c.slice(60, 90).replace(/[+/]/g, '\\$&')), { timeout: 3000 })
  // حُذفت كل الصور: تعود الشاشة إلى المشاهد
  await page.evaluate(() => { (window as unknown as { __ids: string[] }).__ids.length = 0; window.dispatchEvent(new Event('rafiq-backgrounds')) })
  await expect(page.locator('.tv-photo')).toHaveCount(0, { timeout: 3000 })
})

test('صورة جاهزة ثابتة: تبقى نفسها مع مرور الوقت، وتُختار من الإعدادات بجهاز التحكم', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T10:00:00+02:00') })
  await page.addInitScript((city) => localStorage.setItem('rafiq-tv:settings', JSON.stringify({ city, scene: 'gallery', galleryCat: 'nature', fixedPhoto: 'nature-03', rotateMin: 5 })), CITY)
  await page.goto('/tv.html')
  const top = page.locator('.tv-photo.on')
  await expect(top).toHaveAttribute('style', /tv-photos\/nature-03\.jpg/)
  await page.clock.runFor(30 * 60_000)
  await expect(top).toHaveAttribute('style', /tv-photos\/nature-03\.jpg/)
  await expect(page.locator('.tv-photo')).toHaveCount(1)
  // من الإعدادات: صورة ثابتة أخرى ثم التنقل
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await page.getByRole('button', { name: /المشاهد/ }).click()
  await expect(page.getByRole('radio', { name: /صورة ثابتة/ })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radiogroup', { name: 'الصورة الثابتة' }).getByRole('radio', { name: 'الصورة 7' }).click()
  await page.getByRole('button', { name: /حفظ وعرض الشاشة/ }).click()
  await expect(top).toHaveAttribute('style', /tv-photos\/nature-07\.jpg/)
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await page.getByRole('button', { name: /المشاهد/ }).click()
  await page.getByRole('radio', { name: /تنقل بين الصور/ }).click()
  await page.getByRole('button', { name: /حفظ وعرض الشاشة/ }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rafiq-tv:settings') || '{}'))
  expect(saved).toMatchObject({ scene: 'gallery', fixedPhoto: '' })
})

test('صورة من الجوال ثابتة: لا تتبدل حتى مع وصول صور أخرى', async ({ page }) => {
  await page.addInitScript((png) => {
    const w = window as unknown as { __ids: string[]; RafiqPhotos: object }
    w.__ids = ['a', 'b']
    w.RafiqPhotos = { getBackgrounds: () => JSON.stringify(w.__ids), getBackground: (id: string) => (w.__ids.includes(id) ? `data:image/png;base64,${png[id]}` : '') }
  }, PNG)
  await page.addInitScript((city) => localStorage.setItem('rafiq-tv:settings', JSON.stringify({ city, scene: 'photos', fixedPhoto: 'b' })), CITY)
  await page.goto('/tv.html')
  const top = page.locator('.tv-photo.on')
  const isB = new RegExp(PNG.b.slice(60, 90).replace(/[+/]/g, '\\$&'))
  await expect(top).toHaveAttribute('style', isB)
  await page.evaluate(() => { (window as unknown as { __ids: string[] }).__ids.push('c'); window.dispatchEvent(new Event('rafiq-backgrounds')) })
  await page.waitForTimeout(800)
  await expect(top).toHaveAttribute('style', isB)
})
