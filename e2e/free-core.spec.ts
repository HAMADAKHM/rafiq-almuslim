// اختبارات حماية «رفيق بلس»: الميزات الدينية الأساسية مجانية دائمًا، ولا إعلانات في صفحات العبادة.
// قاعدة ملزمة لكل كود الربح القادم:
// - أي إعلان يُعرض داخل عنصر يحمل data-ad-slot
// - أي قفل أو دعوة للاشتراك على ميزة تحمل data-plus-lock
// هذه الاختبارات تفشل إن ظهر أي منهما حيث لا يجوز، وتعمل الآن (قبل إضافة الربح) لتثبيت الحالة الحالية.
import { test, expect, type Page } from '@playwright/test'

const AD = '[data-ad-slot]'
const LOCK = '[data-plus-lock]'

/** كل الميزات الموجودة في النسخة المجانية: لا تُقفل خلف الاشتراك أبدًا */
const FREE_ROUTES = [
  '/', '/quran', '/quran/1?flow=1', '/quran/2/info', '/mushaf/1', '/adhkar', '/adhkar/morning', '/adhkar/evening', '/duas', '/duas/parents',
  '/hadith', '/listen', '/prayer', '/qibla', '/tasbih', '/wird', '/memorize', '/my-adhkar', '/adhkar-alert/morning', '/learn', '/reminders',
  '/calendar', '/progress', '/journey', '/search', '/settings', '/about', '/more', '/studio', '/mosques', '/assistant', '/for-the-deceased',
  '/adhkar-audio', '/date-tools', '/kids-adhkar', '/plus/features', '/terms',
]

/** الصفحات الوحيدة التي يُسمح فيها بإعلان (شريطي) لغير المشتركين — بموافقة صاحب التطبيق */
const AD_ALLOWED = new Set(['/more', '/mosques', '/calendar', '/settings'])

async function expectNone(page: Page, selector: string, route: string) {
  await expect(page.locator('main, #root').first()).toBeVisible()
  await page.waitForTimeout(300)
  expect(await page.locator(selector).count(), `${selector} في ${route}`).toBe(0)
}

test.describe('حماية النسخة المجانية: لا قفل على أي ميزة موجودة', () => {
  for (const route of FREE_ROUTES) {
    test(`مفتوحة دون اشتراك: ${route}`, async ({ page }) => {
      await page.goto(route)
      await expectNone(page, LOCK, route)
    })
  }
})

test.describe('حماية صفحات العبادة: لا إعلانات', () => {
  for (const route of FREE_ROUTES.filter((r) => !AD_ALLOWED.has(r.split('?')[0]))) {
    test(`بلا إعلانات: ${route}`, async ({ page }) => {
      await page.goto(route)
      await expectNone(page, AD, route)
    })
  }
})

test.describe('الوظائف الدينية الأساسية تعمل دون اشتراك', () => {
  test('القرآن: عرض الآيات والتنقل بين السور', async ({ page }) => {
    await page.goto('/quran')
    await expect(page.locator('.surah-item')).toHaveCount(114)
    await page.goto('/mushaf/604')
    await expect(page.getByRole('button', { name: 'سورة الإخلاص الآية 1' })).toBeVisible()
  })

  test('الأذكار والأدعية: النصوص والعداد', async ({ page }) => {
    await page.goto('/adhkar/morning')
    await page.getByRole('tab', { name: 'قائمة' }).click()
    await expect(page.getByRole('button', { name: /عدّاد: 0 من 3/ }).first()).toBeVisible()
    await page.goto('/duas/parents')
    await expect(page.locator('article').first()).toBeVisible()
  })

  test('الاستماع: زر التشغيل متاح', async ({ page }) => {
    await page.goto('/listen')
    await expect(page.getByRole('button', { name: /تشغيل/ }).first()).toBeVisible()
  })

  test('المواقيت: تُحسب بعد اختيار المدينة', async ({ page }) => {
    await page.goto('/prayer')
    await page.getByLabel('اسم المدينة').fill('نابلس')
    await page.getByRole('button', { name: /نابلس/ }).first().click()
    await expect(page.getByText(/تم حفظ الموقع/)).toBeVisible()
    await expect(page.getByText('الفجر').first()).toBeVisible()
  })

  test('الواجهة العربية RTL', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  })
})
