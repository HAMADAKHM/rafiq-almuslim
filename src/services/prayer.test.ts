// اختبارات مواقيت الصلاة: نقارن نتائج مكتبة adhan بتنفيذ مرجعي مستقل للمعادلات الفلكية
// (خوارزمية PrayTimes.org المعروفة)، ونختبر المناطق الزمنية والتوقيت الصيفي.
import { describe, expect, it } from 'vitest'
import { DEFAULT_PRAYER_SETTINGS, nextPrayer, prayerTimesFor, suggestMethod, upcomingDays, type PrayerSettings } from './prayer'
import { dateParts, formatTime } from '../lib/dates'

// ---------- تنفيذ مرجعي مستقل ----------
const dtr = (d: number) => (d * Math.PI) / 180
const rtd = (r: number) => (r * 180) / Math.PI
const fix = (a: number, b: number) => ((a % b) + b) % b

function sunPosition(jd: number) {
  const D = jd - 2451545.0
  const g = fix(357.529 + 0.98560028 * D, 360)
  const q = fix(280.459 + 0.98564736 * D, 360)
  const L = fix(q + 1.915 * Math.sin(dtr(g)) + 0.02 * Math.sin(dtr(2 * g)), 360)
  const e = 23.439 - 0.00000036 * D
  const RA = fix(rtd(Math.atan2(Math.cos(dtr(e)) * Math.sin(dtr(L)), Math.cos(dtr(L)))) / 15, 24)
  const decl = rtd(Math.asin(Math.sin(dtr(e)) * Math.sin(dtr(L))))
  let eqt = q / 15 - RA
  eqt = fix(eqt + 12, 24) - 12
  return { decl, eqt }
}

function julian(y: number, m: number, d: number) {
  if (m <= 2) { y -= 1; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

/** أوقات بالساعات حسب UTC */
function reference(lat: number, lng: number, y: number, m: number, d: number, fajrAngle: number, ishaAngle: number, asrFactor = 1) {
  const jd = julian(y, m, d) - lng / 360
  const noonAt = (t: number) => fix(12 - sunPosition(jd + t).eqt, 24)
  const angleTime = (angle: number, t: number, ccw: boolean) => {
    const { decl } = sunPosition(jd + t)
    const T = rtd(Math.acos((-Math.sin(dtr(angle)) - Math.sin(dtr(decl)) * Math.sin(dtr(lat))) / (Math.cos(dtr(decl)) * Math.cos(dtr(lat))))) / 15
    return noonAt(t) + (ccw ? -T : T)
  }
  const asrTime = (t: number) => {
    const { decl } = sunPosition(jd + t)
    const angle = -rtd(Math.atan(1 / (asrFactor + Math.tan(dtr(Math.abs(lat - decl))))))
    return angleTime(angle, t, false)
  }
  // تكراران لتحسين الدقة
  let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 }
  for (let i = 0; i < 2; i++) {
    const f = (h: number) => h / 24
    t = {
      fajr: angleTime(fajrAngle, f(t.fajr), true),
      sunrise: angleTime(0.833, f(t.sunrise), true),
      dhuhr: noonAt(f(t.dhuhr)),
      asr: asrTime(f(t.asr)),
      maghrib: angleTime(0.833, f(t.maghrib), false),
      isha: angleTime(ishaAngle, f(t.isha), false),
    }
  }
  const utc = (h: number) => h - lng / 15
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, utc(v)])) as Record<keyof typeof t, number>
}

function utcHours(d: Date, y: number, m: number, day: number) {
  return (d.getTime() - Date.UTC(y, m - 1, day)) / 3_600_000
}

