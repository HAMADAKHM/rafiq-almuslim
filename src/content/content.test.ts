// اختبارات المحتوى الديني: كل عنصر له مصدر، والمراجع القرآنية صحيحة، ولا نص قرآني مكتوب يدويًا.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import * as hafs from 'quran-meta/hafs'
import { ADHKAR } from './adhkar'
import { DUAS } from './duas'
import { HADITH } from './hadith'
import { LESSONS } from './lessons'
import { DEDICATION_PARAGRAPHS, DECEASED_KUNYA, DECEASED_NAME, FOOTER_LINE, HOME_CARD } from './dedication'

const all = [...ADHKAR, ...DUAS, ...HADITH].flatMap((c) => c.items.map((it) => ({ cat: c.id, it })))

describe('الأذكار والأدعية', () => {
  it('المعرّفات فريدة', () => {
    const ids = all.map((x) => x.it.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('كل عنصر له مصدر ونوع ونص أو مرجع قرآني', () => {
    for (const { it: x } of all) {
      expect(x.source.trim().length, x.id).toBeGreaterThan(3)
      expect(['quran', 'hadith', 'general']).toContain(x.kind)
      expect(!!x.text || !!x.quran, x.id).toBe(true)
      if (x.kind === 'quran') expect(x.quran, x.id).toBeTruthy()
      if (x.kind === 'hadith') expect(x.text, x.id).toBeTruthy()
    }
  })
  it('المراجع القرآنية ضمن حدود السور', () => {
    const refs = [...all.flatMap(({ it: x }) => x.quran ?? []), ...LESSONS.flatMap((l) => l.quran ?? [])]
    for (const r of refs) {
      expect(r.surah).toBeGreaterThanOrEqual(1)
      expect(r.surah).toBeLessThanOrEqual(114)
      expect(r.from).toBeGreaterThanOrEqual(1)
      expect(r.to).toBeGreaterThanOrEqual(r.from)
      expect(r.to).toBeLessThanOrEqual(hafs.getAyahCountInSurah(r.surah))
    }
  })
  it('درجة "صحيح" لا تُعطى إلا لما في الصحيحين', () => {
    for (const { it: x } of all) if (x.grade) expect(x.source, x.id).toMatch(/\u0627\u0644\u0628\u062E\u0627\u0631\u064A|\u0645\u0633\u0644\u0645/)
  })
  it('الأعداد المحددة لا تظهر إلا مع عناصر لها تخريج', () => {
    for (const { it: x } of all) if (x.count) expect(x.source).toMatch(/\u0631\u0648\u0627\u0647|\u0645\u062A\u0641\u0642|\u0627\u0644\u0628\u062E\u0627\u0631\u064A|\u0645\u0633\u0644\u0645/)
  })
})

describe('الأحاديث النبوية', () => {
  it('كلها من الصحيحين ومعها رقم الحديث', () => {
    for (const c of HADITH) for (const it of c.items) {
      expect(it.kind, it.id).toBe('hadith')
      expect(it.source, it.id).toMatch(/(البخاري|مسلم) \(\d+\)/)
    }
  })
})

describe('منع كتابة النص القرآني يدويًا', () => {
  // حروف خاصة بالرسم العثماني (السكون العثماني ۡ، ألف الوصل ٱ). وجودها خارج ملفات البيانات يعني نسخًا يدويًا لنص قرآني.
  const UTHMANI = /[\u06E1\u0671\u06DF\u06E0]/
  const srcDir = path.resolve(__dirname, '..')
  const files: string[] = []
  const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p)
  })
  walk(srcDir)
  it('لا توجد حروف الرسم العثماني في ملفات الشيفرة والمحتوى', () => {
    const offenders = files.filter((f) => UTHMANI.test(fs.readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('رسالة الوفاء ثابتة', () => {
  it('الاسم والكنية لم يتغيرا', () => {
    expect(DECEASED_NAME).toBe('قصي بديع خلفه')
    expect(DECEASED_KUNYA).toBe('أبو محمد')
  })
  it('نص الإهداء كما ورد حرفيًا', () => {
    expect(DEDICATION_PARAGRAPHS).toEqual([
      'بسم الله الرحمن الرحيم',
      'هذا التطبيق صدقة جارية عن روح والدي الغالي، المرحوم قصي بديع خلفه، المعروف بـ«أبو محمد»، رحمه الله رحمةً واسعة، وأسكنه فسيح جناته.',
      'أسأل الله أن يجعل هذا العمل خالصًا لوجهه الكريم، وأن ينفع به المسلمين والمسلمات، وأن يجعل ما يُقرأ فيه من القرآن الكريم، وما يُتلى من الأذكار، وما يُتعلّم من الخير، سببًا للأجر والرحمة والمغفرة لوالدي، وأن يتقبله قبولًا حسنًا.',
      'اللهم اغفر له وارحمه، وعافه واعفُ عنه، وأكرم نزله، ووسّع مدخله، واجعل قبره روضةً من رياض الجنة، واجمعنا به في جنات النعيم.',
      'اللهم اجعل هذا العمل نافعًا لكل من يستخدمه، وتقبله منا بفضلك وكرمك.',
      'نسألكم الدعاء له بالرحمة والمغفرة.',
      'رحم الله أبا محمد، وجعل ذكره الطيب وعمل الخير الذي أُهدي عن روحه باقيًا بإذن الله.',
    ])
    expect(FOOTER_LINE).toBe('صدقة جارية عن روح المرحوم قصي بديع خلفه — أبو محمد، رحمه الله.')
    expect(HOME_CARD.name).toBe('قصي بديع خلفه — أبو محمد')
  })
})

describe('مجانية التطبيق وخلوه من التتبع', () => {
  it('لا توجد مكتبات إعلانات أو تحليلات أو مدفوعات', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'))
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ')
    expect(deps).not.toMatch(/admob|adsense|analytics|gtag|mixpanel|segment|amplitude|sentry|stripe|paypal|revenuecat|firebase|hotjar/i)
  })
})
