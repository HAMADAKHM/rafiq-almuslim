// صفحة البداية للنشر: index.html يحوّل إلى tv.html (ليكون الرابط قصيرًا على التلفاز)
import { writeFileSync } from 'node:fs'
writeFileSync('dist-tv/index.html', '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./tv.html"><title>رفيق المسلم — شاشة المواقيت</title><a href="./tv.html">فتح الشاشة</a>\n')
