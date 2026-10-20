// اختبارات شاملة عبر المتصفح: التنقل، القرآن، الحفظ، المواقيت، القبلة، الأذكار، الصوت، الاستمرارية، العمل دون اتصال.
import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TONE = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/tone.mp3'))

async function chooseCity(page: Page, query: string, match: RegExp) {
  await page.goto('/prayer')
  await page.getByLabel('اسم المدينة').fill(query)
  await page.getByRole('button', { name: match }).first().click()
  await expect(page.getByText(/تم حفظ الموقع/)).toBeVisible()
}

test.describe('الواجهة والتنقل', () => {
  test('الاتجاه RTL واللغة العربية وعنوان التطبيق', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page).toHaveTitle(/رفيق المسلم/)
  })

  test('كل روابط القائمة الجانبية تعمل وتعرض عنوان الصفحة', async ({ page }) => {
    await page.goto('/')
    const links: [string, RegExp][] = [
      ['ورد اليوم', /ورد اليوم/], ['القرآن الكريم', /القرآن الكريم/], ['الحفظ والمراجعة', /الحفظ والمراجعة/],
      ['الاستماع', /الاستماع إلى القرآن/], ['التفسير والتعلم', /التفسير والتعلم/], ['مواقيت الصلاة', /مواقيت الصلاة/],
      ['القبلة', /اتجاه القبلة/], ['الأذكار', /الأذكار/], ['الأدعية', /الأدعية/], ['متابعة التقدم', /متابعة التقدم/],
      ['ابدأ رحلتك', /ابدأ رحلتك/], ['البحث', /البحث/], ['الإعدادات', /الإعدادات/], ['عن التطبيق ورسالة الوفاء', /رسالة الوفاء/],
    ]
    const nav = page.getByRole('complementary', { name: 'القائمة الرئيسية' })
    for (const [label, heading] of links) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(heading)
    }
  })

  test('بطاقة الإهداء في الرئيسية وصفحة رسالة الوفاء بالنص الكامل', async ({ page }) => {
    await page.goto('/')
    const card = page.getByRole('region', { name: 'إهداء التطبيق' })
    await expect(card).toContainText('صدقة جارية عن روح المرحوم')
    await expect(card).toContainText('قصي بديع خلفه — أبو محمد')
    await expect(page.locator('footer')).toContainText('صدقة جارية عن روح المرحوم قصي بديع خلفه — أبو محمد، رحمه الله.')
    await page.goto('/about')
    await expect(page.locator('article')).toContainText('المرحوم قصي بديع خلفه، المعروف بـ«أبو محمد»')
    await expect(page.locator('article')).toContainText('واجعل قبره روضةً من رياض الجنة')
  })

  test('خالٍ من الإعلانات والاشتراكات وطلبات التبرع', async ({ page }) => {
    for (const p of ['/', '/settings', '/about', '/quran']) {
      await page.goto(p)
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/اشترك الآن|اشتراك مدفوع|ترقية إلى|تبرّع الآن|ادعمنا ماليًا|Premium|Subscribe/i)
    }
  })

  test('التنقل بلوحة المفاتيح: رابط التخطي أول عنصر قابل للتركيز', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText('تخطَّ إلى المحتوى')
  })
})

