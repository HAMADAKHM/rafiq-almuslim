import { expect, test } from '@playwright/test'

test('استوديو الأصوات: الفئات والمعاينة بالمشغل المصغر وأصوات السبحة والتخصيص', async ({ page }) => {
  await page.goto('/audio-studio')
  await expect(page.getByRole('tab', { name: /نغمات التنبيه/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('نغمة رفيق المسلم').first()).toBeVisible()
  await page.getByRole('tab', { name: /أصوات الطبيعة/ }).click()
  await page.getByRole('button', { name: 'معاينة مطر هادئ' }).click()
  await expect(page.getByRole('region', { name: 'مشغل الاستوديو' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'مشغل الاستوديو' })).toContainText('مطر هادئ')
  await page.getByRole('tab', { name: /أصوات السبحة/ }).click()
  await expect(page.getByText('تمام الثلاث والثلاثين').first()).toBeVisible()
  await page.getByRole('tab', { name: /تلاوات الأذكار/ }).click()
  await expect(page.getByRole('button', { name: /أذكار الصباح كاملة/ })).toBeVisible()
  await page.getByRole('tab', { name: /التذكير البشري/ }).click()
  await expect(page.getByText('بانتظار تسجيل بشري مرخّص').first()).toBeVisible()
  await page.getByLabel('مستوى الصوت').fill('40')
  await expect(page.getByText('مستوى الصوت: 40٪')).toBeVisible()
})

test('الأذكار كاملة بأصوات القرّاء: من صفحة أذكار المساء إلى الاستوديو', async ({ page }) => {
  await page.goto('/adhkar/evening')
  await page.getByRole('link', { name: /استمع إلى أذكار المساء كاملة/ }).click()
  await expect(page).toHaveURL(/\/audio-studio#dhikr-evening$/)
  await expect(page.getByRole('tab', { name: 'أذكار المساء' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'استمع أذكار المساء — مشاري العفاسي' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'تنزيل أذكار المساء — فارس عباد' })).toBeVisible()
  await expect(page.getByText('بصوت محمد جبريل').first()).toBeVisible()
})
