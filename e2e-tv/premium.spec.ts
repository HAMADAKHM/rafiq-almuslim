// شاشة التلفاز: نسخة بريميوم تضيف جداول العرض وحماية الشاشة وإضافات التلاوة، والنسخة الجديدة كما هي
import { expect, test, type Page } from '@playwright/test'

const CITY = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' }
const rule = (id: string, when: unknown, scene: string, galleryCat = 'all') => ({ id, on: true, when, show: { scene, galleryCat } })

async function open(page: Page, url: string, settings: Record<string, unknown> | null, at: string) {
  await page.clock.install({ time: new Date(at) })
  await page.addInitScript((s) => { if (s) localStorage.setItem('rafiq-tv:settings', JSON.stringify(s)) }, settings)
  await page.goto(url)
}

const base = (premium: Record<string, unknown>) => ({ city: CITY, scene: 'rotate', animate: true, premium })

test('النسخة الجديدة لا تتغير: لا صفحات بريميوم، والمشهد كما اختاره المستخدم', async ({ page }) => {
  await open(page, '/tv.html', base({ schedule: { on: true, rules: [rule('n', { kind: 'night' }, 'kaaba')] } }), '2026-11-08T21:00:00+02:00')
  await expect(page.locator('.tv-clock')).toBeVisible()
  await expect(page.locator('.tv-art-wrap')).toHaveAttribute('data-scene', 'rotate:all')
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await expect(page.getByRole('button', { name: /جداول العرض/ })).toHaveCount(0)
})

test('جداول العرض: الليل يعرض مشهده، والنهار يعود للمشهد المختار، والجمعة تتقدم على الساعات', async ({ page }) => {
  const s = base({ schedule: { on: true, rules: [rule('h', { kind: 'hours', from: 6, to: 18 }, 'gallery', 'nature'), rule('f', { kind: 'weekday', days: [5] }, 'madinah'), rule('n', { kind: 'night' }, 'kaaba')] } })
  await open(page, '/tv.html?ed=premium', s, '2026-11-08T21:00:00+02:00')
  await expect(page.locator('.tv-art-wrap')).toHaveAttribute('data-scene', 'kaaba:all')
  await page.clock.setFixedTime(new Date('2026-11-08T10:00:00+02:00'))
  await expect(page.locator('.tv-art-wrap')).toHaveAttribute('data-scene', 'gallery:nature', { timeout: 5000 })
  await page.clock.setFixedTime(new Date('2026-11-13T10:00:00+02:00'))
  await expect(page.locator('.tv-art-wrap')).toHaveAttribute('data-scene', 'madinah:all', { timeout: 5000 })
  await expect(page.locator('.tv-art-wrap')).toHaveClass(/tr-fade/)
})

test('حماية الشاشة: إزاحة العناصر وتعتيم الليل', async ({ page }) => {
  await open(page, '/tv.html?ed=premium', base({ oled: { shift: true, dim: true, dimLevel: 0.35 } }), '2026-11-08T23:00:00+02:00')
  await expect(page.locator('.tv-dim')).toHaveCSS('opacity', '0.35')
  const sx = await page.locator('.tv').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--sx'))
  expect(sx).toMatch(/vw$/)
  await page.clock.setFixedTime(new Date('2026-11-08T12:00:00+02:00'))
  await expect(page.locator('.tv-dim')).toHaveCount(0, { timeout: 5000 })
})

test('إعدادات بريميوم بجهاز التحكم: إضافة جدول، والقراء المفضلون، وقائمة السور، ثم الحفظ', async ({ page }) => {
  await open(page, '/tv.html?ed=premium', base({}), '2026-11-08T10:00:00+02:00')
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  // لا زر «الإهداء» في الإعدادات (أُلغي بطلب صاحب التطبيق)
  await expect(page.getByRole('button', { name: /الإهداء/ })).toHaveCount(0)
  await page.getByRole('button', { name: /جداول العرض/ }).click()
  await page.getByRole('button', { name: '+ يوم الجمعة' }).click()
  await expect(page.locator('.tv-rule')).toHaveCount(1)
  await expect(page.locator('.tv-rule-head')).toContainText('الجمعة')
  await page.getByRole('button', { name: /حماية الشاشة/ }).click()
  await page.getByRole('switch', { name: /تخفيض الإضاءة ليلًا/ }).click()
  await page.getByRole('button', { name: /القارئ والصوت/ }).click()
  await page.getByRole('checkbox', { name: /المنشاوي/ }).first().click()
  await page.getByRole('radio', { name: '×1.25' }).click()
  await page.getByRole('button', { name: /القراءة/ }).first().click()
  await page.getByRole('button', { name: '+ الكهف' }).click()
  await page.getByRole('button', { name: /حفظ وعرض الشاشة/ }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rafiq-tv:settings') || '{}').premium)
  expect(saved.schedule.rules).toHaveLength(1)
  expect(saved.oled.dim).toBe(true)
  expect(saved.quran.speed).toBe(1.25)
  expect(saved.quran.playlist).toContain(18)
  expect(saved.quran.fav.length).toBe(1)
})

test('سرعة التلاوة تُطبَّق على ملف الآية، والآية واسم السورة ظاهران، وقائمة السور تحدد التالية', async ({ page }) => {
  const { readFileSync } = await import('node:fs')
  const mp3 = readFileSync('public/sounds/studio/' + (await import('node:fs')).readdirSync('public/sounds/studio').find((f) => f.endsWith('.mp3'))!)
  await page.route(/\.mp3(\?|$)/, (r) => r.fulfill({ body: mp3, contentType: 'audio/mpeg' }))
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () { (window as unknown as { __rates: number[] }).__rates = [...((window as unknown as { __rates?: number[] }).__rates ?? []), this.playbackRate]; return play.call(this) }
  })
  await open(page, '/tv.html?ed=premium&app=1', { ...base({ quran: { speed: 1.25, playlist: [112, 1], fav: [] } }), reciteOn: true, reciteMode: 'surah', reciteSurah: 112 }, '2026-11-08T10:00:00+02:00')
  await expect(page.locator('.tv-card.playing .tv-card-ref')).toContainText('سورة الإخلاص', { timeout: 15000 })
  await expect.poll(() => page.evaluate(() => (window as unknown as { __rates?: number[] }).__rates ?? []), { timeout: 15000 }).toContain(1.25)
  // بعد ختم الإخلاص: التالية من قائمة التشغيل (الفاتحة) لا الفلق
  await expect(page.locator('.tv-card.playing .tv-card-ref')).toContainText('سورة الفاتحة', { timeout: 40000 })
})
