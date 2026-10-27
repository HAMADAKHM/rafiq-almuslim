// اختبارات شاملة عبر المتصفح: التنقل، القرآن، الحفظ، المواقيت، القبلة، الأذكار، الصوت، الاستمرارية، العمل دون اتصال.
import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TONE = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/tone.mp3'))
const CLIP = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/clip.webm'))

async function chooseCity(page: Page, query: string, match: RegExp) {
  await page.goto('/prayer')
  await page.getByLabel('اسم المدينة').fill(query)
  await page.getByRole('button', { name: match }).first().click()
  await expect(page.getByText(/تم حفظ الموقع/)).toBeVisible()
}


/** القراءة المتتابعة (الوضع الافتراضي الآن صفحة المصحف كاملة): لاختبارات تعتمد على عرض الآيات متتابعة */
async function useFlowReader(page: Page) {
  await page.goto('/about')
  await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('islamic-companion')
    r.onsuccess = () => {
      const tx = r.result.transaction('kv', 'readwrite')
      const st = tx.objectStore('kv')
      const g = st.get('settings')
      g.onsuccess = () => { st.put({ ...(g.result ?? {}), readerMode: 'flow' }, 'settings') }
      tx.oncomplete = () => { r.result.close(); res(null) }
    }
  }))
}

/** قراءة إعداد محفوظ فعلًا في IndexedDB (للانتظار حتى يكتمل الحفظ قبل إعادة التحميل) */
async function savedSetting(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k) => new Promise((res) => {
    const r = indexedDB.open('islamic-companion')
    r.onsuccess = () => {
      const g = r.result.transaction('kv').objectStore('kv').get('settings')
      g.onsuccess = () => { res((g.result as Record<string, unknown> | undefined)?.[k] ?? null); r.result.close() }
      g.onerror = () => res(null)
    }
    r.onerror = () => res(null)
  }), key)
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
    await expect(card).toContainText('صدقة جارية عن روح المرحوم الحاج قصي بديع خلفه «أبو محمد»')
    await expect(card).toContainText('رحمه الله وغفر له')
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
    // يُفتح المصحف على الصفحة كاملة (604: الإخلاص والفلق والناس)
    await expect(page).toHaveURL(/\/mushaf\/604/)
    await expect(page.getByRole('button', { name: 'سورة الإخلاص الآية 4' })).toBeVisible()
  })

  test('الانتقال لآية محددة وبين السور، وحفظ آخر موضع بعد إعادة التشغيل', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/2?ayah=255')
    await expect(page.locator('#ayah-255')).toBeInViewport()
    // مقارنة بعد توحيد ترتيب علامات التشكيل (NFC)
    const text = await page.locator('#ayah-255').innerText()
    expect(text.normalize('NFC')).toContain('ٱلۡحَيُّ ٱلۡقَيُّومُ'.normalize('NFC'))
    await page.waitForTimeout(1200)
    await page.reload()
    await page.goto('/')
    await expect(page.getByText(/سورة البقرة — الآية 25\d/)).toBeVisible()
    await page.goto('/quran/1')
    await page.getByRole('button', { name: 'السورة التالية' }).click()
    await expect(page).toHaveURL(/\/quran\/2\?flow=1$/)
  })

  test('العلامة المرجعية والملاحظة تبقيان بعد إعادة التحميل', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/112')
    const row = page.locator('#ayah-1')
    // الضغط على الآية يفتح قائمة الخيارات
    await row.click()
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('اسم العلامة').fill('التوحيد')
    await sheet.getByRole('button', { name: 'إضافة علامة' }).click()
    await expect(page.getByText('أضيفت العلامة')).toBeVisible()
    await sheet.getByRole('button', { name: 'ملاحظة' }).click()
    await page.getByRole('dialog').getByRole('textbox').fill('سورة التوحيد')
    await page.getByRole('dialog').getByRole('button', { name: 'حفظ' }).click()
    await expect(page.getByText('حُفظت الملاحظة')).toBeVisible()
    await page.reload()
    await page.goto('/quran')
    await page.getByRole('tab', { name: 'العلامات' }).click()
    await expect(page.getByText('التوحيد — الإخلاص — الآية 1')).toBeVisible()
    await page.getByRole('tab', { name: 'ملاحظاتي' }).click()
    await expect(page.getByText('سورة التوحيد')).toBeVisible()
  })

  test('تسجيل القراءة يظهر في متابعة التقدم', async ({ page }) => {
    await useFlowReader(page)
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
    await page.getByRole('tab', { name: 'قائمة' }).click()
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

  test('عند فشل المصدر الأول تُشغَّل التلاوة تلقائيًا من المصدر البديل', async ({ page }) => {
    const mirror: string[] = []
    await page.route(/everyayah\.com\/data\//, (route) => route.fulfill({ status: 404, body: 'not found' }))
    await page.route(/cdn\.islamic\.network\/quran\/audio\//, (route) => {
      mirror.push(route.request().url())
      return route.fulfill({ status: 200, body: TONE, headers: { 'content-type': 'audio/mpeg' } })
    })
    await page.goto('/listen')
    await page.getByLabel('السورة').selectOption('112')
    await page.getByRole('button', { name: /تشغيل سورة الإخلاص/ }).click()
    const player = page.getByRole('region', { name: 'مشغل التلاوة' })
    await expect(player).toContainText('الآية 2', { timeout: 15000 })
    await expect(player.getByRole('alert')).toHaveCount(0)
    // الرقم المتسلسل للإخلاص 1 هو 6222
    expect(mirror.some((u) => u.endsWith('/ar.alafasy/6222.mp3'))).toBe(true)
  })

  test('رسالة خطأ واضحة عند فشل تحميل التلاوة', async ({ page }) => {
    await page.route(/everyayah\.com\/data\/|cdn\.islamic\.network/, (route) => route.fulfill({ status: 404, body: 'not found' }))
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
    await expect.poll(() => savedSetting(page, 'theme')).toBe('dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('تصدير نسخة احتياطية', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/1')
    await page.locator('#ayah-1').click()
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
    await page.getByRole('tab', { name: 'قائمة' }).click()
    await expect(page.getByText('رواه مسلم (2723)')).toBeVisible()
    await page.goto('/about')
    await expect(page.locator('article')).toContainText('قصي بديع خلفه')
    await context.setOffline(false)
  })
})

