// الأكاديمية والمسابقات ومساحة الأطفال والرقابة الأبوية
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

test('الرئيسية فيها الأقسام الرئيسية، والأكاديمية بمقرراتها الثمانية', async ({ page }) => {
  await page.goto('/')
  const sec = page.getByRole('region', { name: 'الأقسام الرئيسية' })
  for (const n of ['القرآن الكريم', 'الأحاديث النبوية', 'الأكاديمية الإسلامية', 'الصلاة والأذكار', 'قصص الأنبياء', 'المسابقات الإسلامية']) await expect(sec.getByRole('link', { name: n })).toBeVisible()
  await sec.getByRole('link', { name: 'الأكاديمية الإسلامية' }).click()
  for (const n of ['تعليم الصلاة', 'تعليم الطهارة', 'السيرة النبوية', 'قصص الأنبياء', 'الصحابة رضي الله عنهم', 'العقيدة الإسلامية', 'فقه العبادات', 'ركن الأطفال']) await expect(page.locator('.ac-course strong', { hasText: new RegExp(`^${n}$`) })).toBeVisible()
})

test('درس: حالة المراجعة ظاهرة، والآية من المصحف، والحديث برقمه، ثم الاختبار بالشرح والنقاط', async ({ page }) => {
  await page.goto('/academy/lesson/taharah/wudu-steps')
  await expect(page.getByText('قيد المراجعة').first()).toBeVisible()
  await expect(page.getByText(/سورة المائدة/)).toBeVisible()
  await expect(page.getByText('البخاري (164)').first()).toBeVisible()
  await page.getByRole('button', { name: 'أنهيت الدرس' }).click()
  await expect(page.getByRole('button', { name: 'أنهيت هذا الدرس' })).toBeDisabled()
  await page.getByRole('link', { name: /الاختبار/ }).click()
  await page.getByRole('radio', { name: 'إلى المرفقين' }).click()
  await page.getByRole('button', { name: 'تحقق' }).click()
  await expect(page.getByText('إجابة صحيحة ✓')).toBeVisible()
  await page.getByRole('button', { name: 'السؤال التالي' }).click()
  await page.getByRole('radio', { name: 'خطأ' }).click()
  await page.getByRole('button', { name: 'تحقق' }).click()
  await page.getByRole('button', { name: 'السؤال التالي' }).click()
  await page.getByLabel('الإجابة').fill('الكعبين')
  await page.getByRole('button', { name: 'تحقق' }).click()
  await page.getByRole('button', { name: 'النتيجة' }).click()
  await expect(page.getByText('النتيجة: ٣ من ٣')).toBeVisible()
  await expect(page.getByText(/\+٥٠ نقطة/)).toBeVisible()
})

test('خلاف المذاهب يُعرض بنسبة كل قول إلى مذهبه، والمصادر تفصل المعتمد عن غير المراجع', async ({ page }) => {
  await page.goto('/academy/lesson/fiqh/madhahib')
  await expect(page.getByRole('rowheader', { name: 'الشافعية' }).first()).toBeVisible()
  await page.goto('/academy/sources')
  await expect(page.getByText(/معتمد، .* قيد المراجعة/)).toBeVisible()
  await page.getByRole('textbox', { name: 'رابط الحزمة' }).fill('http://bad')
  await page.getByRole('button', { name: /من رابط/ }).click()
  await expect(page.getByText(/https:\/\//).first()).toBeVisible()
})

test('الرقابة الأبوية: رمز PIN، وملف طفل، ووضع الطفل يمنع الخروج من مساحته دون الرمز', async ({ page }) => {
  await page.goto('/kids/parent')
  await page.getByLabel('رمز جديد').fill('2468')
  await page.getByRole('button', { name: 'حفظ الرمز' }).click()
  await page.getByLabel('اسم الطفل').fill('سلمى')
  await page.getByRole('button', { name: /^إضافة$/ }).click()
  await page.getByRole('button', { name: /بدء وضع الطفل/ }).click()
  await expect(page.getByRole('heading', { name: /أهلًا سلمى/ })).toBeVisible()
  await expect(page.locator('.app.kid-mode')).toHaveCount(1)
  await page.goto('/hadith')
  await expect(page).toHaveURL(/\/kids$/)
  await page.getByRole('link', { name: 'الحروف العربية' }).click()
  await expect(page.getByRole('button', { name: 'حرف ألف' })).toBeVisible()
  await page.goto('/kids')
  await page.getByRole('button', { name: /خروج/ }).click()
  await page.getByLabel('رمز الوالدين للخروج').fill('1111')
  await page.getByRole('button', { name: 'متابعة' }).click()
  await expect(page.getByText('الرمز غير صحيح')).toBeVisible()
  await page.getByLabel('رمز الوالدين للخروج').fill('2468')
  await page.getByRole('button', { name: 'متابعة' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.app.kid-mode')).toHaveCount(0)
})