test.describe('القرآن الكريم', () => {
  test('فهرس السور يعرض 114 سورة ويفتح القارئ', async ({ page }) => {
    await page.goto('/quran')
    await expect(page.locator('.surah-item')).toHaveCount(114)
    await page.getByRole('link', { name: /الإخلاص/ }).click()
    await expect(page.getByRole('heading', { name: 'سورة الإخلاص' })).toBeVisible()
    await expect(page.locator('[data-ayah]')).toHaveCount(4)
  })

  test('الانتقال لآية محددة وبين السور، وحفظ آخر موضع بعد إعادة التشغيل', async ({ page }) => {
    await page.goto('/quran/2?ayah=255')
    await expect(page.locator('#ayah-255')).toBeInViewport()
    // مقارنة بعد توحيد ترتيب علامات التشكيل (NFC)
    const text = await page.locator('#ayah-255 .quran-text').innerText()
    expect(text.normalize('NFC')).toContain('ٱلۡحَيُّ ٱلۡقَيُّومُ'.normalize('NFC'))
    await page.waitForTimeout(1200)
    await page.reload()
    await page.goto('/')
    await expect(page.getByText(/سورة البقرة — الآية 25\d/)).toBeVisible()
    await page.goto('/quran/1')
    await page.getByRole('button', { name: 'السورة التالية' }).click()
    await expect(page).toHaveURL(/\/quran\/2$/)
  })

  test('العلامة المرجعية والملاحظة تبقيان بعد إعادة التحميل', async ({ page }) => {
    await page.goto('/quran/112')
    const row = page.locator('#ayah-1')
    // الضغط على الآية يفتح قائمة الخيارات
    await row.locator('.ayah-tap').click()
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('اسم العلامة').fill('التوحيد')
    await sheet.getByRole('button', { name: 'إضافة علامة' }).click()
    await expect(page.getByText('أضيفت العلامة')).toBeVisible()
    await sheet.getByRole('button', { name: 'ملاحظة' }).click()
    await row.getByRole('textbox').fill('سورة التوحيد')
    await row.getByRole('button', { name: 'حفظ' }).click()
    await expect(page.getByText('حُفظت الملاحظة')).toBeVisible()
    await page.reload()
    await page.goto('/quran')
    await page.getByRole('tab', { name: 'العلامات' }).click()
    await expect(page.getByText('التوحيد — الإخلاص — الآية 1')).toBeVisible()
    await page.getByRole('tab', { name: 'ملاحظاتي' }).click()
    await expect(page.getByText('سورة التوحيد')).toBeVisible()
  })

  test('تسجيل القراءة يظهر في متابعة التقدم', async ({ page }) => {
    await page.goto('/quran/1')
    await page.getByRole('button', { name: 'أتممت قراءة السورة' }).click()
    await page.goto('/progress')
    await expect(page.locator('.stat').filter({ hasText: 'آيات مقروءة' }).locator('b')).toHaveText('7')
  })

  test('البحث يتجاهل التشكيل ويجد الآيات والأذكار', async ({ page }) => {
    await page.goto('/search')
    await page.getByLabel('كلمة البحث').fill('الله الصمد')
    await expect(page.getByRole('link', { name: /الإخلاص 2/ })).toBeVisible()
    await page.getByLabel('كلمة البحث').fill('الكرب')
    await expect(page.getByRole('heading', { name: /الأذكار والأدعية \(\d+\)/ })).toBeVisible()
  })
})

test.describe('مواقيت الصلاة والقبلة', () => {
  test('اختيار نابلس ثم غزة: المواقيت تتغير وتبقى بعد إعادة التشغيل', async ({ page }) => {
    await chooseCity(page, 'نابلس', /نابلس/)
    await expect(page.getByText('نابلس، فلسطين').first()).toBeVisible()
    const nablus = await page.locator('.prayer-table').first().innerText()
    await page.reload()
    await expect(page.getByText('نابلس، فلسطين').first()).toBeVisible()
    await page.getByRole('button', { name: 'تغيير المدينة' }).click()
    await page.getByLabel('اسم المدينة').fill('غزة')
    await page.getByRole('button', { name: /غزة/ }).first().click()
    await expect(page.getByText('غزة، فلسطين').first()).toBeVisible()
    const gaza = await page.locator('.prayer-table').first().innerText()
    expect(gaza).not.toBe(nablus)
    await expect(page.getByLabel('الوقت المتبقي')).toHaveText(/\d\d:\d\d:\d\d/)
  })

  test('القدس والخليل متاحتان ضمن فلسطين', async ({ page }) => {
    await page.goto('/prayer')
    await page.getByLabel('الدولة').selectOption('PS')
    await page.getByLabel('اسم المدينة').fill('القدس')
    await expect(page.getByRole('button', { name: /القدس، فلسطين/ })).toBeVisible()
    await page.getByLabel('اسم المدينة').fill('الخليل')
    await expect(page.getByRole('button', { name: /الخليل، فلسطين/ })).toBeVisible()
  })

  test('القبلة من نابلس ≈ 158° ورسالة واضحة عند غياب المستشعر', async ({ page }) => {
    await chooseCity(page, 'نابلس', /نابلس/)
    await page.goto('/qibla')
    await expect(page.getByText(/^158\.\d°$/)).toBeVisible()
    await page.getByRole('button', { name: 'تفعيل البوصلة' }).click()
    await expect(page.getByRole('alert')).toContainText(/مستشعر/, { timeout: 5000 })
  })
})

