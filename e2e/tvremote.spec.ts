// التحكم بالتلفاز وتسجيلات الأذكار (واجهة الويب: التحكم يعمل في تطبيق Android فقط)
import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('التحكم بالتلفاز: مقفل دون اشتراك، ومع اشتراك يوضح أنه لتطبيق Android', async ({ page }) => {
  await page.goto('/tv-remote')
  await expect(page.locator('[data-plus-lock="tvremote"]')).toBeVisible()
  await page.goto('/plus')
  await page.getByRole('button', { name: /اشترك بـ/ }).click()
  await expect(page.getByRole('status')).toContainText('تم تفعيل')
  await page.goto('/tv-remote')
  await expect(page.getByText(/تعمل في تطبيق رفيق المسلم بلس على Android/)).toBeVisible()
})

test('تسجيلات الأذكار: إضافة تسجيل مرخص لذكر، وظهوره في القائمة، وحذفه', async ({ page }) => {
  await page.goto('/adhkar-audio')
  await page.getByLabel('البحث عن ذكر').fill('أستغفر الله')
  await page.locator('.list-card').first().click()
  await page.locator('input[type=file]').setInputFiles({ name: 'dhikr.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]) })
  await page.getByLabel('القارئ').fill('قارئ الاختبار')
  await page.getByLabel('المصدر (موقع أو جهة)').fill('تسجيل خاص')
  await page.getByLabel('الترخيص أو الإذن').fill('إذن كتابي')
  await page.getByRole('button', { name: 'حفظ' }).click()
  await expect(page.getByRole('status')).toContainText('أكّد')
  await page.getByLabel(/أؤكد أنني أملك حق استخدام/).check()
  await page.getByRole('button', { name: 'حفظ' }).click()
  await expect(page.getByRole('heading', { name: 'التسجيلات المضافة (1)' })).toBeVisible()
  await expect(page.getByText(/بصوت قارئ الاختبار — تسجيل خاص — إذن كتابي/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'التسجيلات المضافة (1)' })).toBeVisible()
  await page.getByRole('button', { name: 'حذف' }).click()
  await expect(page.getByRole('heading', { name: 'التسجيلات المضافة (0)' })).toBeVisible()
})
