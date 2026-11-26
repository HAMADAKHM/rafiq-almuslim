// التصميم الذهبي المعتمد: الرئيسية كما في التصميم المرسل، ورأس الصفحات بالصور، وصور الأذكار، وزر الرئيسية في وسط الشريط
import { test, expect } from '@playwright/test'

test('اختيار التصميم الذهبي: الرئيسية بأقسامها وبطاقاتها، ورأس الصفحات، وصور الأذكار', async ({ page }) => {
  await page.goto('/plus/themes')
  await page.locator('[data-skin-id="e-golden"]').click()
  await page.getByRole('button', { name: 'تطبيق' }).click()
  await page.goto('/')
  await expect(page.locator('.app.golden.night')).toHaveCount(1)
  // تصميم «الليلي الذهبي» نفسه بألوان الذهبي الإسلامي
  await expect(page.locator('.nh-home')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'الأقسام' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'آية اليوم' })).toBeVisible()
  await page.goto('/adhkar')
  await expect(page.locator('.gd-page-hero')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.app.golden')).toHaveCount(1)
})
