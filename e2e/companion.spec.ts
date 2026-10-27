// «رفيقي يذكّرني» و«رفيقي اليومي» (رفيق بلس) بمتجر الاختبار، وإخفاء أقسام الأذكار (مجاني).
import { test, expect, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

async function subscribe(page: Page) {
  await page.goto('/plus')
  await page.getByRole('button', { name: /اشترك بـ/ }).click()
  await expect(page.getByRole('status')).toContainText('تم تفعيل')
}

test.describe('رفيقي يذكّرني', () => {
  test('دون اشتراك: الصفحة مقفلة، والرئيسية بلا بطاقة ولا قفل', async ({ page }) => {
    await page.goto('/companion')
    await expect(page.locator('[data-plus-lock="companion"]')).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'آية اليوم' }).first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'رفيقي اليومي' })).toHaveCount(0)
    expect(await page.locator('[data-plus-lock]').count()).toBe(0)
  })

  test('مع اشتراك: الإعدادات تُحفظ بعد إعادة الفتح، والإيقاف المؤقت والاستئناف', async ({ page }) => {
    await subscribe(page)
    await page.goto('/companion')
    await page.getByRole('switch', { name: 'تفعيل تذكير الأذكار الدوري' }).check()
    await page.getByRole('radio', { name: '30 دقيقة' }).or(page.getByRole('radio', { name: '٣٠ دقيقة' })).click()
    await page.getByRole('button', { name: 'الجمعة' }).first().click()
    await page.getByRole('switch', { name: 'تفعيل موعدي مع القرآن' }).check()
    await page.getByRole('button', { name: '+ موعد آخر' }).click()
    await page.getByRole('switch', { name: 'تفعيل تذكير قرب خروج وقت الصلاة' }).check()
    await page.reload()
    await expect(page.getByRole('switch', { name: 'تفعيل تذكير الأذكار الدوري' })).toBeChecked()
    await expect(page.getByRole('radio', { name: /٣٠ دقيقة|30 دقيقة/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('group', { name: 'أيام تذكير الأذكار' }).getByRole('button', { name: 'الجمعة' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('textbox', { name: 'الموعد 2' })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'تفعيل تذكير قرب خروج وقت الصلاة' })).toBeChecked()
    await expect(page.getByText(/نصف الليل الأوسط/)).toBeVisible()

    await page.getByRole('button', { name: 'ساعة', exact: true }).click()
    await expect(page.getByText(/متوقف حتى/)).toBeVisible()
    await page.getByRole('button', { name: /استئناف/ }).click()
    await expect(page.getByText(/متوقف حتى/)).toHaveCount(0)
  })

  test('صفحة الذكر من الإشعار: النص والمصدر، و«قرأت الذكر» يُسجَّل', async ({ page }) => {
    await subscribe(page)
    await page.goto('/companion/dhikr/s-istighfar')
    await expect(page.getByText('أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ').first()).toBeVisible()
    await page.getByRole('button', { name: 'قرأت الذكر' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/companion/dhikr/s-istighfar')
    await expect(page.getByRole('button', { name: 'قرأته اليوم' })).toBeDisabled()
  })

  test('القراءة الفعلية: تُسجَّل بعد البقاء على الصفحة، وتظهر في «رفيقي اليومي»', async ({ page }) => {
    await page.clock.install()
    await subscribe(page)
    await page.goto('/mushaf/50')
    await expect(page.getByRole('heading', { name: 'سورة آل عمران' })).toBeVisible()
    await page.clock.fastForward('00:05')
    await page.goto('/companion')
    await expect(page.getByText(/آخر قراءة فعلية:.*لم تُسجَّل بعد/)).toBeVisible()
    await page.goto('/mushaf/50')
    await expect(page.getByRole('heading', { name: 'سورة آل عمران' })).toBeVisible()
    await page.clock.fastForward('00:25')
    await page.goto('/companion')
    await expect(page.getByText(/آخر قراءة فعلية:.*صفحة 50/)).toBeVisible()
    await page.goto('/')
    const card = page.getByRole('region', { name: 'رفيقي اليومي' })
    await expect(card).toBeVisible()
    await expect(card.getByText(/صفحة 50/)).toBeVisible()
    await expect(card.getByRole('link', { name: 'تابِع القراءة' })).toHaveAttribute('href', /\/mushaf\/50/)
  })
})

test('إخفاء أقسام الأذكار وإظهارها (مجاني) يبقى بعد إعادة الفتح', async ({ page }) => {
  await page.goto('/adhkar')
  await expect(page.getByRole('link', { name: /أذكار السفر/ })).toBeVisible()
  await page.getByRole('button', { name: 'إخفاء أقسام' }).click()
  await page.getByLabel('إظهار أذكار السفر').uncheck()
  await page.getByRole('button', { name: 'تم' }).click()
  await expect(page.getByRole('link', { name: /أذكار السفر/ })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('link', { name: /أذكار السفر/ })).toHaveCount(0)
  await page.getByRole('button', { name: /إدارة الأقسام/ }).click()
  await page.getByLabel('إظهار أذكار السفر').check()
  await page.getByRole('button', { name: 'تم' }).click()
  await expect(page.getByRole('link', { name: /أذكار السفر/ })).toBeVisible()
  expect(await page.locator('[data-plus-lock]').count()).toBe(0)
})
