// التصميم المعتمد: الشريط السفلي الخماسي، وترتيب «المزيد»، ومكتبة المسلم، والمفضلة الموحدة، وبطاقات الرئيسية
import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } })

test('الشريط السفلي خمسة عناصر بالترتيب، و«المزيد» يبدأ بالأقسام الأساسية', async ({ page }) => {
  await page.goto('/')
  const tabs = page.locator('.tabbar .tab-item')
  await expect(tabs).toHaveText([/الرئيسية/, /القرآن/, /الصلاة/, /الأذكار/, /المزيد/])
  // الشكل السابق هو الافتراضي، وتصميم الرئيسية الجديد مع التصاميم التسعة فقط
  await expect(page.locator('.home-hero')).toBeVisible()
  await expect(page.locator('.dh-prayer')).toHaveCount(0)
  await page.goto('/plus/themes')
  await page.getByRole('button', { name: 'معاينة ثيم الكلاسيكي الراقي' }).click()
  await page.getByRole('region', { name: /معاينة ثيم/ }).getByRole('button', { name: 'تطبيق' }).click()
  await page.evaluate(() => { history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.getByRole('heading', { name: /السلام عليكم/ })).toBeVisible()
  await expect(page.locator('.dh-prayer')).toBeVisible()
  await expect(page.getByRole('link', { name: /ابدأ القراءة من الفاتحة/ })).toBeVisible()
  await page.goto('/more')
  const first = page.locator('.more-list').first().locator('.mr-title')
  await expect(first).toHaveText(['القبلة', 'مكتبة المسلم', 'التسبيح الإلكتروني', 'التقويم الهجري', 'خطط ختم القرآن', 'المفضلة والإشارات المرجعية', 'التنزيلات والمحتوى دون إنترنت', 'إنجازاتي وإحصائياتي', 'الإشعارات', 'إعدادات التطبيق', 'حول التطبيق ومصادر المحتوى'])
})

test('مكتبة المسلم: أقسام موثقة تفتح، والأقسام غير الجاهزة واضحة دون رابط', async ({ page }) => {
  await page.goto('/library')
  await expect(page.getByRole('heading', { name: 'مكتبة المسلم' })).toBeVisible()
  await expect(page.locator('.more-row.soon')).toHaveCount(3)
  await expect(page.locator('.more-row.soon a')).toHaveCount(0)
  await page.getByLabel('ابحث في المكتبة').fill('الأحاديث')
  await page.locator('.more-row').first().click()
  await expect(page).toHaveURL(/\/hadith$/)
})

test('المفضلة الموحدة: فارغة أولًا، ثم تظهر فيها علامة القرآن', async ({ page }) => {
  await page.goto('/favorites')
  await expect(page.getByText('لم تحفظ شيئًا بعد.')).toBeVisible()
  await page.goto('/quran/112?flow=1')
  await page.locator('#ayah-1').click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('اسم العلامة').fill('التوحيد')
  await sheet.getByRole('button', { name: 'إضافة علامة' }).click()
  await page.goto('/favorites')
  await expect(page.getByRole('region', { name: 'علامات القرآن' })).toContainText('التوحيد')
})
