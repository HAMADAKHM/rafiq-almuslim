// التصميم الذهبي المعتمد: الرئيسية كما في التصميم المرسل، ورأس الصفحات بالصور، وصور الأذكار، وزر الرئيسية في وسط الشريط
import { test, expect } from '@playwright/test'

test('اختيار التصميم الذهبي: الرئيسية بأقسامها وبطاقاتها، ورأس الصفحات، وصور الأذكار', async ({ page }) => {
  await page.goto('/plus/themes')
  await page.locator('[data-skin-id="e-golden"]').click()
  await page.getByRole('button', { name: 'تطبيق' }).click()
  await page.goto('/')
  await expect(page.locator('.app.golden')).toHaveCount(1)
  const arches = page.getByRole('navigation', { name: 'الأقسام' })
  for (const n of ['القرآن الكريم', 'الأذكار', 'الصلاة', 'القبلة', 'المزيد']) await expect(arches.getByRole('link', { name: n })).toBeVisible()
  for (const n of ['آخر قراءة', 'أوقات الصلاة القادمة', 'المسبحة الإلكترونية', 'رفيق المسلم بلس']) await expect(page.getByText(n).first()).toBeVisible()
  await expect(page.locator('.gd-verse')).toHaveAttribute('aria-label', 'سورة الرعد، الآية 28')
  expect((await page.locator('.gd-verse-text').innerText()).length).toBeGreaterThan(10)
  await page.goto('/adhkar')
  await expect(page.locator('.gd-page-hero')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.app.golden')).toHaveCount(1)
})