test.describe('الشاشات الصغيرة', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('القائمة تفتح وتغلق، ولا يوجد تمرير أفقي في الصفحات الرئيسية', async ({ page }) => {
    for (const p of ['/', '/quran', '/quran/2', '/prayer', '/adhkar/morning', '/settings', '/memorize', '/listen', '/progress', '/mosques', '/studio', '/more', '/wird', '/assistant', '/hadith']) {
      await page.goto(p)
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, p).toBeLessThanOrEqual(1)
    }
    await page.goto('/')
    const tabs = page.getByRole('navigation', { name: 'التنقل السفلي' })
    await tabs.getByRole('link', { name: 'المزيد' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('كل الأقسام')
    await page.getByRole('main').getByRole('link', { name: 'القبلة' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('اتجاه القبلة')
    await tabs.getByRole('link', { name: 'الأذكار' }).click()
    await expect(tabs.getByRole('link', { name: 'الأذكار' })).toHaveAttribute('aria-current', 'page')
    await tabs.getByRole('link', { name: 'الرئيسية' }).click()
    await expect(page.getByRole('region', { name: 'الصلاة القادمة' })).toBeVisible()
  })
})

test.describe('الإصدار 0.2', () => {
  test('قائمة خيارات الآية: المفضلة وبطاقة الصورة والتفسير', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/112')
    await page.locator('#ayah-2').click()
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
    // الصفحة كاملة دون تمرير، وأدوات القراءة تظهر من زر السورة في الشريط السفلي
    await page.getByRole('button', { name: 'أدوات القراءة' }).click()
    await page.getByRole('button', { name: 'الصفحة التالية' }).click()
    await expect(page).toHaveURL(/\/mushaf\/43$/)
    await page.getByRole('button', { name: 'الإعدادات' }).click()
    await page.getByRole('radio', { name: /متتابعة/ }).click()
    await expect(page).toHaveURL(/\/quran\/2\?ayah=\d+&flow=1/)
  })

  test('إعدادات القراءة: الخلفية والخط والإطار والترجمة تُحفظ', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/1')
    await page.getByRole('button', { name: 'الإعدادات' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByRole('radio', { name: 'ورقية' }).click()
    await sheet.getByRole('radio', { name: /شهرزاد/ }).click()
    await sheet.getByRole('radio', { name: 'كبير جدًا' }).click()
    await sheet.getByRole('switch', { name: 'إطار المصحف الزخرفي' }).uncheck()
    await sheet.getByRole('switch', { name: 'الترجمة الإنجليزية تحت الآيات' }).check()
    await page.keyboard.press('Escape')
    await expect(page.locator('.translation').first()).toContainText('In the name of Allah')
    await page.reload()
    const app = page.locator('.reader-app')
    await expect(app).toHaveClass(/reader-bg-sepia/)
    await expect(app).toHaveClass(/frame-plain/)
    expect(await app.evaluate((el) => getComputedStyle(el).getPropertyValue('--quran-family'))).toContain('Scheherazade')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--quran-size').trim())).toBe('44px')
    await expect(page.locator('.translation').first()).toBeVisible()
  })

  test('وضع التركيز: آية واحدة والتنقل بينها، ويُحفظ الوضع', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/112')
    await page.getByRole('button', { name: 'الإعدادات' }).click()
    await page.getByRole('dialog').getByRole('radio', { name: /التركيز/ }).click()
    await expect(page.locator('[data-ayah]')).toHaveCount(1)
    await expect(page.getByText('الآية ١ من ٤')).toBeVisible()
    await page.getByRole('button', { name: 'الآية التالية' }).click()
    await expect(page.getByText('الآية ٢ من ٤')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByText('الآية ٣ من ٤')).toBeVisible()
    await page.reload()
    await expect(page.locator('[data-ayah]')).toHaveCount(1)
  })

  test('صفحة معلومات السورة ومتابعة القراءة', async ({ page }) => {
    await page.goto('/quran/18/info')
    await expect(page.getByRole('heading', { name: 'سورة الكهف' })).toBeVisible()
    await expect(page.getByLabel('بيانات السورة')).toContainText('مكية')
    await expect(page.getByLabel('بيانات السورة')).toContainText('١١٠')
    await page.getByRole('link', { name: /ابدأ القراءة|متابعة القراءة/ }).click()
    await expect(page).toHaveURL(/\/(quran\/18|mushaf\/293)/)
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
    await page.getByRole('tab', { name: 'قائمة' }).click()
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

test.describe('تجربة 0.4', () => {
  test('جلسة الأذكار: عدّاد كبير وانتقال تلقائي عند اكتمال العدد ويمكن تعطيله', async ({ page }) => {
    await page.goto('/adhkar/morning')
    await expect(page.getByText('١ / ١٢')).toBeVisible()
    await page.getByRole('button', { name: 'عدّاد: 0 من 1' }).click()
    // ينتقل تلقائيًا إلى الذكر الثاني (المعوذات ثلاثًا)
    await expect(page.getByText('٢ / ١٢')).toBeVisible()
    const c = page.getByRole('button', { name: /عدّاد: 0 من 3/ })
    await c.click()
    await expect(page.getByRole('button', { name: /عدّاد: 1 من 3/ })).toBeVisible()
    await page.getByRole('button', { name: 'إعادة عدّ هذا الذكر' }).click()
    await expect(page.getByRole('button', { name: /عدّاد: 0 من 3/ })).toBeVisible()
    await page.getByRole('switch', { name: 'الانتقال التلقائي إلى الذكر التالي' }).uncheck()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^عدّاد:/ }).click()
    await page.waitForTimeout(700)
    await expect(page.getByText('٢ / ١٢')).toBeVisible()
    await page.getByRole('button', { name: 'الذكر التالي' }).click()
    await expect(page.getByText('٣ / ١٢')).toBeVisible()
    await expect(page.getByText('رواه مسلم (2723)')).toBeVisible()
    await page.getByRole('button', { name: 'الذكر السابق' }).click()
    await expect(page.getByRole('button', { name: /عدّاد: 3 من 3/ })).toBeVisible()
    // الإعداد يبقى بعد إعادة التحميل، والجلسة تستأنف من أول ذكر غير مكتمل
    await page.reload()
    await expect(page.getByRole('switch', { name: 'الانتقال التلقائي إلى الذكر التالي' })).not.toBeChecked()
    await expect(page.getByText('٣ / ١٢')).toBeVisible()
  })

  test('إتمام كل أذكار القسم في الجلسة يسجَّل تلقائيًا', async ({ page }) => {
    await page.goto('/adhkar/home')
    for (let i = 0; i < 3; i++) {
      const btn = page.getByRole('button', { name: /^عدّاد: 0 من/ })
      await btn.click()
      await page.waitForTimeout(550)
    }
    await expect(page.getByText(/أتممت دخول المنزل والخروج منه/).first()).toBeVisible()
    await page.goto('/adhkar')
    await expect(page.getByRole('link', { name: /دخول المنزل والخروج منه/ }).getByLabel('أُتمّت اليوم')).toBeVisible()
  })

  test('الأذكار الشخصية: إضافة وتعديل وحذف مع وسم واضح', async ({ page }) => {
    await page.goto('/my-adhkar')
    await page.getByRole('button', { name: 'إضافة ذكر' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('نص الذكر').fill('اللهم ارحم أبي')
    await sheet.getByLabel('عدد التكرار (اختياري)').fill('5')
    await sheet.getByRole('button', { name: 'حفظ الذكر' }).click()
    await expect(page.locator('article').filter({ hasText: 'اللهم ارحم أبي' })).toContainText('ذكر شخصي — ليس من المأثور')
    await page.reload()
    await expect(page.getByText('اللهم ارحم أبي')).toBeVisible()
    await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
    await page.getByRole('button', { name: 'عدّاد: 0 من 5' }).click()
    await expect(page.getByRole('button', { name: 'عدّاد: 1 من 5' })).toBeVisible()
    await page.getByRole('button', { name: 'عرض القائمة' }).click()
    await page.getByRole('button', { name: 'تعديل الذكر' }).click()
    await page.getByRole('dialog').getByLabel('نص الذكر').fill('اللهم ارحم أبي واغفر له')
    await page.getByRole('dialog').getByRole('button', { name: 'حفظ الذكر' }).click()
    await expect(page.getByText('اللهم ارحم أبي واغفر له')).toBeVisible()
    await page.getByRole('button', { name: 'حذف الذكر' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'حذف' }).click()
    await expect(page.getByText('لم تضف أذكارًا شخصية بعد.')).toBeVisible()
  })

  test('الرئيسية: بطاقة الصلاة القادمة بالمواقيت الخمس، واختصارات قابلة للتخصيص', async ({ page }) => {
    await chooseCity(page, 'نابلس', /نابلس، فلسطين/)
    await page.goto('/')
    const next = page.getByRole('region', { name: 'الصلاة القادمة' })
    await expect(next.getByLabel('الوقت المتبقي')).toHaveText(/^\d\d:\d\d:\d\d$/)
    for (const p of ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء']) await expect(next.getByText(p, { exact: true }).first()).toBeVisible()
    const quick = page.getByRole('navigation', { name: 'وصول سريع' })
    await expect(quick.getByRole('link')).toHaveCount(4)
    await page.getByRole('button', { name: 'تخصيص الرئيسية' }).click()
    await page.getByRole('dialog').getByRole('checkbox', { name: 'اختصار الحفظ' }).check()
    await page.getByRole('dialog').getByRole('checkbox', { name: 'اختصار القبلة' }).uncheck()
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(quick.getByRole('link', { name: 'الحفظ' })).toBeVisible()
    await expect(quick.getByRole('link', { name: 'القبلة' })).toHaveCount(0)
    await quick.getByRole('link', { name: 'الحفظ' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('الحفظ والمراجعة')
  })

  test('متابعة الصلوات اختيارية وتُحفظ محليًا', async ({ page }) => {
    await chooseCity(page, 'نابلس', /نابلس، فلسطين/)
    await page.goto('/prayer')
    await expect(page.getByRole('button', { name: 'صلّيت الفجر' })).toHaveCount(0)
    await page.getByRole('switch', { name: 'متابعة أداء الصلوات' }).check()
    await page.getByRole('button', { name: 'صلّيت الفجر' }).click()
    await expect(page.getByRole('button', { name: 'صلّيت الفجر' })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: 'صلّيت الفجر' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(/آخر 7 أيام: 1 من 35/)).toBeVisible()
  })

  test('قسم الاستغفار والصلاة على النبي ﷺ والرقية الشرعية متاحان', async ({ page }) => {
    await page.goto('/adhkar')
    await page.getByRole('link', { name: /الاستغفار والصلاة على النبي/ }).click()
    await page.getByRole('button', { name: 'الذكر التالي' }).click()
    await expect(page.getByText(/البخاري \(3370\)/)).toBeVisible()
    await page.goto('/adhkar')
    await page.getByRole('link', { name: /الرقية الشرعية/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('أدعية الشفاء والرقية')
  })

  test('خيار إبقاء الشاشة مضاءة في إعدادات القراءة', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/1')
    await page.getByRole('button', { name: 'الإعدادات' }).click()
    const sw = page.getByRole('dialog').getByRole('switch', { name: 'إبقاء الشاشة مضاءة أثناء القراءة' })
    await expect(sw).toBeChecked()
    await sw.uncheck()
    await page.reload()
    await page.getByRole('button', { name: 'الإعدادات' }).click()
    await expect(page.getByRole('dialog').getByRole('switch', { name: 'إبقاء الشاشة مضاءة أثناء القراءة' })).not.toBeChecked()
  })
})

test.describe('صوت الأذان', () => {
  test('تنزيل أذان منصور الزهراني من الإنترنت واختياره لتنبيه الصلاة', async ({ page }) => {
    const big = Buffer.concat(Array.from({ length: 4 }, () => TONE))
    await page.route(/cdn\.aladhan\.com/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: big, headers: { 'access-control-allow-origin': '*' } }))
    await page.goto('/reminders')
    await page.getByRole('button', { name: 'تنزيل أذان منصور الزهراني' }).click()
    await expect(page.getByRole('radio', { name: /من جهازي: منصور الزهراني\.mp3/ })).toBeChecked()
  })
  test('اختيار ملف أذان من الجهاز وتجربته، ويبقى بعد إعادة التحميل', async ({ page }) => {
    await page.goto('/reminders')
    await expect(page.getByRole('radio', { name: /نغمة الإشعار فقط/ })).toBeChecked()
    await page.getByLabel('استيراد صوت أذان من الجهاز').setInputFiles({ name: 'my-adhan.mp3', mimeType: 'audio/mpeg', buffer: TONE })
    await expect(page.getByRole('radio', { name: /من جهازي: my-adhan.mp3/ })).toBeChecked()
    await page.getByRole('button', { name: /تجربة من جهازي/ }).click()
    await page.reload()
    await expect(page.getByRole('radio', { name: /من جهازي: my-adhan.mp3/ })).toBeChecked()
    await page.getByLabel('صوت أذان الفجر').selectOption('tone')
    await page.reload()
    await expect(page.getByLabel('صوت أذان الفجر')).toHaveValue('tone')
    await page.getByRole('button', { name: 'حذف الصوت المستورد' }).click()
    await expect(page.getByRole('radio', { name: /نغمة الإشعار فقط/ })).toBeChecked()
  })

  test('يُرفع الأذان داخل التطبيق عند دخول وقت العصر في نابلس ويمكن إيقافه', async ({ page }) => {
    await page.route('**/*.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: TONE }))
    // العصر في نابلس يوم 20 أكتوبر 2026 (رابطة العالم الإسلامي) 3:35 م = 12:35 UTC
    await page.clock.install({ time: new Date('2026-10-20T12:34:30Z') })
    await chooseCity(page, 'نابلس', /نابلس، فلسطين/)
    await page.goto('/prayer')
    await expect(page.locator('.prayer-row', { hasText: 'العصر' })).toContainText('3:35')
    await page.goto('/reminders')
    await page.getByLabel('استيراد صوت أذان من الجهاز').setInputFiles({ name: 'adhan.mp3', mimeType: 'audio/mpeg', buffer: TONE })
    await expect(page.getByRole('radio', { name: /من جهازي: adhan.mp3/ })).toBeChecked()
    await page.goto('/')
    await expect(page.getByRole('alertdialog', { name: 'الأذان' })).toHaveCount(0)
    await page.clock.runFor(40_000)
    const alarm = page.getByRole('alertdialog', { name: 'الأذان' })
    await expect(alarm).toContainText('حان الآن وقت صلاة العصر')
    await alarm.getByRole('button', { name: 'إيقاف الأذان' }).click()
    await expect(alarm).toHaveCount(0)
    // لا يتكرر لنفس الصلاة
    await page.clock.runFor(10_000)
    await expect(page.getByRole('alertdialog', { name: 'الأذان' })).toHaveCount(0)
  })

  test('لا أذان داخل التطبيق إذا كان الاختيار «نغمة الإشعار فقط»', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-20T12:34:30Z') })
    await chooseCity(page, 'نابلس', /نابلس، فلسطين/)
    await page.goto('/')
    await page.clock.runFor(40_000)
    await expect(page.getByRole('alertdialog', { name: 'الأذان' })).toHaveCount(0)
  })
})

test.describe('استوديو التصاميم', () => {
  test.use({ serviceWorkers: 'block' })

  test('تصميم صورة لآيات من المصحف بخط محمّل لكل الحروف، وتغيير المقاس والخلفية', async ({ page }) => {
    await page.goto('/studio?s=18&a=1&to=4')
    const canvas = page.getByRole('img', { name: /معاينة التصميم: سورة الكهف • الآيات ١–٤/ })
    await expect(canvas).toBeVisible()
    // كل حروف الآيات لها خط محمّل (لا حروف ساقطة من الصورة)
    await expect.poll(() => page.evaluate(async () => {
      const r = await fetch('/data/quran/quran.json').then((x) => x.json())
      const text = (r.verses?.[17] ?? r[17]).slice(0, 4).join(' ')
      return document.fonts.check('64px "Amiri Quran"', text)
    })).toBe(true)
    await page.getByRole('radio', { name: /طولي/ }).click()
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => `${c.width}x${c.height}`)).toBe('1080x1920')
    await page.getByRole('radio', { name: 'عاجي' }).click()
    // نطاق الآيات لا يتجاوز الحد ولا ينعكس
    await page.getByLabel('من الآية').selectOption('10')
    await expect(page.getByLabel('إلى الآية')).toHaveValue('10')
    await expect(page.getByRole('button', { name: 'مشاركة الصورة' })).toBeEnabled()
  })

  test('النص الطويل لا يُقتص: يُطلب تقليل الآيات', async ({ page }) => {
    // أطول 15 آية متتالية في البقرة لا تتسع في مقاس عرضي بخط مقروء
    await page.goto('/studio?s=2&a=270&to=284')
    await page.getByRole('radio', { name: /عرضي/ }).click()
    await expect(page.getByRole('alert')).toContainText('قلّل عدد الآيات')
    await expect(page.getByRole('button', { name: 'مشاركة الصورة' })).toBeDisabled()
  })

  test('إنشاء فيديو لآيتين بصوت القارئ', async ({ page }) => {
    await page.route(/everyayah\.com|cdn\.islamic\.network/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: TONE, headers: { 'access-control-allow-origin': '*' } }))
    await page.goto('/studio?mode=video&s=112&a=1&to=2')
    await page.getByRole('button', { name: 'إنشاء الفيديو' }).click()
    const video = page.getByLabel('الفيديو الناتج')
    await expect(video).toBeVisible({ timeout: 20_000 })
    const size = await video.evaluate(async (v: HTMLVideoElement) => (await fetch(v.src).then((r) => r.blob())).size)
    expect(size).toBeGreaterThan(10_000)
    await expect(page.getByRole('button', { name: 'مشاركة الفيديو' })).toBeVisible()
  })

  test('من قائمة الآية في القارئ إلى الاستوديو', async ({ page }) => {
    await useFlowReader(page)
    await page.goto('/quran/112')
    await page.locator('#ayah-2').click()
    await page.getByRole('dialog').getByRole('button', { name: 'تصميم صورة' }).click()
    await expect(page.getByRole('img', { name: /سورة الإخلاص • الآية ٢/ })).toBeVisible()
  })
})

test.describe('البحث بالصوت والسمة الذهبية', () => {
  test('قراءة جزء من آية الكرسي بالصوت تجد الآية وتفتحها', async ({ page }) => {
    await useFlowReader(page)
    // محاكاة خدمة التعرف على الكلام في المتصفح بما «سمعته» من المستخدم (إملاء حديث بلا تشكيل)
    await page.addInitScript(() => {
      class FakeSR {
        lang = ''; interimResults = false; maxAlternatives = 1; continuous = false
        onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null
        start() { setTimeout(() => { this.onresult?.({ results: [[{ transcript: 'الله لا اله الا هو الحي القيوم' }, { transcript: 'الله لا اله' }]] }); this.onend?.() }, 300) }
        stop() { this.onend?.() } abort() {}
      }
      const w = window as unknown as Record<string, unknown>
      w.SpeechRecognition = FakeSR
      w.webkitSpeechRecognition = FakeSR
    })
    await page.goto('/quran')
    await page.getByRole('button', { name: 'البحث عن آية بالصوت' }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toContainText('سمعتُ: «الله لا اله الا هو الحي القيوم»')
    // العبارة نفسها هي آل عمران 2 كاملة وبداية آية الكرسي: تظهر الاثنتان أولًا
    await expect(sheet.getByRole('link').nth(0)).toContainText('سورة آل عمران — الآية ٢')
    await expect(sheet.getByRole('link').nth(1)).toContainText('سورة البقرة — الآية ٢٥٥')
    await sheet.getByRole('link', { name: /سورة البقرة — الآية ٢٥٥/ }).click()
    await expect(page).toHaveURL(/\/quran\/2\?ayah=255/)
  })

  test('متصفح بلا دعم للتعرف على الكلام: رسالة واضحة', async ({ page }) => {
    await page.addInitScript(() => { delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition; delete (window as unknown as Record<string, unknown>).SpeechRecognition })
    await page.goto('/search')
    await page.getByRole('button', { name: 'البحث عن آية بالصوت' }).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('لا يدعم البحث بالصوت')
  })

  test('سمة أسود وذهبي تُطبّق وتبقى بعد إعادة التحميل', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('المظهر').selectOption('gold')
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'gold')
    await expect.poll(() => savedSetting(page, 'theme')).toBe('gold')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'gold')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe('rgb(10, 10, 10)')
    await page.getByLabel('المظهر').selectOption('light')
    await expect(page.locator('html')).not.toHaveAttribute('data-accent', 'gold')
  })
})

test.describe('الاستوديو 0.8: البحث عن الآية وفيديو من الجهاز', () => {
  test.use({ serviceWorkers: 'block' })

  test('البحث عن الآية بالكتابة داخل الاستوديو واختيارها', async ({ page }) => {
    await page.goto('/studio?mode=video')
    await page.getByLabel('ابحث عن الآية بكتابة جزء منها').fill('الحي القيوم لا تاخذه سنه')
    const hits = page.getByRole('list', { name: 'نتائج البحث عن الآية' })
    await hits.getByRole('listitem').filter({ hasText: 'سورة البقرة — الآية ٢٥٥' }).click()
    await expect(page.getByRole('combobox', { name: /^السورة/ })).toHaveValue('2')
    await expect(page.getByLabel('من الآية')).toHaveValue('255')
    await expect(page.getByLabel('إلى الآية')).toHaveValue('255')
  })

  test('فيديو من جهاز المستخدم بلا صوته الأصلي وعليه الآية — بلا تلاوة ومع تلاوة', async ({ page }) => {
    await page.route(/everyayah\.com|cdn\.islamic\.network/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: TONE, headers: { 'access-control-allow-origin': '*' } }))
    await page.goto('/studio?mode=video&s=112&a=1&to=2')
    await page.getByLabel('اختيار فيديو من الجهاز').setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: CLIP })
    await expect(page.getByText(/فيديو من جهازك \(3 ث\) — يُكتم صوته الأصلي دائمًا/)).toBeVisible()
    await expect(page.getByRole('radio', { name: 'فيديو من جهازي' })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('switch', { name: 'إضافة صوت التلاوة' }).or(page.getByLabel('إضافة صوت التلاوة')).first().uncheck()
    await expect(page.getByText(/فوق الفيديو الذي اخترته، بلا صوت/)).toBeVisible()
    await page.getByRole('button', { name: 'إنشاء الفيديو' }).click()
    const out = page.getByLabel('الفيديو الناتج')
    await expect(out).toBeVisible({ timeout: 25_000 })
    expect(await out.evaluate(async (v: HTMLVideoElement) => (await fetch(v.src).then((r) => r.blob())).size)).toBeGreaterThan(5_000)
    // مع التلاوة
    await page.getByRole('button', { name: 'فيديو جديد' }).click()
    await page.getByLabel('إضافة صوت التلاوة').check()
    await page.getByRole('button', { name: 'إنشاء الفيديو' }).click()
    await expect(page.getByLabel('الفيديو الناتج')).toBeVisible({ timeout: 25_000 })
  })

  test('نافذة البحث بالصوت فيها بحث مكتوب بديل', async ({ page }) => {
    await page.addInitScript(() => { const w = window as unknown as Record<string, unknown>; delete w.webkitSpeechRecognition; delete w.SpeechRecognition })
    await page.goto('/quran')
    await page.getByRole('button', { name: 'البحث عن آية بالصوت' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('اكتب جزءًا من الآية').fill('انا اعطيناك الكوثر')
    await sheet.getByRole('link', { name: /سورة الكوثر — الآية ١/ }).click()
    // يُفتح المصحف على صفحة الآية (الكوثر في الصفحة 602)
    await expect(page).toHaveURL(/\/(quran\/108\?ayah=1|mushaf\/602\?s=108&a=1)/)
  })
})

