// قواعد الإعلانات الإلزامية: صفحات مسموحة فقط، لا للمشتركين، لا أثناء التلاوة، ولا في صفحات العبادة أبدًا.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { AD_PAGES, NEVER_AD_PREFIXES, adAllowed, bannerUnit, type AdPlacement } from './config'

const free = { entitled: false, audioPlaying: false }

describe('قواعد عرض الإعلان', () => {
  it('يُعرض فقط في صفحته المسموحة لغير المشترك', () => {
    for (const [pl, path] of Object.entries(AD_PAGES) as [AdPlacement, string][]) expect(adAllowed(path, pl, free)).toBe(true)
    expect(adAllowed('/settings', 'more', free)).toBe(false)
  })
  it('لا يُعرض للمشترك الفعّال ولا أثناء تشغيل التلاوة', () => {
    expect(adAllowed('/more', 'more', { entitled: true, audioPlaying: false })).toBe(false)
    expect(adAllowed('/more', 'more', { entitled: false, audioPlaying: true })).toBe(false)
  })
  it('لا يُعرض أبدًا في صفحات العبادة والدفع ولو وُضع خطأً', () => {
    for (const p of ['/quran', '/quran/2', '/mushaf/1', '/adhkar/morning', '/duas', '/listen', '/tasbih', '/stories/yusuf', '/plus', '/adhkar-alert/morning', '/prayer'])
      for (const pl of Object.keys(AD_PAGES) as AdPlacement[]) expect(adAllowed(p, pl, free)).toBe(false)
  })
  it('لا تتقاطع الصفحات المسموحة مع الممنوعة', () => {
    for (const path of Object.values(AD_PAGES)) expect(NEVER_AD_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))).toBe(false)
  })
  it('دون معرّف صاحب التطبيق تُستخدم إعلانات Google التجريبية', () => {
    expect(bannerUnit('android')).toEqual({ id: 'ca-app-pub-3940256099942544/9214589741', testing: true })
  })
  it('لا إعلانات منبثقة أو تكافئية أو عند فتح التطبيق في الكود', () => {
    const files: string[] = []
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f) && !f.includes('.test.')) files.push(p) } }
    walk('src')
    const code = files.map((f) => readFileSync(f, 'utf8')).join('\n')
    expect(code).not.toMatch(/prepareInterstitial|showInterstitial|prepareRewardVideoAd|showRewardVideoAd|prepareRewardInterstitial|AppOpenAd|loadAppOpen/)
    // موضع الإعلان الوحيد AdSlot، ويُستخدم في الصفحات الأربع فقط
    const users = files.filter((f) => readFileSync(f, 'utf8').includes('<AdSlot'))
    expect(users.map((f) => f.replace(/\\/g, '/')).sort()).toEqual(['src/features/calendar/CalendarPage.tsx', 'src/features/more/MorePage.tsx', 'src/features/mosques/MosquesPage.tsx', 'src/features/settings/SettingsPage.tsx'])
  })
})
