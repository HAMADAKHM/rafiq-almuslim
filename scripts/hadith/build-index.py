# يبني فهرس مكتبة الأحاديث (src/content/hadithBooks.json) من قاعدة fawazahmed0/hadith-api (ملكية عامة):
# الكتب وأبوابها الكبرى (الكتب) وأرقام أحاديثها. عناوين الكتب بالعربية من hadith-json (عناوين فقط)،
# وتُطابَق بالعنوان الإنجليزي؛ ما لم يُطابَق يبقى بلا عنوان عربي (يظهر «الكتاب رقم ...»).
# الاستعمال: python3 scripts/hadith/build-index.py <مجلد الملفات المنزّلة>
import json, sys, os
src = sys.argv[1]
BOOKS = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik']
out = []
for b in BOOKS:
    f = json.load(open(os.path.join(src, f'ara-{b}.json')))
    hj = json.load(open(os.path.join(src, f'hj-{b}.json')))
    ar_by_en = {}
    for c in hj['chapters']:
        ar_by_en.setdefault(c['english'].strip(), c['arabic'].strip())
    meta = f['metadata']
    det = meta.get('section_details', {})
    nums = {}
    for h in f['hadiths']:
        nums.setdefault(h['reference']['book'], []).append(h['hadithnumber'])
    secs = []
    for k, en in meta['sections'].items():
        if not en.strip():
            continue
        d = det.get(k, {})
        n = int(k)
        secs.append({'n': n, 'en': en.strip(), 'ar': ar_by_en.get(en.strip()), 'first': d.get('hadithnumber_first'), 'last': d.get('hadithnumber_last'), 'count': len(nums.get(n, []))})
    out.append({'id': b, 'total': len(f['hadiths']), 'sections': secs})
    print(b, len(secs), 'sections,', sum(1 for s in secs if s['ar']), 'with Arabic title')
json.dump(out, open('src/content/hadithBooks.json', 'w'), ensure_ascii=False, separators=(',', ':'))