test.describe('جهاز بمنطقة زمنية مختلفة', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })
  test('مستخدم جهازه على توقيت لوس أنجلوس ومدينته نابلس: المواقيت والعدّاد بتوقيت نابلس', async ({ page }) => {
    // 12:34:30 بتوقيت UTC = 3:34 م في نابلس = 5:34 ص في لوس أنجلوس
    await page.clock.install({ time: new Date('2026-10-20T12:34:30Z') })
    await chooseCity(page, 'نابلس', /نابلس، فلسطين/)
    await page.goto('/prayer')
    await expect(page.locator('.prayer-row', { hasText: 'العصر' })).toContainText('3:35')
    await expect(page.locator('.prayer-row.next')).toContainText('العصر')
    await expect(page.getByLabel('الوقت المتبقي')).toHaveText(/^00:00:[0-3]\d$/)
  })
})

test.describe('المساجد القريبة', () => {
  test.use({ geolocation: { latitude: 32.2211, longitude: 35.2544 }, permissions: ['geolocation'], serviceWorkers: 'block' })
  const OSM = { elements: [
    { type: 'node', id: 11, lat: 32.2290, lon: 35.2544, tags: { name: 'المسجد البعيد' } },
    { type: 'way', id: 22, center: { lat: 32.2221, lon: 35.2544 }, tags: { 'name:ar': 'المسجد القريب', name: 'Near Mosque' } },
  ] }

  test('البحث حول الموقع: ترتيب بالمسافة والاتجاه ورابط المسار ومصدر البيانات', async ({ page }) => {
    let query = ''
    await page.route(/overpass/, (r) => { query = decodeURIComponent(r.request().postData() ?? ''); return r.fulfill({ json: OSM, headers: { 'access-control-allow-origin': '*' } }) })
    await page.goto('/mosques')
    await page.getByRole('button', { name: 'ابحث حول موقعي' }).click()
    const list = page.getByRole('list', { name: 'المساجد' })
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await expect(list.getByRole('listitem').first()).toContainText('المسجد القريب')
    await expect(list.getByRole('listitem').first()).toContainText('110 م • باتجاه الشمال')
    await expect(list.getByRole('link', { name: 'المسار إلى المسجد القريب' })).toHaveAttribute('href', /google\.com\/maps\/dir\/\?api=1&destination=32\.2221,35\.2544/)
    expect(query).toContain('"religion"="muslim"')
    await expect(page.getByText(/مساهمي OpenStreetMap/)).toBeVisible()
    await expect(page.getByText(/لا تتضمن أوقات فتح المساجد/)).toBeVisible()
    // النتيجة الأخيرة محفوظة للعرض دون اتصال
    await page.reload()
    await expect(page.getByText(/نتائج محفوظة من/)).toBeVisible()
  })

  test('فشل الخوادم: رسالة واضحة دون نتائج مختلقة، وكل الخوادم البديلة تُجرَّب بطلب POST', async ({ page }) => {
    const hosts: string[] = []
    await page.route(/overpass/, (r) => { hosts.push(`${r.request().method()} ${new URL(r.request().url()).host}`); return r.fulfill({ status: 503, body: 'busy' }) })
    await page.goto('/mosques')
    await page.getByRole('button', { name: 'ابحث حول موقعي' }).click()
    await expect(page.getByRole('alert')).toContainText('تأخر خادم الخرائط في الرد')
    await expect(page.getByRole('list', { name: 'المساجد' })).toHaveCount(0)
    expect(hosts).toEqual(['POST overpass-api.de', 'POST overpass.private.coffee', 'POST overpass.kumi.systems'])
  })

  test('فشل البحث بعد نجاح سابق: تُعرض آخر نتائج محفوظة مع توضيح، وإعادة المحاولة تنجح', async ({ page }) => {
    let fail = false
    await page.route(/overpass/, (r) => (fail ? r.fulfill({ status: 429, body: 'rate' }) : r.fulfill({ json: OSM, headers: { 'access-control-allow-origin': '*' } })))
    await page.goto('/mosques')
    await page.getByRole('button', { name: 'ابحث حول موقعي' }).click()
    await expect(page.getByRole('list', { name: 'المساجد' }).getByRole('listitem')).toHaveCount(2)
    fail = true
    await page.getByRole('button', { name: 'ابحث حول موقعي' }).click()
    await expect(page.getByRole('alert')).toContainText('مزدحمة الآن')
    await expect(page.getByText(/نتائج محفوظة من/)).toBeVisible()
    await expect(page.getByRole('list', { name: 'المساجد' }).getByRole('listitem')).toHaveCount(2)
    fail = false
    await page.getByRole('alert').getByRole('button', { name: /إعادة المحاولة/ }).click()
    await expect(page.getByText(/نتائج محفوظة من/)).toHaveCount(0)
  })
})

