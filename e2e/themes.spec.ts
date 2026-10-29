// الثيمات والمظهر: المعاينة تطبّق الثيم مؤقتًا على التطبيق كله دون تغيير الاختيار، والتطبيق يبقى بعد إعادة الفتح،
// وثيمات بلس تُعاين دون اشتراك ولا تُفعَّل إلا معه، وتعود ألوان التطبيق عند الرجوع إلى الأصلي.
import { test, expect, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

const bar = (page: Page) => page.getByRole('region', { name: /معاينة ثيم/ })
/** تنقل داخل التطبيق دون إعادة تحميل (المعاينة في الذاكرة كما يتنقل المستخدم بالروابط) */
const nav = (page: Page, to: string) => page.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, to)
async function subscribe(page: Page) {
  await page.goto('/plus')
  await page.getByRole('button', { name: /اشترك بـ/ }).click()
  await expect(page.getByRole('status')).toContainText('تم تفعيل')
}

test('ثيم الهوية المجاني: معاينة في كل الصفحات، ثم تطبيق يبقى بعد إعادة الفتح، ثم العودة إلى الأصلي', async ({ page }) => {
  await page.goto('/plus/themes')
  await expect(page.getByRole('heading', { name: 'الثيمات والمظهر' })).toBeVisible()
  await page.getByRole('button', { name: 'معاينة ثيم الإسلامي الكلاسيكي' }).click()
  await expect(bar(page)).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-skin', 't-classic')
  // المعاينة تشمل الصفحات الداخلية، والاختيار المحفوظ لم يتغير
  await nav(page, '/adhkar/morning')
  await expect(page.getByRole('heading', { name: /أذكار الصباح/ }).first()).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-skin', 't-classic')
  await bar(page).getByRole('button', { name: 'تطبيق' }).click()
  await expect(bar(page)).toHaveCount(0)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-skin', 't-classic')
  await expect(page.locator('.skin-backdrop .identity-scene')).toHaveCount(1)
  await page.goto('/plus/themes')
  await page.getByRole('button', { name: /الأصلي/ }).first().click()
  await expect(page.locator('html')).not.toHaveAttribute('data-skin', /.+/)
})

test('ثيم بلس دون اشتراك: معاينة فقط، وإنهاؤها يعيد الشكل دون حفظ', async ({ page }) => {
  await page.goto('/plus/themes')
  await page.getByRole('button', { name: 'معاينة ثيم الملكي' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-skin', 't-royal')
  await expect(bar(page).getByRole('link', { name: /اشترك لتفعيله/ })).toBeVisible()
  await expect(bar(page).getByRole('button', { name: 'تطبيق' })).toHaveCount(0)
  await bar(page).getByRole('button', { name: 'إنهاء المعاينة' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-skin', /.+/)
  await page.reload()
  await expect(page.locator('html')).not.toHaveAttribute('data-skin', /.+/)
})

test('مع اشتراك: الثمانية تُطبَّق ويتغير شكل الصفحات الداخلية، والخلفية الثابتة توقف الحركة', async ({ page }) => {
  await subscribe(page)
  await page.goto('/plus/themes')
  for (const [name, id] of [['الملكي', 't-royal'], ['الليلي', 't-night'], ['الفيروزي', 't-turquoise'], ['الفجر', 't-dawn'], ['الطبيعي', 't-nature'], ['البنفسجي', 't-violet'], ['الوردي', 't-rose'], ['المساء', 't-evening']]) {
    await page.getByRole('button', { name: `معاينة ثيم ${name}`, exact: true }).click()
    await bar(page).getByRole('button', { name: 'تطبيق' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-skin', id)
  }
  // لون خلفية البطاقات من الثيم في صفحة داخلية
  await page.goto('/prayer')
  const bg = await page.locator('.card').first().evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).toMatch(/rgba?\(16, 30, 52/)
  await page.goto('/plus/themes')
  await page.getByLabel(/خلفية ثابتة بلا حركة/).check()
  await expect(page.locator('html')).toHaveAttribute('data-skin-still', '')
})

test('ثيم حيّ مجاني: مشهد يتحرك خلف التطبيق ويبقى بعد إعادة الفتح، وزر الثيمات في الرئيسية', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'الثيمات' }).first().click()
  await expect(page).toHaveURL(/\/plus\/themes/)
  await page.getByRole('button', { name: 'معاينة ثيم ليلة المسجد الحيّة' }).click()
  await bar(page).getByRole('button', { name: 'تطبيق' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-skin-id', 'live-night')
  await page.goto('/')
  await expect(page.locator('.skin-backdrop.live canvas').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-skin-id', 'live-night')
})

test('أيقونة التطبيق والودجتات: البديلة مقفلة دون اشتراك، والقوائم المجمّعة تفتح أقسامها', async ({ page }) => {
  await page.goto('/plus/themes')
  const icons = page.getByRole('radiogroup', { name: 'أيقونة التطبيق' })
  await expect(icons.getByRole('radio')).toHaveCount(9)
  await expect(icons.getByRole('radio', { name: 'أيقونة الأصلية' })).toHaveAttribute('aria-checked', 'true')
  await page.goto('/widgets')
  await expect(page.locator('.wd-item')).toHaveCount(7)
  await page.getByRole('radio', { name: /الملكي/ }).click()
  await expect(page.getByRole('radio', { name: /الزمردي/ })).toHaveAttribute('aria-checked', 'true')
  await page.goto('/more')
  await page.getByLabel('ابحث عن قسم').fill('الودجتات')
  await page.locator('.more-row').first().click()
  await expect(page).toHaveURL(/\/widgets$/)
})
