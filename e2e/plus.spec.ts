// رفيق بلس بمتجر الاختبار (بلا أي دفع): الصفحة والسعر والشراء والاستعادة والإلغاء والانتهاء،
// والتفسير كالقصة مقفل دون اشتراك ومفتوح معه.
import { test, expect, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

/** تفسير تجريبي محلي بدل الخادم: نص معروف لكل آية من سورة الصافات */
async function mockTafsir(page: Page) {
  await page.route(/tafsir_api.*\/ar-tafsir-muyassar\/37\.json/, (route) => {
    const body = Array.from({ length: 182 }, (_, i) => ({ surah: 37, ayah: i + 1, text: i + 1 >= 139 && i + 1 <= 140 ? 'تفسير تجريبي لأول القصة' : `تفسير تجريبي للآية ${i + 1}` }))
    return route.fulfill({ status: 200, body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
  })
}

test.describe('رفيق بلس (متجر الاختبار)', () => {
  test('صفحة العضوية: السعر من المتجر، والتجديد، والاستعادة، والإغلاق، ولا إعلانات', async ({ page }) => {
    await page.goto('/plus')
    await expect(page.getByRole('heading', { name: 'رفيق بلس' })).toBeVisible()
    await expect(page.getByText(/وضع تجريبي: لا يوجد أي دفع حقيقي/)).toBeVisible()
    await expect(page.getByText('9.99 ₪').first()).toBeVisible()
    await expect(page.getByText(/يتجدد تلقائيًا حتى تلغيه/)).toBeVisible()
    await expect(page.getByRole('button', { name: /استعادة المشتريات/ })).toBeVisible()
    await expect(page.getByText(/ليس تبرعًا، ولا علاقة له بأجر الصدقة الجارية/)).toBeVisible()
    expect(await page.locator('[data-ad-slot]').count()).toBe(0)
    await page.getByRole('button', { name: /استعادة المشتريات/ }).click()
    await expect(page.getByRole('status')).toContainText('لا يوجد اشتراك ساري')
    await page.getByRole('button', { name: 'متابعة استخدام التطبيق مجانًا' }).click()
    await expect(page).not.toHaveURL(/\/plus$/)
  })

  test('دون اشتراك: التفسير كالقصة مقفل، والقرآن والأذكار مفتوحة', async ({ page }) => {
    await page.goto('/stories')
    await expect(page.locator('[data-plus-lock="stories"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /يونس عليه السلام/ })).toHaveCount(0)
    await page.goto('/stories/yunus')
    await expect(page.locator('[data-plus-lock="stories"]')).toBeVisible()
    await page.goto('/adhkar/morning')
    expect(await page.locator('[data-plus-lock]').count()).toBe(0)
  })

  test('فشل الدفع لا يفعّل، ثم الشراء يفتح القصة، ثم الإلغاء والانتهاء يقفلانها', async ({ page }) => {
    await page.clock.install()
    await mockTafsir(page)
    await page.goto('/plus')
    await page.getByRole('button', { name: /محاكاة رفض الدفع/ }).click()
    await page.getByRole('button', { name: /اشترك بـ/ }).click()
    await expect(page.getByRole('status')).toContainText('لم تكتمل عملية الدفع')
    await expect(page.getByRole('heading', { name: 'غير مشترك' })).toBeVisible()
    await page.getByRole('button', { name: /محاكاة رفض الدفع/ }).click()

    await page.getByRole('button', { name: /اشترك بـ/ }).click()
    await expect(page.getByRole('status')).toContainText('تم تفعيل رفيق بلس')
    await expect(page.getByRole('heading', { name: 'اشتراكك في رفيق بلس فعّال' })).toBeVisible()
    await expect(page.getByText(/يتجدد تلقائيًا في/)).toBeVisible()

    await page.goto('/stories')
    expect(await page.locator('[data-plus-lock]').count()).toBe(0)
    await page.getByRole('link', { name: /يونس عليه السلام/ }).click()
    await expect(page.getByText('تفسير تجريبي لأول القصة')).toBeVisible()
    await expect(page.getByText(/المشهد ١ من/)).toBeVisible()
    await page.getByRole('button', { name: 'المشهد التالي' }).click()
    await expect(page.getByText('تفسير تجريبي للآية 141')).toBeVisible()
    await expect(page.getByRole('button', { name: /استمع كالقصة/ })).toBeVisible()

    // الإلغاء من «المتجر»: يبقى فعّالًا حتى نهاية الفترة ثم يُقفل
    await page.goto('/plus')
    await page.getByRole('button', { name: /إلغاء التجديد/ }).click()
    await expect(page.getByText(/أُلغي التجديد، وينتهي في/)).toBeVisible()
    await page.clock.fastForward('06:00')
    await expect(page.getByRole('heading', { name: 'غير مشترك' })).toBeVisible({ timeout: 15_000 })
    await page.goto('/stories')
    await expect(page.locator('[data-plus-lock="stories"]')).toBeVisible()
  })

  test('الاستعادة بعد حذف بيانات التطبيق المحلية تعيد الاشتراك الساري', async ({ page }) => {
    await page.goto('/plus')
    await page.getByRole('button', { name: /اشترك بـ/ }).click()
    await expect(page.getByRole('status')).toContainText('تم تفعيل')
    // حذف حالة الاشتراك المحفوظة محليًا فقط (سجل المتجر باقٍ كما في المتجر الحقيقي)
    await page.evaluate(() => new Promise((res) => {
      const r = indexedDB.open('islamic-companion')
      r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('billing:entitlement'); tx.oncomplete = () => { r.result.close(); res(null) } }
    }))
    await page.reload()
    await page.getByRole('button', { name: /استعادة المشتريات/ }).click()
    await expect(page.getByRole('status')).toContainText('تمت استعادة اشتراكك')
  })

  test('انقطاع الإنترنت عند الشراء: رسالة واضحة، ولا يتعطل التطبيق', async ({ page }) => {
    await page.goto('/plus')
    await page.getByRole('button', { name: /محاكاة انقطاع الإنترنت/ }).click()
    await page.getByRole('button', { name: /اشترك بـ/ }).click()
    await expect(page.getByRole('status')).toContainText('تعذر الاتصال بالمتجر')
    await page.goto('/quran')
    await expect(page.locator('.surah-item')).toHaveCount(114)
  })
})