test.describe('0.9: الملخص الأسبوعي وهدف الأسبوع', () => {
  test('ملخص الرئيسية بين اليوم والأسبوع، وهدف الأسبوع في الختمة', async ({ page }) => {
    await page.goto('/')
    const period = page.getByRole('radiogroup', { name: 'فترة الملخص' })
    await period.getByRole('radio', { name: 'الأسبوع' }).click()
    await expect(page.getByRole('heading', { name: 'إنجاز الأسبوع' })).toBeVisible()
    await expect(page.getByText('أيام نشاط')).toBeVisible()
    await page.goto('/wird')
    await page.getByRole('button', { name: 'ختمة جديدة' }).click()
    await page.getByRole('button', { name: '30 يومًا' }).click()
    await page.getByRole('button', { name: 'بدء الختمة' }).click()
    await page.getByRole('button', { name: 'قرأت ورد اليوم' }).click()
    const goal = page.getByLabel('هدف الأسبوع', { exact: true })
    await expect(goal).toContainText('آخر 7 أيام: 21 من نحو')
    await expect(goal).toContainText('1 من 7 أيام')
  })

  test('الفاصل بين تكرارات الآية في صفحة الاستماع', async ({ page }) => {
    await page.route(/everyayah\.com|cdn\.islamic\.network/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: TONE }))
    await page.goto('/listen')
    await page.getByLabel('السورة').selectOption('112')
    await page.getByRole('button', { name: /تشغيل سورة الإخلاص/ }).click()
    const gap = page.getByLabel('الفاصل بين التكرارات')
    await expect(gap).toBeDisabled()
    await page.getByLabel(/تكرار كل آية/).selectOption('3')
    await expect(gap).toBeEnabled()
    await gap.selectOption('2')
    await expect(gap).toHaveValue('2')
  })
})