const CITIES = [
  { name: 'مكة', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' },
  { name: 'نابلس', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' },
  { name: 'غزة', lat: 31.5017, lng: 34.4668, tz: 'Asia/Gaza' },
  { name: 'القاهرة', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo' },
  { name: 'جاكرتا', lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta' },
  { name: 'نيويورك', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
]
const DATES: [number, number, number][] = [[2026, 1, 15], [2026, 3, 21], [2026, 6, 21], [2026, 10, 19], [2026, 12, 21]]

describe('دقة الحساب مقارنة بتنفيذ مرجعي مستقل', () => {
  const mwl: PrayerSettings = { ...DEFAULT_PRAYER_SETTINGS, method: 'MuslimWorldLeague' }
  for (const c of CITIES) {
    it(`${c.name}: الفرق لا يتجاوز دقيقتين في كل الأوقات (رابطة العالم الإسلامي)`, () => {
      for (const [y, m, d] of DATES) {
        const got = prayerTimesFor(c, { y, m, d }, mwl)
        const ref = reference(c.lat, c.lng, y, m, d, 18, 17)
        for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
          const diffMin = Math.abs(utcHours(got[k], y, m, d) - ref[k]) * 60
          // adhan يضيف دقيقة للظهر في هذه الطريقة ويقرّب للدقيقة
          expect(diffMin, `${c.name} ${y}-${m}-${d} ${k}`).toBeLessThan(2.6)
        }
      }
    })
  }

  it('حساب العصر الحنفي (ظل المثلين) يتأخر عن الجمهور ويطابق المرجع', () => {
    const c = CITIES[1]
    const shafi = prayerTimesFor(c, { y: 2026, m: 6, d: 21 }, { ...mwl, madhab: 'shafi' })
    const hanafi = prayerTimesFor(c, { y: 2026, m: 6, d: 21 }, { ...mwl, madhab: 'hanafi' })
    expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime() + 30 * 60_000)
    const ref = reference(c.lat, c.lng, 2026, 6, 21, 18, 17, 2)
    expect(Math.abs(utcHours(hanafi.asr, 2026, 6, 21) - ref.asr) * 60).toBeLessThan(2.6)
  })

  it('الطريقة المصرية تستخدم زوايا مختلفة (فجر أبكر)', () => {
    const c = CITIES[3]
    const eg = prayerTimesFor(c, { y: 2026, m: 3, d: 21 }, { ...mwl, method: 'Egyptian' })
    const ref = reference(c.lat, c.lng, 2026, 3, 21, 19.5, 17.5)
    expect(Math.abs(utcHours(eg.fajr, 2026, 3, 21) - ref.fajr) * 60).toBeLessThan(2.6)
  })

  it('أم القرى: العشاء بعد المغرب بـ90 دقيقة', () => {
    const t = prayerTimesFor(CITIES[0], { y: 2026, m: 10, d: 19 }, { ...mwl, method: 'UmmAlQura' })
    expect(Math.round((t.isha.getTime() - t.maghrib.getTime()) / 60_000)).toBe(90)
  })

  it('التعديل اليدوي بالدقائق يُطبَّق', () => {
    const base = prayerTimesFor(CITIES[1], { y: 2026, m: 10, d: 19 }, mwl)
    const adj = prayerTimesFor(CITIES[1], { y: 2026, m: 10, d: 19 }, { ...mwl, adjustments: { ...mwl.adjustments, fajr: 3, isha: -2 } })
    expect((adj.fajr.getTime() - base.fajr.getTime()) / 60_000).toBe(3)
    expect((adj.isha.getTime() - base.isha.getTime()) / 60_000).toBe(-2)
  })
})

describe('المدن الفلسطينية لا تُفترض متطابقة', () => {
  it('نابلس وغزة والخليل والقدس لها مواقيت مختلفة', () => {
    const day = { y: 2026, m: 10, d: 19 }
    const places = [
      { lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' }, // نابلس
      { lat: 31.5017, lng: 34.4668, tz: 'Asia/Gaza' }, // غزة
      { lat: 31.5326, lng: 35.0998, tz: 'Asia/Hebron' }, // الخليل
      { lat: 31.7683, lng: 35.2137, tz: 'Asia/Hebron' }, // القدس
    ]
    const all = places.map((p) => prayerTimesFor(p, day, DEFAULT_PRAYER_SETTINGS))
    const signature = all.map((t) => Object.values(t).map((d) => d.getTime()).join(','))
    expect(new Set(signature).size).toBe(4)
    // غزة غرب نابلس بنحو 0.8° طول ⇒ مغربها متأخر بدقائق
    expect((all[1].maghrib.getTime() - all[0].maghrib.getTime()) / 60_000).toBeGreaterThan(1)
  })
})

describe('المناطق الزمنية والتوقيت الصيفي', () => {
  const s = DEFAULT_PRAYER_SETTINGS
  const cases = [
    { name: 'نيويورك (بدء التوقيت الصيفي 8 مارس 2026)', place: { lat: 40.7128, lng: -74.006, tz: 'America/New_York' }, before: { y: 2026, m: 3, d: 7 }, after: { y: 2026, m: 3, d: 8 }, shift: 60 },
    { name: 'لندن (بدء التوقيت الصيفي 29 مارس 2026)', place: { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' }, before: { y: 2026, m: 3, d: 28 }, after: { y: 2026, m: 3, d: 29 }, shift: 60 },
    { name: 'نيويورك (انتهاء التوقيت الصيفي 1 نوفمبر 2026)', place: { lat: 40.7128, lng: -74.006, tz: 'America/New_York' }, before: { y: 2026, m: 10, d: 31 }, after: { y: 2026, m: 11, d: 1 }, shift: -60 },
  ]
  for (const c of cases) {
    it(c.name, () => {
      const a = prayerTimesFor(c.place, c.before, s)
      const b = prayerTimesFor(c.place, c.after, s)
      // اللحظة الفعلية (UTC) للظهر تكاد لا تتغير بين يومين متتاليين…
      expect(Math.abs(b.dhuhr.getTime() - a.dhuhr.getTime() - 86_400_000) / 60_000).toBeLessThan(2)
      // …لكن الساعة المحلية المعروضة تتغير بمقدار ساعة
      const local = (d: Date) => { const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: c.place.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d).split(':').map(Number); return h * 60 + m }
      expect(Math.abs(local(b.dhuhr) - local(a.dhuhr) - c.shift)).toBeLessThanOrEqual(2)
    })
  }

  it('فلسطين (Asia/Hebron): بدء التوقيت الصيفي وانتهاؤه في 2026 يُكتشفان من قاعدة المناطق الزمنية', () => {
    const place = { lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' }
    const offset = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: place.tz, timeZoneName: 'shortOffset' }).formatToParts(d).find((p) => p.type === 'timeZoneName')!.value
    const local = (d: Date) => { const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: place.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d).split(':').map(Number); return h * 60 + m }
    const transitions: { before: { y: number; m: number; d: number }; after: { y: number; m: number; d: number } }[] = []
    for (let i = 0; i < 365; i++) {
      const a = new Date(Date.UTC(2026, 0, 1 + i, 9)), b = new Date(Date.UTC(2026, 0, 2 + i, 9))
      if (offset(a) !== offset(b)) transitions.push({ before: dateParts(a, place.tz), after: dateParts(b, place.tz) })
    }
    expect(transitions.length).toBe(2) // بداية ونهاية
    for (const [i, t] of transitions.entries()) {
      const a = prayerTimesFor(place, t.before, s), b = prayerTimesFor(place, t.after, s)
      expect(Math.abs(b.dhuhr.getTime() - a.dhuhr.getTime() - 86_400_000) / 60_000).toBeLessThan(2)
      // الربيع: تتقدم الساعة المعروضة ساعة؛ الخريف: تتأخر ساعة
      expect(Math.abs(local(b.dhuhr) - local(a.dhuhr) - (i === 0 ? 60 : -60))).toBeLessThanOrEqual(2)
    }
  })

  it('تُعرض المواقيت بتوقيت المدينة لا بتوقيت جهاز المستخدم', () => {
    const t = prayerTimesFor({ lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' }, { y: 2026, m: 10, d: 19 }, s)
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', hour12: false }).format(t.dhuhr))
    expect(h).toBe(12) // ظهر مكة في أكتوبر نحو 12:05 بتوقيت السعودية (UTC+3)
    expect(formatTime(t.dhuhr, 'Asia/Riyadh')).toMatch(/12:0\d/)
    // ونفس اللحظة تُعرض بتوقيت آخر بشكل مختلف
    expect(formatTime(t.dhuhr, 'Europe/London')).not.toBe(formatTime(t.dhuhr, 'Asia/Riyadh'))
  })

  it('الصلاة القادمة بعد العشاء هي فجر اليوم التالي', () => {
    const place = { lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' }
    const t = prayerTimesFor(place, { y: 2026, m: 10, d: 19 }, s)
    const n = nextPrayer(place, s, new Date(t.isha.getTime() + 60_000))
    expect(n.name).toBe('fajr')
    expect(n.time.getTime()).toBeGreaterThan(t.isha.getTime())
  })

  it('مواقيت الأيام القادمة متسلسلة', () => {
    const days = upcomingDays({ lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' }, s, 7, new Date(Date.UTC(2026, 9, 19, 9)))
    expect(days).toHaveLength(7)
    expect(days[0].key).toEqual({ y: 2026, m: 10, d: 19 })
    expect(days[6].key).toEqual({ y: 2026, m: 10, d: 25 })
  })
})

describe('اقتراح طريقة الحساب', () => {
  it('اقتراحات حسب الدولة', () => {
    expect(suggestMethod('SA')).toBe('UmmAlQura')
    expect(suggestMethod('EG')).toBe('Egyptian')
    expect(suggestMethod('PS')).toBe('MuslimWorldLeague')
  })
})
