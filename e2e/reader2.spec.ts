// القارئ الجديد (تجريبي): النص كما في المصدر، والأوضاع، والتبديل بين الصفحات والآيات دون فقدان الموضع، وحفظ الموضع
import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } })

test('القارئ الجديد: نص الفاتحة مطابق، والأوضاع والإعدادات تتغير مباشرة، والموضع محفوظ', async ({ page }) => {
  await page.goto('/quran')
  await page.getByRole('link', { name: /جرّب القارئ الجديد/ }).click()
  await expect(page).toHaveURL(/\/read\?s=1&a=1/)
  // النص المعروض = النص في ملف المصحف حرفيًا
  const src = await page.evaluate(async () => (await (await fetch('/data/quran/quran.json')).json()).verses[0] as string[])
  const shown = await page.locator('.r2-flow .r2-ayah').allInnerTexts()
  expect(shown.map((s) => s.trim())).toEqual(src)
  // الإعدادات: وضع كبار السن ثم الليلي، ويتغير الشكل مباشرة
  await page.getByRole('button', { name: 'إعدادات القراءة' }).click()
  await page.getByRole('button', { name: /كبار السن/ }).click()
  await expect(page.locator('.r2')).toHaveClass(/r2-senior/)
  await page.getByRole('button', { name: /الليلي/ }).click()
  await expect(page.locator('.r2')).toHaveClass(/r2-dark/)
  await page.getByRole('radiogroup', { name: 'طريقة العرض' }).getByRole('radio', { name: 'آيات متتابعة' }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.r2-verses')).toBeVisible()
  // الانتقال للآية الخامسة ثم العودة إلى الصفحات: الموضع نفسه
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'الآية التالية' }).click()
  await expect.poll(() => page.evaluate(() => new Promise((res) => { const r = indexedDB.open('islamic-companion'); r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('quran:last'); g.onsuccess = () => res((g.result as { ayah: number })?.ayah) } }))).toBe(5)
  await page.reload()
  await expect(page.locator('.r2')).toHaveClass(/r2-dark/)
  await expect(page.locator('[data-ayah="1:5"]')).toBeVisible()
})

test('وضع الأطفال آية واحدة بخط كبير، ووضع الترجمة يظهر الترجمة تحت الآية', async ({ page }) => {
  await page.goto('/read?s=1&a=2')
  await page.getByRole('button', { name: 'إعدادات القراءة' }).click()
  await page.getByRole('button', { name: /الأطفال/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.r2-card .r2-ayah')).toHaveCount(1)
  await page.getByRole('button', { name: 'إعدادات القراءة' }).click()
  await page.getByRole('button', { name: /القراءة والترجمة/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.r2-tr').first()).toContainText('Allah')
})
