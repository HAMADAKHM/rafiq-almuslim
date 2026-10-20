// نسخة الملف الواحد: تُضمَّن بيانات المصحف والمدن داخل الملف نفسه،
// لأن المتصفح لا يسمح بقراءة ملفات مجاورة عند فتح الصفحة مباشرة من القرص (file://).
import quran from '../public/data/quran/quran.json'
import meta from '../public/data/quran/meta.json'
import cities from '../public/data/cities.json'
import enSahih from '../public/data/translations/en-sahih.json'

const EMBEDDED: Record<string, unknown> = {
  'data/quran/quran.json': quran,
  'data/quran/meta.json': meta,
  'data/cities.json': cities,
  'data/translations/en-sahih.json': enSahih,
}

const realFetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const key = Object.keys(EMBEDDED).find((k) => url.endsWith(k))
  if (key) return Promise.resolve(new Response(JSON.stringify(EMBEDDED[key]), { headers: { 'content-type': 'application/json' } }))
  return realFetch(input, init)
}