test.describe('1.0: الختمة الذكية والأحاديث وبطاقات الاستوديو والتخصيص', () => {
  test.use({ serviceWorkers: 'block' })

  test('ختمة بالوقت المتاح يوميًا: تحويل الدقائق إلى صفحات وعرض الجزء الحالي', async ({ page }) => {
    await page.goto('/wird')
    await page.getByRole('button', { name: 'ختمة جديدة' }).click()
    await page.getByRole('radio', { name: 'بالوقت المتاح يوميًا' }).click()
    await page.getByLabel('الدقائق المتاحة يوميًا').fill('20')
    await page.getByLabel('البدء من الصفحة').fill('45')
    await expect(page.getByText(/نحو 10 صفحات يوميًا/)).toBeVisible()
    await page.getByRole('button', { name: 'بدء الختمة' }).click()
    await expect(page.getByText('ورد اليوم: الصفحات 45–54')).toBeVisible()
    await expect(page.getByText('الجزء الحالي: 3 • تم 2 من 30 جزءًا')).toBeVisible()
  })

  test('مكتبة الأحاديث: كل حديث بتخريجه من الصحيحين، وتظهر في البحث', async ({ page }) => {
    await page.goto('/hadith')
    await page.getByRole('link', { name: /أحاديث جامعة/ }).click()
    await expect(page.getByText('متفق عليه: البخاري (1) ومسلم (1907)')).toBeVisible()
    await page.goto('/search?q=' + encodeURIComponent('النصيحة'))
    await expect(page.getByText(/الأحاديث \(\d+\)/)).toBeVisible()
  })

  test('بطاقة حديث في الاستوديو بخط النسخ ومصدرها، وحفظها في «تصاميمي»', async ({ page }) => {
    await page.goto('/studio')
    await page.getByRole('radio', { name: 'حديث' }).click()
    await expect(page.getByRole('img', { name: 'معاينة التصميم: متفق عليه: البخاري (1) ومسلم (1907)' })).toBeVisible()
    await page.getByLabel('القسم').selectOption({ label: 'المعاملات' })
    await expect(page.getByRole('img', { name: /معاينة التصميم: متفق عليه: البخاري \(2079\)/ })).toBeVisible()
    await page.getByRole('button', { name: 'حفظ التصميم' }).click()
    const list = page.getByRole('list', { name: 'تصاميمي' })
    await expect(list.getByRole('button', { name: /^المعاملات:/ })).toBeVisible()
    // العودة إلى آية ثم فتح التصميم المحفوظ يعيد الحديث نفسه
    await page.getByRole('radio', { name: 'آية' }).click()
    await expect(page.getByRole('img', { name: /معاينة التصميم: سورة الفاتحة/ })).toBeVisible()
    await page.reload()
    await page.getByRole('list', { name: 'تصاميمي' }).getByRole('button', { name: /^المعاملات:/ }).click()
    await expect(page.getByRole('img', { name: /البخاري \(2079\)/ })).toBeVisible()
    await page.getByRole('button', { name: /^حذف التصميم/ }).click()
    await expect(page.getByRole('list', { name: 'تصاميمي' })).toHaveCount(0)
  })

  test('التحية بالاسم واقتراح اليوم وجرس كل صلاة وبطاقة القبلة', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /^اقتراح اليوم:/ })).toBeVisible()
    await page.getByRole('button', { name: 'تخصيص الرئيسية' }).click()
    await page.getByLabel(/اسمك للتحية/).fill('أحمد')
    await expect.poll(() => savedSetting(page, 'displayName')).toBe('أحمد')
    await page.reload()
    await expect(page.getByText('السلام عليكم، أحمد')).toBeVisible()
    await chooseCity(page, 'نابلس', /نابلس، فلسطين/)
    const bell = page.getByRole('button', { name: 'تنبيه العصر' })
    const was = await bell.getAttribute('aria-pressed')
    await bell.click()
    await expect(bell).toHaveAttribute('aria-pressed', was === 'true' ? 'false' : 'true')
    await expect(page.getByRole('link', { name: /^اتجاه القبلة \d+ درجة/ })).toBeVisible()
  })
})

