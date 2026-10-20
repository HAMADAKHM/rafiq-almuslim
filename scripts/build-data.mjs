// يولّد ملفات البيانات الثابتة في public/data من حزم موثّقة المصدر:
// - نص القرآن: quran-json@3.1.2 (الرسم العثماني برواية حفص، من موسوعة القرآن الكريم QuranEnc)
// - البيانات الوصفية (الأجزاء/الأحزاب/الصفحات/السجدات): quran-meta (MIT)
// - المدن: all-the-cities (مشتقة من GeoNames) + المنطقة الزمنية عبر @photostructure/tz-lookup (CC0)
// يتحقق السكربت من سلامة البيانات ويتوقف عند أي خلل بدل إنتاج بيانات ناقصة.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url';
import * as hafs from 'quran-meta/hafs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => path.join(root, 'public', 'data', p);
const fail = (msg) => { console.error('✗ ' + msg); process.exit(1); };

// ---------- القرآن ----------
const quranSrc = require('quran-json/dist/quran.json');
const qjPkg = require('quran-json/package.json');
if (quranSrc.length !== 114) fail(`عدد السور ${quranSrc.length} بدل 114`);

const surahs = [];
let total = 0;
for (let i = 0; i < 114; i++) {
  const s = quranSrc[i];
  if (s.id !== i + 1) fail(`ترتيب السور غير صحيح عند ${i + 1}`);
  const metaCount = hafs.getAyahCountInSurah(i + 1);
  if (s.verses.length !== s.total_verses || s.verses.length !== metaCount)
    fail(`عدد آيات السورة ${s.id} = ${s.verses.length} لا يطابق المرجع ${metaCount}`);
  s.verses.forEach((v, k) => { if (v.id !== k + 1) fail(`تسلسل الآيات في السورة ${s.id} مكسور عند ${k + 1}`); if (!v.text.trim()) fail(`آية فارغة ${s.id}:${k + 1}`); });
  surahs.push({ n: s.id, name: s.name, tr: s.transliteration, type: s.type, count: s.verses.length, start: hafs.findAyahIdBySurah(i + 1, 1) });
  total += s.verses.length;
}
if (total !== 6236) fail(`مجموع الآيات ${total} بدل 6236`);

const verses = quranSrc.map((s) => s.verses.map((v) => v.text));
const quranJson = JSON.stringify({ v: 1, verses });
const sha = crypto.createHash('sha256').update(quranJson).digest('hex');

// بيانات وصفية لكل آية بالترقيم المتسلسل (1..6236)
const juz = [], page = [], rub = [];
for (let id = 1; id <= 6236; id++) {
  const m = hafs.getAyahMeta(id);
  juz.push(m.juz); page.push(m.page); rub.push(m.rubAlHizbId);
}
const sajdas = hafs.SajdaList.map((x) => (Array.isArray(x) ? x[0] : x));
const meta = { v: 1, surahs, juz, page, rub, sajdas, pages: hafs.meta.numPages, source: { text: `quran-json@${qjPkg.version}`, meta: 'quran-meta@' + require('quran-meta/package.json').version, sha256: sha } };

fs.mkdirSync(out('quran'), { recursive: true });
fs.writeFileSync(out('quran/quran.json'), quranJson);
fs.writeFileSync(out('quran/meta.json'), JSON.stringify(meta));
console.log(`✓ القرآن: 114 سورة، ${total} آية، ${meta.pages} صفحة، sha256=${sha.slice(0, 16)}…`);

// ---------- الترجمة الإنجليزية (Saheeh International عبر Tanzil، مضمّنة في quran-json) ----------
const en = require('quran-json/dist/quran_en.json')
if (en.length !== 114) fail('الترجمة: عدد السور غير صحيح')
const enVerses = en.map((s, i) => {
  if (s.verses.length !== verses[i].length) fail(`الترجمة: عدد آيات السورة ${i + 1} لا يطابق المصحف`)
  s.verses.forEach((v, k) => { if (v.text !== verses[i][k]) fail(`الترجمة: النص العربي المرافق لا يطابق ${i + 1}:${k + 1}`); if (!v.translation?.trim()) fail(`ترجمة فارغة ${i + 1}:${k + 1}`) })
  return s.verses.map((v) => v.translation)
})
fs.mkdirSync(out('translations'), { recursive: true })
fs.writeFileSync(out('translations/en-sahih.json'), JSON.stringify({ v: 1, id: 'en-sahih', name: 'Saheeh International', source: 'Tanzil.net via quran-json@' + qjPkg.version, verses: enVerses }))
console.log('✓ الترجمة الإنجليزية: 6236 آية، مطابقة لترتيب المصحف')

// ---------- المدن ----------
const tzlookup = require('@photostructure/tz-lookup');
const cities = require('all-the-cities');
const ARAB = new Set(['SA','AE','KW','QA','BH','OM','YE','IQ','SY','JO','LB','PS','EG','SD','LY','TN','DZ','MA','MR','SO','DJ','KM']);
const picked = [];
const seen = new Set();
for (const c of cities) {
  const [lng, lat] = c.loc.coordinates;
  let country = c.country, name = c.name, pop = c.population;
  if (c.cityId === 281184) { country = 'PS'; name = 'Jerusalem (Al-Quds)'; } // القدس ضمن فلسطين بطلب صاحب المشروع
  if (country === 'PS' && (name === 'East Jerusalem' || name === 'Old City')) continue;
  const keep = (country === 'PS' && pop >= 8000) || (ARAB.has(country) && pop >= 25000) || pop >= 60000 || (c.featureCode === 'PPLC');
  if (!keep) continue;
  const key = country + '|' + name;
  if (seen.has(key)) continue;
  seen.add(key);
  let tz;
  try { tz = tzlookup(lat, lng); } catch { continue; }
  picked.push([c.cityId, name, country, +lat.toFixed(4), +lng.toFixed(4), tz, pop]);
}
picked.sort((a, b) => b[6] - a[6]);
for (const must of ['Nablus', 'Gaza', 'Hebron', 'Jerusalem (Al-Quds)', 'Ramallah', 'Janīn', 'Bethlehem'])
  if (!picked.some((c) => c[2] === 'PS' && c[1] === must)) fail('مدينة فلسطينية ناقصة: ' + must);
fs.writeFileSync(out('cities.json'), JSON.stringify({ v: 1, fields: ['id','name','country','lat','lng','tz','pop'], source: 'GeoNames via all-the-cities', cities: picked }));
console.log(`✓ المدن: ${picked.length} مدينة`);
