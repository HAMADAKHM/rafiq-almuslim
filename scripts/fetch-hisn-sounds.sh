#!/usr/bin/env bash
# يجلب تسجيلات «حصن المسلم» المربوطة بالأذكار (src/content/hisnAudio.ts) إلى موارد Android
# لتُستعمل صوتًا لإشعارات التذكير (يُقرأ الذكر نفسه عند وصول الإشعار، والتطبيق مغلق).
# يُشغَّل في البناء (CI) قبل gradle. الملفات لا تُحفظ في المستودع (.gitignore).
set -u
DEST="android/app/src/main/res/raw"
mkdir -p "$DEST"
ok=0; bad=0
for n in $(grep -oE ": [0-9]+," src/content/hisnAudio.ts | tr -dc '0-9\n' | sort -un); do
  f="$DEST/hisn_$n.mp3"
  [ -s "$f" ] && { ok=$((ok+1)); continue; }
  if curl -sfL -m 60 --retry 3 -o "$f.tmp" "https://www.hisnmuslim.com/audio/ar/$n.mp3" && [ "$(head -c 3 "$f.tmp")" = "ID3" -o "$(head -c 2 "$f.tmp" | od -An -tx1 | tr -d ' ')" = "fffb" ] && [ "$(wc -c < "$f.tmp")" -gt 2000 ]; then
    mv "$f.tmp" "$f"; ok=$((ok+1))
  else
    rm -f "$f.tmp"; bad=$((bad+1)); echo "::warning::تعذر جلب تسجيل حصن المسلم $n"
  fi
done
echo "hisn sounds: ok=$ok failed=$bad size=$(du -sh "$DEST" | cut -f1)"
