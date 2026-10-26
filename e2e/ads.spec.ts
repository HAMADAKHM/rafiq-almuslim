// الإعلانات المحدودة (معاينة الموضع في المتصفح): في الصفحات الأربع المسموحة لغير المشترك فقط، وتختفي للمشترك.
import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block' })
const ALLOWED = ['/more', '/mosques', '/calendar', '/settings']

test('غير المشترك: إعلان شريطي واحد في كل صفحة مسموحة فقط', async ({ page }) => {
  for (const r of ALLOWED) {
    await page.goto(r)
    await expect(page.locator('[data-ad-slot]')).toHaveCount(1)
  }
  for (const r of ['/quran', '/adhkar/morning', '/listen', '/plus', '/stories']) {
    await page.goto(r)
    await page.waitForTimeout(300)
    expect(await page.locator('[data-ad-slot]').count(), r).toBe(0)
  }
})

test('المشترك الفعّال: لا إعلانات في أي صفحة', async ({ page }) => {
  await page.goto('/plus')
  await page.getByRole('button', { name: /اشترك بـ/ }).click()
  await expect(page.getByRole('status')).toContainText('تم تفعيل')
  for (const r of ALLOWED) {
    await page.goto(r)
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.waitForTimeout(400)
    expect(await page.locator('[data-ad-slot]').count(), r).toBe(0)
  }
})
