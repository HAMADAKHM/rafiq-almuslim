import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { hisnCategories, HISN_ITEM_PREFIX } from '../content/hisnLibrary'
import { hisnAudioUrl } from '../content/hisnAudio'
import { buildCaption, FORMATS } from './studio'

const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/hisn.json'), 'utf8'))

describe('مكتبة حصن المسلم في الاستوديو', () => {
  const cats = hisnCategories(raw)
  const items = cats.flatMap((c) => c.items)
  it('كل الأبواب والأذكار بنصوصها، ومعرّفات فريدة', () => {
    expect(cats.length).toBe(132)
    expect(items.length).toBe(267)
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    for (const i of items) { expect(i.text!.length).toBeGreaterThan(3); expect(i.source).toMatch(/^حصن المسلم — .+ \(\d+\)$/) }
  })
  it('لكل ذكر تسجيله من المشروع نفسه، برقم ملفه هو', () => {
    let missing = 0
    for (const ch of raw.chapters) for (const it of ch.items) {
      if (it.audio) expect(hisnAudioUrl(`${HISN_ITEM_PREFIX}${it.n}`)).toBe(`https://www.hisnmuslim.com/audio/ar/${it.audio}.mp3`)
      else { missing++; expect(hisnAudioUrl(`${HISN_ITEM_PREFIX}${it.n}`)).toBeNull() } // رابط تسجيله فارغ في المصدر (153)
    }
    expect(missing).toBe(1)
  })
})

describe('النشر في منصات التواصل', () => {
  it('المقاسات الموصى بها', () => {
    expect(FORMATS.story).toMatchObject({ w: 1080, h: 1920, ratio: '9:16' })
    expect(FORMATS.portrait).toMatchObject({ w: 1080, h: 1350, ratio: '4:5' })
    expect(FORMATS.square).toMatchObject({ w: 1080, h: 1080 })
    expect(FORMATS.landscape).toMatchObject({ w: 1920, h: 1080 })
  })
  it('نص المنشور: السطر الشخصي ثم النص ثم المصدر ثم الوسوم', () => {
    const c = buildCaption({ source: 'hisn', text: 'نص الدعاء', reference: 'حصن المسلم (1)', note: 'صدقة جارية عن والدي' })
    expect(c.split('\n\n')).toEqual(['صدقة جارية عن والدي', 'نص الدعاء', '— حصن المسلم (1)', '#حصن_المسلم #دعاء #أذكار #رفيق_المسلم'])
    expect(buildCaption({ source: 'ayah', text: 'آية', reference: 'سورة الرعد 28' })).toMatch(/^﴿آية﴾\n\n— سورة الرعد 28/)
    expect(buildCaption({ source: 'custom', text: ' نصي ', withTags: false })).toBe('نصي')
  })
})
