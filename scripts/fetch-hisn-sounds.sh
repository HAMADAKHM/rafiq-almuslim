#!/usr/bin/env bash
# يجلب تسجيلات «حصن المسلم» المربوطة بالأذكار (src/content/hisnAudio.ts) إلى موارد Android
# لتُستعمل صوتًا لإشعارات التذكير (يُقرأ الذكر نفسه عند وصول الإشعار، والتطبيق مغلق).
# يُشغَّل في البناء (CI) قبل gradle. الملفات لا تُحفظ في المستودع (.gitignore).
set -u
DEST="android/app/src/main/res/raw"
mkdir -p "$DEST"
ok=0; bad=0
MAP=src/content/hisnAudio.ts
# أرقام التسجيلات من جدول HISN_AUDIO فقط
for n in $(awk '/^export const HISN_AUDIO/{f=1;next} f&&/^}/{f=0} f' "$MAP" | grep -oE ": [0-9]+," | tr -dc '0-9\n' | sort -un); do
  f="$DEST/hisn_$n.mp3"
  [ -s "$f" ] && { ok=$((ok+1)); continue; }
  if curl -sfL -m 60 --retry 3 -o "$f.tmp" "https://www.hisnmuslim.com/audio/ar/$n.mp3" && [ "$(head -c 3 "$f.tmp")" = "ID3" -o "$(head -c 2 "$f.tmp" | od -An -tx1 | tr -d ' ')" = "fffb" ] && [ "$(wc -c < "$f.tmp")" -gt 2000 ]; then
    mv "$f.tmp" "$f"; ok=$((ok+1))
  else
    rm -f "$f.tmp"; bad=$((bad+1)); echo "::warning::تعذر جلب تسجيل حصن المسلم $n"
  fi
done
# مقاطع لصوت الإشعار (HISN_CLIPS): «m77: { src: 77, from: 0, to: 17.5, …» ← hisn_m77.mp3 بتلاشٍ قصير في آخره
command -v ffmpeg > /dev/null || { sudo apt-get install -y -qq ffmpeg > /dev/null 2>&1 || true; }
awk '/^export const HISN_CLIPS/{f=1;next} f&&/^}/{f=0} f' "$MAP" | sed -nE 's/^ *([a-z][a-z0-9]*): \{ src: ([0-9]+), from: ([0-9.]+), to: ([0-9.]+),.*/\1 \2 \3 \4/p' | while read -r key src from to; do
  in="$DEST/hisn_$src.mp3"; out="$DEST/hisn_$key.mp3"
  [ -s "$out" ] && continue
  [ -s "$in" ] || { echo "::warning::المقطع $key يحتاج التسجيل $src"; continue; }
  fade=$(awk "BEGIN{print $to-0.4}")
  if ffmpeg -nostdin -hide_banner -loglevel error -y -ss "$from" -to "$to" -i "$in" -af "afade=t=out:st=$(awk "BEGIN{print $fade-$from}"):d=0.4" -codec:a libmp3lame -q:a 3 "$out" && [ "$(wc -c < "$out")" -gt 2000 ]; then
    echo "::notice::clip $key: $(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$out" | cut -c1-5)s"
  else
    rm -f "$out"; echo "::warning::تعذر قص المقطع $key"
  fi
done
echo "hisn sounds: ok=$ok failed=$bad size=$(du -sh "$DEST" | cut -f1)"