test.describe('الأذكار والحفظ', () => {
  test('العداد وتسجيل إتمام أذكار الصباح يظهر في ورد اليوم', async ({ page }) => {
    await page.goto('/adhkar/morning')
    await expect(page.getByText('رواه مسلم (2723)')).toBeVisible()
    const counter = page.getByRole('button', { name: /عدّاد: 0 من 3/ }).first()
    await counter.click()
    await expect(page.getByRole('button', { name: /عدّاد: 1 من 3/ }).first()).toBeVisible()
    await page.getByRole('button', { name: 'تسجيل الإتمام' }).click()
    await page.goto('/wird')
    await expect(page.getByRole('link', { name: /أذكار الصباح/ })).toHaveClass(/btn-gold/)
  })

  test('المفضلة', async ({ page }) => {
    await page.goto('/duas/parents')
    await page.getByRole('button', { name: 'إضافة إلى المفضلة' }).first().click()
    await page.goto('/duas')
    await page.getByRole('button', { name: 'المفضلة' }).click()
    await expect(page.locator('article')).toHaveCount(1)
  })

  test('إضافة هدف حفظ وتقييم مقطع يغيّر حالته', async ({ page }) => {
    await page.goto('/memorize')
    await page.getByRole('tab', { name: 'هدف حفظ جديد' }).click()
    await page.getByLabel('السورة').selectOption('114')
    await page.getByRole('button', { name: 'إضافة إلى خطة الحفظ' }).click()
    await expect(page.getByRole('heading', { name: /سورة الناس — الآيات 1–3/ })).toBeVisible()
    await page.getByRole('button', { name: 'إخفاء للاختبار' }).click()
    await expect(page.locator('.hidden-text')).toHaveCount(3)
    await page.getByRole('button', { name: 'إظهار الآية 1' }).click()
    await expect(page.locator('.hidden-text')).toHaveCount(2)
    await page.getByRole('button', { name: 'متقن' }).click()
    await page.getByRole('tab', { name: 'كل المقاطع' }).click()
    await expect(page.getByText('قيد الحفظ')).toBeVisible()
  })
})

test.describe('الاستماع', () => {
  // نحجب عامل الخدمة هنا حتى تمر طلبات الصوت عبر بديل الاختبار المحلي (الطلبات من عامل الخدمة لا يعترضها page.route)
  test.use({ serviceWorkers: 'block' })
  test('تشغيل التلاوة والانتقال للآية التالية (ملف صوتي محلي بديل عن الخادم)', async ({ page }) => {
    const requested: string[] = []
    await page.route(/everyayah\.com\/data\//, (route) => {
      requested.push(route.request().url())
      return route.fulfill({ status: 200, body: TONE, headers: { 'content-type': 'audio/mpeg', 'access-control-allow-origin': '*' } })
    })
    await page.goto('/listen')
    await page.getByLabel('السورة').selectOption('112')
    await page.getByRole('button', { name: /تشغيل سورة الإخلاص/ }).click()
    const player = page.getByRole('region', { name: 'مشغل التلاوة' })
    await expect(player).toContainText('سورة الإخلاص')
    await expect(player.getByRole('button', { name: 'إيقاف مؤقت' })).toBeVisible({ timeout: 10000 })
    // البسملة أولًا ثم الآية 1 ثم 2 (كل ملف ثانية واحدة)
    await expect(player).toContainText('الآية 2', { timeout: 10000 })
    expect(requested.some((u) => u.endsWith('/001001.mp3'))).toBe(true)
    expect(requested.some((u) => u.endsWith('/112001.mp3'))).toBe(true)
    await player.getByRole('button', { name: 'إيقاف مؤقت' }).click()
    await expect(player.getByRole('button', { name: 'تشغيل' })).toBeVisible()
  })

  test('رسالة خطأ واضحة عند فشل تحميل التلاوة', async ({ page }) => {
    await page.route(/everyayah\.com\/data\//, (route) => route.fulfill({ status: 404, body: 'not found' }))
    await page.goto('/listen')
    await page.getByLabel('السورة').selectOption('1')
    await page.getByRole('button', { name: /تشغيل سورة الفاتحة/ }).click()
    await expect(page.getByRole('region', { name: 'مشغل التلاوة' }).getByRole('alert')).toContainText('تعذر تحميل')
  })
})