test.describe('1.0: المساعد والمساجد المفضلة والمتابعة والمقارنة بالتقويم الرسمي', () => {
  test.use({ serviceWorkers: 'block' })

  test('المساعد يعرض نصوصًا موثقة بمصادرها دون توليد، وينبّه في أسئلة الأحكام', async ({ page }) => {
    const external: string[] = []
    page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') external.push(r.url()) })
    await page.goto('/assistant')
    await page.getByLabel('سؤالك للمساعد').fill('ما فضل صلاة الجماعة؟')
    await page.getByRole('button', { name: 'ابحث', exact: true }).click()
    const hadith = page.getByRole('region', { name: 'أحاديث متعلقة' })
    await expect(hadith).toContainText('صَلَاةُ الْجَمَاعَةِ تَفْضُلُ')
    await expect(hadith).toContainText('البخاري (645) ومسلم (650)')
    await expect(page.getByRole('region', { name: 'أقسام مقترحة' }).getByRole('link', { name: 'أحاديث الطهارة والصلاة' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'آيات متعلقة' }).getByRole('link', { name: /^تفسير / }).first()).toBeVisible()
    await page.getByLabel('سؤالك للمساعد').fill('هل يجوز الجمع بين الصلاتين')
    await page.getByRole('button', { name: 'ابحث', exact: true }).click()
    await expect(page.getByRole('note')).toContainText('لا يُصدر فتاوى')
    expect(external).toEqual([])
  })

  test('المساجد: الرادار والمفضلة والبحث في مدينة أخرى', async ({ page }) => {
    const OSM = { elements: [{ type: 'way', id: 22, center: { lat: 32.2221, lon: 35.2544 }, tags: { 'name:ar': 'المسجد القريب' } }] }
    let query = ''
    await page.route(/overpass/, (r) => { query = decodeURIComponent(r.request().postData() ?? ''); return r.fulfill({ json: OSM, headers: { 'access-control-allow-origin': '*' } }) })
    await page.goto('/mosques')
    await page.getByLabel('البحث عن المساجد في مدينة').fill('نابلس')
    await page.getByRole('button', { name: /نابلس، فلسطين/ }).first().click()
    await expect(page.getByRole('img', { name: /رادار المساجد: 1 مسجدًا/ })).toBeVisible()
    expect(query).toMatch(/around:\d+,32\.2\d*,35\.2\d*/)
    await page.getByRole('button', { name: 'إضافة المسجد القريب إلى المفضلة' }).click()
    const favs = page.getByRole('list', { name: 'مساجدي المفضلة' })
    await expect(favs).toContainText('المسجد القريب')
    await page.reload()
    await expect(page.getByRole('list', { name: 'مساجدي المفضلة' })).toContainText('المسجد القريب')
    await page.getByRole('list', { name: 'مساجدي المفضلة' }).getByRole('button', { name: 'إزالة المسجد القريب من المفضلة' }).click()
    await expect(page.getByRole('list', { name: 'مساجدي المفضلة' })).toHaveCount(0)
  })

  test('إيقاف متابعة رحلتي الإيمانية: لا يُسجَّل نشاط جديد، والختمة تتقدم', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('switch', { name: 'متابعة رحلتي الإيمانية' }).uncheck()
    await expect.poll(() => savedSetting(page, 'trackActivity')).toBe(false)
    await page.goto('/wird')
    await page.getByRole('button', { name: 'ختمة جديدة' }).click()
    await page.getByRole('button', { name: '30 يومًا' }).click()
    await page.getByRole('button', { name: 'بدء الختمة' }).click()
    await page.getByRole('button', { name: 'قرأت ورد اليوم' }).click()
    await expect(page.getByText(/أتممت ورد اليوم/)).toBeVisible()
    await page.goto('/progress')
    await expect(page.getByText('متابعة رحلتي الإيمانية متوقفة')).toBeVisible()
    await expect(page.locator('.stat').filter({ hasText: 'صفحات مختلفة' }).locator('b')).toHaveText('0')
  })

  test('مقارنة المواقيت بالتقويم الرسمي وتطبيق الفرق', async ({ page }) => {
    await chooseCity(page, 'نابلس', /نابلس، فلسطين/)
    await page.goto('/settings')
    await page.getByText('مقارنة بالتقويم الرسمي').click()
    const row = page.locator('.compare-table tr').filter({ hasText: 'الفجر' })
    const appTime = (await row.locator('td').nth(1).innerText()).match(/(\d+):(\d+)/)!
    const total = Number(appTime[1]) * 60 + Number(appTime[2]) + 3
    const hm = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    await page.getByLabel('التوقيت الرسمي: الفجر').fill(hm)
    await expect(page.getByLabel('الفرق: الفجر')).toHaveText('+3 د')
    await page.getByRole('button', { name: 'تطبيق الفروق كتعديلات' }).click()
    await expect.poll(async () => ((await savedSetting(page, 'prayer')) as { adjustments: Record<string, number> }).adjustments.fajr).toBe(3)
  })
})

