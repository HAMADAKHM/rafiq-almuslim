import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { APP_VERSION } from './version'

const root = path.resolve(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

describe('اتساق رقم الإصدار', () => {
  it('package.json وAndroid وiOS والتطبيق على الرقم نفسه', () => {
    expect(JSON.parse(read('package.json')).version).toBe(APP_VERSION)
    const gradle = read('android/app/build.gradle')
    expect(gradle).toContain(`versionName "${APP_VERSION}"`)
    const [core, pre] = APP_VERSION.split('-')
    const [maj, min, pat] = core.split('.').map(Number)
    // رمز الإصدار يزيد مع كل إصدار (0.9.0 → 9، 1.0.0 → 100)؛
    // والنسخ التجريبية قبل 1.0.0 (1.0.0-beta.N) تأخذ 90+N لتقع بين 0.x و1.0.0
    const beta = pre?.match(/^beta\.(\d+)$/)
    if (pre) expect(beta, 'صيغة الإصدار التجريبي: X.Y.Z-beta.N').not.toBeNull()
    const code = beta ? 90 + Number(beta[1]) : maj * 100 + min * (maj ? 10 : 1) + pat
    if (beta) expect(core).toBe('1.0.0')
    expect(Number(gradle.match(/versionCode (\d+)/)![1])).toBe(code)
    // iOS يقبل أرقامًا فقط في MARKETING_VERSION: الإصدار الأساسي دون اللاحقة التجريبية
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj')
    const mv = [...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1])
    expect(mv.length).toBeGreaterThan(0)
    expect(new Set(mv)).toEqual(new Set([core]))
    expect(new Set([...pbx.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((m) => Number(m[1])))).toEqual(new Set([code]))
    expect(read('CHANGELOG.md')).toContain(`## ${APP_VERSION}`)
  })
})