test.describe('البيانات والإعدادات', () => {
  test('الوضع الليلي يُحفظ', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('المظهر').selectOption('dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('تصدير نسخة احتياطية', async ({ page }) => {
    await page.goto('/quran/1')
    await page.locator('#ayah-1 .ayah-tap').click()
    await page.getByRole('dialog').getByRole('button', { name: 'إضافة علامة' }).click()
    await expect(page.getByText('أضيفت العلامة')).toBeVisible()
    await page.goto('/settings')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'تصدير نسخة احتياطية' }).click()])
    const json = JSON.parse(fs.readFileSync((await download.path())!, 'utf8'))
    expect(json.format).toBe('islamic-companion-backup')
    expect(json.data.bookmarks.map((b: { id: string }) => b.id)).toContain('1:1')
  })
})

test.describe('العمل دون إنترنت', () => {
  test('بعد أول زيارة: إعادة التشغيل دون اتصال تعرض الواجهة والمصحف والأذكار', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.reload() // يصبح عامل الخدمة متحكمًا بالصفحة
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    await context.setOffline(true)
    await page.goto('/quran/36')
    await expect(page.getByRole('heading', { name: 'سورة يس' })).toBeVisible()
    await expect(page.locator('[data-ayah]')).toHaveCount(83)
    await expect(page.getByText(/أنت غير متصل بالإنترنت/)).toBeVisible()
    await page.goto('/adhkar/evening')
    await expect(page.getByText('رواه مسلم (2723)')).toBeVisible()
    await page.goto('/about')
    await expect(page.locator('article')).toContainText('قصي بديع خلفه')
    await context.setOffline(false)
  })
})

test.describe('الشاشات الصغيرة', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('القائمة تفتح وتغلق، ولا يوجد تمرير أفقي في الصفحات الرئيسية', async ({ page }) => {
    for (const p of ['/', '/quran', '/quran/2', '/prayer', '/adhkar/morning', '/settings', '/memorize', '/listen', '/progress']) {
      await page.goto(p)
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, p).toBeLessThanOrEqual(1)
    }
    await page.goto('/')
    await page.getByRole('button', { name: 'القائمة' }).click()
    await page.getByRole('complementary').getByRole('link', { name: 'القبلة' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('اتجاه القبلة')
  })
})

