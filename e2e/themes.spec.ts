// الثيمات الغامرة: معاينة بملء الشاشة، وتطبيق يبقى بعد إعادة الفتح، والمدفوعة مقفلة دون اشتراك.
import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('ثيم مجاني يُعاين ويُطبَّق دون اشتراك ويبقى بعد إعادة الفتح، ثم يُلغى', async ({ page }) => {
  await page.goto('/plus/themes')
  await page.getByRole('button', { name: 'معاينة ثيم ليلة القدر' }).click()
  const dlg = page.getByRole('dialog', { name: 'معاينة ثيم ليلة القدر' })
  await expect(dlg).toBeVisible()
  await expect(dlg.locator('.scene-qadr')).toBeVisible()
  await dlg.getByRole('button', { name: 'تطبيق الثيم' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'qadr')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.skin-backdrop .scene-qadr')).toHaveCount(1)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'qadr')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'qadr')
  await page.goto('/plus/themes')
  await page.getByRole('button', { name: 'العودة إلى ألوان التطبيق الأصلية' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-skin', /.+/)
  await expect(page.locator('.skin-backdrop')).toHaveCount(0)
})

test('ثيم مدفوع دون اشتراك: معاينة فقط بلا تطبيق', async ({ page }) => {
  await page.goto('/plus/themes')
  await page.getByRole('button', { name: 'معاينة ثيم الذهب الملكي' }).click()
  const dlg = page.getByRole('dialog', { name: 'معاينة ثيم الذهب الملكي' })
  await expect(dlg.getByRole('link', { name: /من مزايا رفيق بلس/ })).toBeVisible()
  await expect(dlg.getByRole('button', { name: 'تطبيق الثيم' })).toHaveCount(0)
})

test('مع اشتراك: الثيم المدفوع يُطبَّق، والمشهد الثابت يوقف الحركة', async ({ page }) => {
  await page.goto('/plus')
  await page.getByRole('button', { name: /اشترك بـ/ }).click()
  await expect(page.getByRole('status')).toContainText('تم تفعيل')
  await page.goto('/plus/themes')
  await page.getByRole('button', { name: 'معاينة ثيم الذهب الملكي' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'تطبيق الثيم' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'royal')
  await page.getByLabel(/مشهد ثابت بلا حركة/).check()
  await expect(page.locator('html')).toHaveAttribute('data-skin-still', '')
})

test('ثيم حيّ مجاني: مشهد يتحرك خلف التطبيق ويبقى بعد إعادة الفتح، وزر الثيمات في الرئيسية', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'الثيمات' }).first().click()
  await expect(page).toHaveURL(/\/plus\/themes/)
  await page.getByRole('button', { name: 'معاينة ثيم ليلة المسجد الحيّة' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'تطبيق الثيم' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-skin-id', 'live-night')
  await page.goto('/')
  await expect(page.locator('.skin-backdrop.live canvas').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-skin-id', 'live-night')
})
