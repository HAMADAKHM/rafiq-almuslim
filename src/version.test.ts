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
    const [maj, min, pat] = APP_VERSION.split('.').map(Number)
    // رمز الإصدار يزيد مع كل إصدار (0.9.0 → 9، 1.0.0 → 100)
    expect(Number(gradle.match(/versionCode (\d+)/)![1])).toBe(maj * 100 + min * (maj ? 10 : 1) + pat)
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj')
    const mv = [...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1])
    expect(mv.length).toBeGreaterThan(0)
    expect(new Set(mv)).toEqual(new Set([APP_VERSION]))
    expect(read('CHANGELOG.md')).toContain(`## ${APP_VERSION}`)
  })
})