test.describe('1.0: تنبيه الأذكار وإضافة ذكر وتكبير المصحف', () => {
  test.use({ serviceWorkers: 'block' })

  test('شاشة تنبيه الأذكار: كاملة، وتتنقل بين الأذكار، وتفتح الجلسة', async ({ page }) => {
    await page.addInitScript(() => { const w = window as unknown as { speechSynthesis?: { speak: (u: { onend?: () => void }) => void } }; if (w.speechSynthesis) w.speechSynthesis.speak = (u) => setTimeout(() => u.onend?.(), 50) })
    await page.route(/everyayah\.com|cdn\.islamic\.network/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: TONE, headers: { 'access-control-allow-origin': '*' } }))
    await page.goto('/adhkar-alert/morning')
    const dlg = page.getByRole('dialog', { name: 'تنبيه أذكار الصباح' })
    await expect(dlg).toBeVisible()
    await dlg.getByRole('button', { name: 'إيقاف الصوت' }).click()
    await dlg.getByRole('button', { name: 'الذكر التالي' }).click()
    await expect(dlg.getByText(/^2 من \d+$/)).toBeVisible()
    await dlg.getByRole('button', { name: 'إيقاف الصوت' }).click()
    await dlg.getByRole('link', { name: 'فتح الأذكار بالعدّاد' }).click()
    await expect(page).toHaveURL(/\/adhkar\/morning$/)
  })

  test('زر «إضافة ذكر» في الأذكار يفتح نموذج الذكر الشخصي', async ({ page }) => {
    await page.goto('/adhkar')
    await page.getByRole('link', { name: /^إضافة ذكر/ }).click()
    await expect(page).toHaveURL(/\/my-adhkar\?new=1/)
    await page.getByLabel('نص الذكر').fill('اللهم اغفر لوالديّ')
    await page.getByRole('button', { name: /حفظ/ }).first().click()
    await expect(page.getByText('اللهم اغفر لوالديّ')).toBeVisible()
  })

  test('المصحف بالصفحة الكاملة: التكبير والتصغير مع التمرير', async ({ page }) => {
    await page.goto('/mushaf/445')
    await expect(page.getByRole('article', { name: 'الصفحة 445' })).toBeVisible()
    await page.getByRole('button', { name: 'أدوات القراءة' }).click()
    await page.getByRole('button', { name: 'تكبير الصفحة' }).click()
    await page.getByRole('button', { name: 'تكبير الصفحة' }).click()
    await expect(page.getByText('150٪')).toBeVisible()
    await expect(page.locator('.mp-content')).toHaveClass(/zoomed/)
    const scrollable = await page.locator('.mp-content').evaluate((el) => el.scrollHeight > el.clientHeight)
    expect(scrollable).toBe(true)
    await page.getByRole('button', { name: 'تصغير الصفحة' }).click()
    await page.getByRole('button', { name: 'تصغير الصفحة' }).click()
    await expect(page.locator('.mp-content')).not.toHaveClass(/zoomed/)
  })
})