test.describe('الإصدار 0.2', () => {
  test('قائمة خيارات الآية: المفضلة وبطاقة الصورة والتفسير', async ({ page }) => {
    await page.goto('/quran/112')
    await page.locator('#ayah-2 .ayah-tap').click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toContainText('سورة الإخلاص: 2')
    await sheet.getByRole('button', { name: 'المفضلة' }).click()
    await expect(page.getByText('أضيفت إلى المفضلة')).toBeVisible()
    await sheet.getByRole('button', { name: 'بطاقة صورة' }).click()
    await expect(page.getByRole('img', { name: /معاينة البطاقة/ })).toBeVisible({ timeout: 10000 })
    await page.getByRole('dialog').getByRole('button', { name: 'إغلاق' }).first().click()
    await page.goto('/quran')
    await page.getByRole('tab', { name: 'الآيات المفضلة' }).click()
    await expect(page.getByText('الإخلاص — الآية 2')).toBeVisible()
  })

  test('وضع المصحف: صفحة 42 فيها آية الكرسي، والتنقل بين الصفحات، والعودة للقراءة المتتابعة', async ({ page }) => {
    await page.goto('/mushaf/42')
    await expect(page.getByRole('article', { name: 'الصفحة 42' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'سورة البقرة الآية 255' })).toBeVisible()
    await page.getByRole('button', { name: 'الصفحة التالية' }).click()
    await expect(page).toHaveURL(/\/mushaf\/43$/)
    await page.getByRole('button', { name: /قراءة متتابعة/ }).click()
    await expect(page).toHaveURL(/\/quran\/2\?ayah=\d+&flow=1/)
  })

  test('خلفية القراءة والترجمة تُحفظان', async ({ page }) => {
    await page.goto('/quran/1')
    await page.getByRole('button', { name: 'خيارات القراءة' }).click()
    await page.getByRole('radio', { name: 'ورقي دافئ' }).click()
    await page.getByLabel('الترجمة تحت الآيات').selectOption('en-sahih')
    await page.keyboard.press('Escape')
    await expect(page.locator('.translation').first()).toContainText('In the name of Allah')
    await page.reload()
    await expect(page.locator('.reader')).toHaveClass(/reader-bg-sepia/)
    await expect(page.locator('.translation').first()).toBeVisible()
  })

  test('خطة ختمة بمدة 30 يومًا وتسجيل الورد', async ({ page }) => {
    await page.goto('/wird')
    await page.getByRole('button', { name: 'ختمة جديدة' }).click()
    await page.getByRole('button', { name: '30 يومًا' }).click()
    await page.getByRole('button', { name: 'بدء الختمة' }).click()
    await expect(page.getByText('ورد اليوم: الصفحات 1–21')).toBeVisible()
    await page.getByRole('button', { name: 'قرأت ورد اليوم' }).click()
    await expect(page.getByText(/أتممت ورد اليوم \(21 صفحة\)/)).toBeVisible()
    await page.reload()
    await expect(page.getByText(/أتممت ورد اليوم/)).toBeVisible()
    await page.goto('/progress')
    await expect(page.locator('.stat').filter({ hasText: 'صفحات مختلفة' }).locator('b')).toHaveText('21')
  })

  test('المسبحة: العد يُحفظ بعد إعادة التحميل، والتصفير يحتاج تأكيدًا', async ({ page }) => {
    await page.goto('/tasbih')
    const btn = page.locator('.tasbih-btn')
    for (let i = 0; i < 5; i++) await btn.click()
    await expect(page.locator('.tasbih-count')).toHaveText('5')
    await page.waitForTimeout(600)
    await page.reload()
    await expect(page.locator('.tasbih-count')).toHaveText('5')
    await page.getByRole('button', { name: 'تصفير العداد' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'تصفير' }).click()
    await expect(page.locator('.tasbih-count')).toHaveText('0')
  })

  test('التقويم الهجري والمناسبات', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.getByText('المناسبات القادمة')).toBeVisible()
    await expect(page.getByRole('gridcell')).toHaveCount(31)
    await expect(page.getByText(/قد تختلف بداية الشهر/)).toBeVisible()
  })

  test('إعدادات التذكير: معاينة الجدول وفترة الهدوء', async ({ page, context }) => {
    await context.grantPermissions(['notifications'])
    await chooseCity(page, 'نابلس', /نابلس/)
    await page.goto('/reminders')
    await page.getByLabel('تفعيل التذكيرات').check()
    await page.getByRole('checkbox', { name: /أذكار الصباح/ }).check()
    await expect(page.getByLabel('وقت أذكار الصباح')).toHaveValue('06:30')
    await expect(page.locator('li', { hasText: 'حان الآن وقت صلاة' }).first()).toBeVisible()
    await page.getByRole('checkbox', { name: /تقليل الإشعارات/ }).check()
    await expect(page.locator('li', { hasText: 'أذكار الصباح' })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('checkbox', { name: /تقليل الإشعارات/ })).toBeChecked()
  })

  test('تخصيص الرئيسية: إخفاء بطاقة يبقى بعد إعادة التحميل، وبطاقة الإهداء لا تُخفى', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'آية اليوم' })).toBeVisible()
    await page.getByRole('button', { name: 'تخصيص الرئيسية' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByRole('checkbox', { name: 'آية اليوم' }).uncheck()
    await expect(sheet.getByRole('checkbox', { name: 'بطاقة الإهداء' })).toBeDisabled()
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'آية اليوم' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'إهداء التطبيق' })).toBeVisible()
  })

  test('عداد الأذكار يُستأنف بعد الخروج والعودة', async ({ page }) => {
    await page.goto('/adhkar/morning')
    await page.getByRole('button', { name: /عدّاد: 0 من 3/ }).first().click()
    await page.getByRole('button', { name: /عدّاد: 1 من 3/ }).first().click()
    await page.goto('/')
    await page.goto('/adhkar/morning')
    await expect(page.getByRole('button', { name: /عدّاد: 2 من 3/ }).first()).toBeVisible()
  })

  test('ترحيل بيانات الإصدار 0.1: الورد القديم يصبح خطة ختمة دون فقد الموضع', async ({ page }) => {
    await page.goto('/about')
    await page.evaluate(async () => {
      await new Promise<void>((res, rej) => {
        const r = indexedDB.open('islamic-companion', 1)
        r.onsuccess = () => {
          const tx = r.result.transaction('kv', 'readwrite')
          tx.objectStore('kv').put({ pagesPerDay: 3, nextPage: 50, startedAt: '2026-09-01', khatmas: 1 }, 'wird')
          tx.objectStore('kv').delete('khatmas')
          tx.oncomplete = () => { r.result.close(); res() }
          tx.onerror = () => rej(tx.error)
        }
      })
    })
    await page.goto('/wird')
    await expect(page.getByText('ورد اليوم: الصفحات 50–52')).toBeVisible()
    await expect(page.getByText('الختمات المكتملة: 1')).toBeVisible()
  })
})
