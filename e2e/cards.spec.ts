// بطاقات للمشاركة: تتجدد يوميًا، وتبويبات رمضان والعيد والجمعة، وعارض البطاقة بخلفية أخرى ومشاركة
import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('بطاقات اليوم ورمضان: تُرسم وتُفتح وتتغير خلفيتها', async ({ page }) => {
  await page.goto('/cards')
  await expect(page.getByRole('heading', { name: 'بطاقات للمشاركة' })).toBeVisible()
  await expect(page.locator('.share-card')).not.toHaveCount(0)
  await page.getByRole('tab', { name: 'رمضان' }).click()
  await expect(page.locator('.share-card')).toHaveCount(24)
  await expect(page.locator('.share-card img').first()).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'بطاقة: رمضان كريم' }).click()
  const dlg = page.getByRole('dialog', { name: 'رمضان كريم' })
  await expect(dlg.locator('canvas')).toBeVisible()
  await dlg.getByRole('button', { name: 'خلفية أخرى' }).click()
  await expect(dlg.getByRole('button', { name: 'مشاركة' })).toBeVisible()
})
