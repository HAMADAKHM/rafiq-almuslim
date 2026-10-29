# ملاحظات الإصدار — النسخة الاحترافية (المرحلة 2: الذكر المسموع)

## الجديد
- إشعار الصباح: «حان وقت أذكار الصباح 🌅 — ابدأ يومك بذكر الله»، ويُسمع معه **«أصبحنا وأصبح الملك لله…»** بتسجيل حصن المسلم. كان يُسمع سابقًا «بسم الله الذي لا يضر».
- إشعار المساء: «حان وقت أذكار المساء 🌇 — حان وقت ذكر الله في المساء»، ويُسمع معه **«أمسينا وأمسى الملك لله…»** بصوت الهاتف العربي، أو بتسجيلك.
- لكل من الصباح والمساء اختيار مستقل للصوت: حصن المسلم، أو صوت الهاتف، أو تسجيلي. ولكل منهما زر «استمع» و«إشعار تجريبي».
- إضافة Android جديدة اسمها `DhikrSound`: تجعل ملفًا صوتيًا على الجهاز صوتًا لإشعار الذكر.

## لم يتغير
- كل الميزات السابقة بقيت كما هي.
- لم يُعدَّل أي نص قرآن أو ذكر.
- أوقات التذكيرات المحفوظة بقيت كما هي.

## ملفات أُضيفت
- `android/app/src/main/java/org/rafiqalmuslim/app/DhikrSoundPlugin.java`
- `src/services/timedVoice.ts` و`src/services/timedVoice.test.ts`
- `src/features/reminders/TimedVoiceSection.tsx`
- `docs/FEATURE_AUDIT.md` و`IMPLEMENTATION_PLAN.md` و`NOTIFICATION_AUDIO_DESIGN.md` و`TEST_REPORT.md` و`RELEASE_NOTES.md`

## ملفات عُدّلت
- `src/content/hisnAudio.ts` (`HISN_CLIPS`)
- `src/services/companion.ts` و`reminders.ts` و`notifications.ts`
- `src/platform/index.ts`
- `src/state/settings.ts`
- `src/features/reminders/RemindersPage.tsx`
- `scripts/fetch-hisn-sounds.sh`
- `android/app/src/main/res/xml/file_paths.xml`
- `MainActivity.java`
- `src/services/companion.test.ts`
