// مكتبة الأحاديث: الكتب السبعة، وتفاصيل الحديث بأحكامه المنسوبة، والبيانات غير المتوفرة تظهر صراحة.
// تُخدَّم ملفات القاعدة من مقتطفات حقيقية محفوظة في المستودع (src/test/fixtures/hadith-sample.json).
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const SAMPLE = JSON.parse(readFileSync('src/test/fixtures/hadith-sample.json', 'utf8')) as Record<string, unknown[]>

test.beforeEach(async ({ page }) => {
  await page.route(/hadith-api.*\/editions\/ara-([a-z]+)\/sections\/(\d+)\.min\.json/, (route) => {
    const m = /ara-([a-z]+)\/sections\/(\d+)/.exec(route.request().url())!
    const list = SAMPLE[`${m[1]}/${m[2]}`]
    return list ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hadiths: list }) }) : route.fulfill({ status: 404, body: '' })
  })
})

test('الكتب السبعة، ومسند أحمد يظهر غير متوفر بسببه', async ({ page }) => {
  await page.goto('/hadith')
  for (const n of ['صحيح البخاري', 'صحيح مسلم', 'سنن أبي داود', 'جامع الترمذي', 'سنن النسائي', 'سنن ابن ماجه', 'موطأ الإمام مالك']) await expect(page.getByRole('link', { name: new RegExp(n) })).toBeVisible()
  await expect(page.getByText(/لا تتوفر حاليًا قاعدة بيانات كاملة/)).toBeVisible()
  await page.getByRole('link', { name: /سنن أبي داود/ }).click()
  await expect(page.getByText(/منهج الكتاب/)).toBeVisible()
  await expect(page.getByRole('link', { name: /كتاب الطهارة/ }).first()).toBeVisible()
})

test('تفاصيل الحديث: الأحكام منسوبة، وما لا تحويه القاعدة «غير متوفر»، والحفظ والتنقل', async ({ page }) => {
  await page.goto('/hadith/h/abudawud/6')
  await expect(page.getByText('محمد ناصر الدين الألباني').first()).toBeVisible()
  await expect(page.getByText(/الشرح وتفسير المعاني/)).toBeVisible()
  await expect(page.getByText(/غير متوفر بعد: يُضاف فقط من شرح علمي منشور/)).toBeVisible()
  await page.getByRole('button', { name: 'حفظ' }).click()
  await expect(page.getByRole('button', { name: 'محفوظ' })).toBeVisible()
  await page.getByRole('button', { name: /السابق/ }).click()
  await expect(page).toHaveURL(/\/hadith\/h\/abudawud\/5$/)
  await page.goto('/hadith/favorites')
  await expect(page.getByRole('link', { name: /سنن أبي داود — ٦/ })).toBeVisible()
})

test('صحيح البخاري: لا درجة لكل حديث، ويظهر منهج الكتاب بدلها', async ({ page }) => {
  await page.goto('/hadith/h/bukhari/1')
  await expect(page.getByText(/لا توجد درجة لكل حديث في القاعدة/)).toBeVisible()
  await page.getByRole('button', { name: /القراءة الليلية/ }).click()
  await expect(page.locator('.hd-night')).toBeVisible()
})

test('البحث بالموضوع يعمل دون تنزيل، والبحث النصي يوضح أن الكتب غير المحفوظة لم يُبحث فيها', async ({ page }) => {
  await page.goto('/hadith/search?topic=' + encodeURIComponent('الصلاة'))
  await expect(page.getByText(/كتابًا فرعيًا بعنوان فيه «الصلاة»/)).toBeVisible()
  await page.goto('/hadith/search?q=' + encodeURIComponent('النيات'))
  await expect(page.getByText(/لا توجد كتب محفوظة على الجهاز للبحث فيها بعد/)).toBeVisible()
})
