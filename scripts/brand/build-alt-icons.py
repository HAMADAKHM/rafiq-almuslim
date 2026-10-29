#!/usr/bin/env python3
# يولّد أيقونات التطبيق (Android وصور صفحة الاختيار) من التصاميم المعتمدة في scripts/brand/icons/<id>.png
# (مقصوصة من صفحة الأيقونات المرسلة دون تعديل في الرسم، مع إزالة شارة «مجاني/Plus» فقط).
# الاستخدام: python3 scripts/brand/build-alt-icons.py
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'scripts/brand/icons')
RES = os.path.join(ROOT, 'android/app/src/main/res')
PUB = os.path.join(ROOT, 'public/app-icons')
IDS = ['default', 'royal', 'night', 'turquoise', 'dawn', 'nature', 'violet', 'rose', 'evening']
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def inner(im):
    """الرسم دون الحافة الخارجية وزوايا الخلفية (4% من كل جهة)"""
    w, h = im.size
    k = round(w * 0.04)
    return im.crop((k, k, w - k, h - k))


def masked(im, size, radius):
    """صورة بزوايا مستديرة (radius نسبة من الحجم؛ 0.5 = دائرة)"""
    art = inner(im).resize((size, size), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=round(size * 4 * radius), fill=255)
    art.putalpha(m.resize((size, size), Image.LANCZOS))
    return art


def adaptive(im, size):
    """طبقتا الأيقونة التكيفية: خلفية ممتدة من ألوان الأيقونة، ورسمها كاملًا في الوسط بحواف ناعمة"""
    art = inner(im)
    bg = art.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(size / 14))
    s = round(size * 0.80)
    fg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    a = art.resize((s, s), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (s, s), 0)
    f = round(s * 0.05)
    ImageDraw.Draw(m).rectangle((f, f, s - f, s - f), fill=255)
    a.putalpha(m.filter(ImageFilter.GaussianBlur(f / 2)))
    fg.paste(a, ((size - s) // 2, (size - s) // 2), a)
    return bg, fg


os.makedirs(PUB, exist_ok=True)
for i in IDS:
    im = Image.open(os.path.join(SRC, f'{i}.png')).convert('RGB')
    masked(im, 192, 0.22).save(os.path.join(PUB, f'{i}.png'), optimize=True)
    name = f'ic_alt_{i}'
    for d, k in DENS.items():
        out = os.path.join(RES, f'mipmap-{d}')
        os.makedirs(out, exist_ok=True)
        masked(im, round(48 * k), 0.22).save(os.path.join(out, f'{name}.png'), optimize=True)
        masked(im, round(48 * k), 0.5).save(os.path.join(out, f'{name}_round.png'), optimize=True)
        bg, fg = adaptive(im, round(108 * k))
        bg.save(os.path.join(out, f'{name}_bg.png'), optimize=True)
        fg.save(os.path.join(out, f'{name}_fg.png'), optimize=True)
    xml = f'<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/{name}_bg"/>\n    <foreground android:drawable="@mipmap/{name}_fg"/>\n</adaptive-icon>\n'
    for suffix in ('', '_round'):
        with open(os.path.join(RES, 'mipmap-anydpi-v26', f'{name}{suffix}.xml'), 'w') as fh:
            fh.write(xml)
    print('✓', name)
