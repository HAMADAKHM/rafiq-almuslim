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

test.describe('مزايا بلس الإضافية', () => {
  test('دون اشتراك: الألوان والتذكيرات الخاصة والإحصاءات مقفلة', async ({ page }) => {
    for (const [route, f] of [['/plus/themes', 'themes'], ['/plus/reminders', 'reminders'], ['/plus/insights', 'insights']] as const) {
      await page.goto(route)
      await expect(page.locator(`[data-plus-lock="${f}"]`)).toBeVisible()
    }
  })

  test('مع اشتراك: لوحة الألوان تُطبَّق وتزول عند الانتهاء، وتذكير خاص يُحفظ، والإحصاءات تظهر', async ({ page }) => {
    await page.clock.install()
    await page.goto('/plus')
    await page.getByRole('button', { name: /اشترك بـ/ }).click()
    await expect(page.getByRole('status')).toContainText('تم تفعيل')

    await page.goto('/plus/themes')
    await page.getByRole('radio', { name: 'الياقوت الأزرق' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'sapphire')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'sapphire')

    await page.goto('/plus/reminders')
    await page.getByRole('button', { name: 'إضافة تذكير' }).click()
    await page.getByLabel('النص').fill('قراءة سورة الكهف')
    await page.getByRole('button', { name: 'الأحد' }).click()
    await page.reload()
    await expect(page.getByLabel('النص')).toHaveValue('قراءة سورة الكهف')
    await expect(page.getByRole('button', { name: 'الأحد' })).toHaveAttribute('aria-pressed', 'false')

    await page.goto('/plus/insights')
    await expect(page.getByText('أيام متتالية الآن')).toBeVisible()
    await expect(page.getByLabel('خريطة النشاط').locator('i')).toHaveCount(84)

    // انتهاء الاشتراك: تعود ألوان التطبيق الأصلية، وتبقى الإعدادات محفوظة لمن يعود
    await page.goto('/plus')
    await page.getByRole('button', { name: /إلغاء التجديد/ }).click()
    await expect(page.getByText(/أُلغي التجديد، وينتهي في/)).toBeVisible()
    await page.clock.fastForward('06:00')
    await expect(page.getByRole('heading', { name: 'غير مشترك' })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('html')).not.toHaveAttribute('data-palette', /.+/)
    await page.goto('/plus/reminders')
    await expect(page.locator('[data-plus-lock="reminders"]')).toBeVisible()
  })
})

test.describe('الطقس (رفيق بلس)', () => {
  const met = {
    properties: { timeseries: Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - 1800_000 + i * 3_600_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      data: { instant: { details: { air_temperature: 18 + (i % 6), wind_speed: 4, relative_humidity: 60 } }, next_1_hours: { summary: { symbol_code: 'clearsky_day' } } },
    })) },
  }
  test('مقفل دون اشتراك، ومع الاشتراك يظهر طقس المدينة وفي الرئيسية', async ({ page }) => {
    await page.route(/api\.met\.no\/weatherapi\/locationforecast/, (r) => r.fulfill({ status: 200, body: JSON.stringify(met), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }))
    await page.goto('/weather')
    await expect(page.locator('[data-plus-lock="weather"]')).toBeVisible()
    await page.goto('/prayer')
    await page.getByLabel('اسم المدينة').fill('نابلس')
    await page.getByRole('button', { name: /نابلس/ }).first().click()
    await expect(page.getByText(/تم حفظ الموقع/)).toBeVisible()
    await page.goto('/')
    await expect(page.locator('.weather-chip')).toHaveCount(0)
    await page.goto('/plus')
    await page.getByRole('button', { name: /اشترك بـ/ }).click()
    await expect(page.getByRole('status')).toContainText('تم تفعيل')
    await page.goto('/weather')
    await expect(page.getByText('صافٍ').first()).toBeVisible()
    await expect(page.getByText(/MET Norway/)).toBeVisible()
    await page.goto('/')
    await expect(page.locator('.weather-chip')).toContainText('صافٍ')
  })
})
