// ثيمات الهوية والأيقونات وتصميم الودجت: بيانات متسقة بين الواجهة وملفات Android والأنماط
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { activeSkin, SKINS } from './skins'
import { APP_ICON_IDS, APP_ICONS, aliasOf } from './appIcons'
import { IDENTITY_LOOK } from './IdentityScene'
import { WIDGET_STYLES } from '../features/widgets/WidgetsPage'

const ident = SKINS.filter((s) => s.identity)
const css = readFileSync('src/styles/skins.css', 'utf8')
const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')

describe('ثيمات الهوية', () => {
  it('ثيم مجاني وثمانية لبلس، ولكل منها ألوان كاملة في الأنماط وخلفية مرسومة', () => {
    expect(ident.length).toBe(9)
    expect(ident.filter((s) => s.free).map((s) => s.id)).toEqual(['t-classic'])
    for (const s of ident) {
      const rule = new RegExp(`:root\\[data-skin='${s.id}'\\] \\{([^}]*)\\}`).exec(css)?.[1] ?? ''
      for (const v of ['--bg', '--surface', '--text', '--text-muted', '--primary', '--on-primary', '--border', '--hdr', '--gold']) expect(rule, `${s.id} ${v}`).toContain(`${v}:`)
      expect(IDENTITY_LOOK[s.id as keyof typeof IDENTITY_LOOK]).toBeTruthy()
      expect(s.swatch?.length).toBe(4)
    }
  })
  it('بلس دون اشتراك لا يُطبَّق، والمجاني يُطبَّق، وعند انتهاء الاشتراك يعود الأصلي', () => {
    expect(activeSkin('t-royal', false)).toBeNull()
    expect(activeSkin('t-royal', true)?.id).toBe('t-royal')
    expect(activeSkin('t-classic', false)?.id).toBe('t-classic')
  })
  it('تباين النص مع الخلفية كافٍ لقراءة الآيات (WCAG AA ≥ 4.5)', () => {
    const lum = (h: string) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    for (const s of ident) {
      const [bg, , , text] = s.swatch!
      const [a, b] = [lum(bg), lum(text)].sort((x, y) => y - x)
      expect((a + 0.05) / (b + 0.05), s.id).toBeGreaterThan(4.5)
    }
  })
})

describe('أيقونات التطبيق', () => {
  it('أيقونة لكل ثيم، ولكل بديلة مكوّن في AndroidManifest وملفات بكل الكثافات', () => {
    expect(APP_ICON_IDS.length).toBe(9)
    for (const id of APP_ICON_IDS) {
      expect(manifest, id).toContain(`android:name=".${aliasOf(id)}"`)
      expect(ident.some((s) => s.id === APP_ICONS[id].theme), id).toBe(true)
      for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) for (const f of ['', '_round', '_fg', '_bg']) expect(existsSync(`android/app/src/main/res/mipmap-${d}/ic_alt_${id}${f}.png`), `${d} ${id}${f}`).toBe(true)
      expect(existsSync(`android/app/src/main/res/mipmap-anydpi-v26/ic_alt_${id}.xml`)).toBe(true)
    }
    // واحد فقط مفعّل في الملف (الأصلي)، ولا تبقى أيقونة المشغّل على MainActivity نفسها
    expect((manifest.match(/android:enabled="true"/g) ?? []).length).toBe(1)
    const main = /<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?<\/activity>/.exec(manifest)![0]
    expect(main).not.toContain('category.LAUNCHER')
    expect(readFileSync('android/app/src/main/java/org/rafiqalmuslim/app/AppIconPlugin.java', 'utf8')).toContain(APP_ICON_IDS.map((i) => `"${i}"`).join(', '))
  })
  it('كل أيقونة لها تصميمها المعتمد وصورتها في صفحة الاختيار', () => {
    for (const id of APP_ICON_IDS) {
      expect(existsSync(`scripts/brand/icons/${id}.png`), id).toBe(true)
      expect(existsSync(`public/app-icons/${id}.png`), id).toBe(true)
    }
  })
})

describe('تصميم الودجت', () => {
  it('كل تصميم له خلفية Android ومعالَج في WidgetStyle.java', () => {
    const java = readFileSync('android/app/src/main/java/org/rafiqalmuslim/app/WidgetStyle.java', 'utf8')
    for (const s of WIDGET_STYLES) {
      if (s.id === 'emerald') continue
      expect(existsSync(`android/app/src/main/res/drawable/widget_bg_${s.id}.xml`), s.id).toBe(true)
      expect(java).toContain(`case "${s.id}": return R.drawable.widget_bg_${s.id};`)
    }
  })
})
