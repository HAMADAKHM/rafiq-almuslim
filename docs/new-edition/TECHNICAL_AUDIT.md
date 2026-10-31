# التدقيق التقني

## التقنيات
| البند | القيمة |
|---|---|
| اللغة | TypeScript 7 (تطبيق الويب)، وJava (طبقة Android والتلفاز) |
| الواجهة | React 19 + React Router 7، Vite 8، PWA |
| التغليف | Capacitor 8 للهاتف (minSdk 24، target 36). تطبيق التلفاز Android أصلي مع WebView (`TvWeb`)، minSdk 21 |
| الأيقونات | lucide-react |
| الخطوط | @fontsource: Amiri Quran وAmiri وScheherazade وNoto Naskh وIBM Plex Arabic وAref Ruqaa وReem Kufi Ink |
| الاختبارات | Vitest (50 ملف وحدات)، Playwright (11 ملف e2e)، JUnit لطبقة التلفاز (`RemoteCoreTest`)، وoxlint |

## البنية
```
src/app        الهيكل، المسارات (App.tsx)، Layout، nav.ts، Splash
src/features   ~38 قسمًا (quran, quran2, prayer, adhkar, tasbih, cards, studio, tvremote…)
src/services   منطق بلا واجهة + اختباراته (prayer, adhan, audio, srs, khatma, tvRemote, posterArt…)
src/content    محتوى ثابت موثّق المصدر (أذكار، أدعية، أحاديث، قرّاء، بطاقات)
src/db         IndexedDB (idb) + النسخ الاحتياطي
src/state      الإعدادات (SettingsContext)
src/themes     الثيمات (skins.ts)، المشاهد، الأيقونات البديلة
src/billing    الاشتراك (RevenueCat / Sandbox) والاستحقاق
src/ads        AdMob للصفحات الأربع المعتمدة
src/tv         واجهة شاشة التلفاز (تُبنى ويب وتُحمّل في WebView التلفاز)
src/i18n       نصوص عربية/إنجليزية (strings.ts)
android/       غلاف Capacitor + الإضافات الأصلية (ودجت، أذان، أيقونات، TvLink)
android-tv/    تطبيق التلفاز (خادم الإقران، الأذان، الشاشة المؤقتة، التحديث)
public/data    القرآن (quran-json 3.1.2، عثماني حفص)، الميتا (quran-meta 7)، التفسير
```

## التخزين والحالة
- **IndexedDB `islamic-companion` إصدار 1.** المخازن: kv وbookmarks وnotes وmemo وmemoLog وreadLog وadhkarLog وfavorites وlistenLog.
- **الإعدادات والتفضيلات** في `kv` (مثل `quran:last` و`reader2:prefs` و`billing:entitlement`).
- **الحالة العامة:** React Context (الإعدادات، بلس)، ولا مكتبة حالة خارجية.
- **العزل:** النسخة الجديدة تحمل معرّفًا مختلفًا، فلها WebView وتخزين منفصلان تمامًا. لا حاجة لتغيير اسم القاعدة.

## الخدمات
- **مواقيت الصلاة:** مكتبة `adhan` محليًا، مع طرق حساب، وفرق التوقيت الصيفي، ومنطقة زمنية من `tz-lookup`.
- **الإشعارات:** `@capacitor/local-notifications`، مع قنوات أذان أصلية (`AdhanSoundPlugin`).
- **الصوت:**
  - التلاوة من خوادم القرّاء، مع تنزيل اختياري.
  - الأذكار المسجّلة من hisnmuslim.com.
  - قراءة النص بصوت الجهاز (TTS).
- **التنقل:** شريط سفلي قابل للتخصيص، وصفحة «المزيد»، و`NAV` في `nav.ts`.
- **الثيمات:** `data-skin` ورموز `--*` CSS:
  - 12 ثيم هوية و16 خلفية حية.
  - وضع رمضان يفرض `ramadan`.

## التلفاز
- **الإقران:**
  - NSD من نوع `_rafiqtvnew._tcp.` على المنفذ 8775 في النسخة الجديدة.
  - طلبات موقّعة HMAC، والرمز يُعرض على الشاشة.
- **تحديث المحتوى:** الهاتف يرسل الإعدادات والمشاهد عبر الخادم المحلي، بلا سحابة.
- **تحديث التطبيق:**
  - `/update` يقبل روابط GitHub لاسم الملف الخاص بالنسخة فقط، ثم يمر عبر PackageInstaller.
  - يجب أن يكون التوقيع واحدًا.
- **HDMI/الألعاب:** `IdleRules` يمنع الاستيلاء على الشاشة أثناء مصدر HDMI نشط.

## الاشتراك
- `PlusContext`:
  - يتحقق عبر RevenueCat على الجهاز، مع ذاكرة مؤقتة محدودة المدة.
  - `VITE_PLUS_UNLOCK=1` يفتح بلس في المعاينة فقط.
- **غير مفعّل بعد:**
  - مفاتيح RevenueCat.
  - منتج 9.99₪ في Google Play.
  - حساب مطوّر. وبحسب تعليماتك لا ننشئ أي حساب حاليًا.
- **النسخة الجديدة** ستحتاج قائمة متجر ومنتجًا مستقلين، لأن المعرّف مختلف.

## الإعدادات الخاصة بالنسخة الجديدة (ما تغيّر في هذا الفرع)
- **الهاتف:**
  - `android/app/build.gradle` بالمعرّف `org.rafiqalmuslim.next`.
  - `capacitor.config.ts`.
  - `strings.xml`.
  - `TvLinkPlugin.TYPE`.
- **التلفاز:**
  - `android-tv/app/build.gradle` بالمعرّف `org.rafiqalmuslim.tv.next`.
  - `strings.xml`.
  - `RemoteServer` (النوع والمنفذ).
  - `RemoteCore`: `EDITION_APP` و`UPDATE_ASSET` و`validUpdateUrl`.
- **الويب:** `tvRemote.ts`: `TV_APP_ID` و`TV_UPDATE_ASSET`.
- **CI:**
  - نشر المعاينة باسم `new-v…` وملفات `RafiqAlMuslimNew.apk` و`RafiqAlMuslimTVNew.apk`.
  - تعطيل نشر الفرع الرئيسي.
- `FileProvider` يعتمد `${applicationId}`، فلا تعارض.
- **حزمة كود Java** (`org.rafiqalmuslim.app`) لم تتغير عمدًا. Android يعتمد `applicationId` فقط للتمييز.

## مشكلات وقيود معروفة
1. **الترجمة الإنجليزية** جزئية: التنقل والإعدادات فقط.
2. **اختبار e2e لوضع عدم الاتصال** متذبذب، وكان كذلك من قبل.
3. **تلفاز Samsung (Tizen)** غير مفصول للنسخة الجديدة، فاستُبعد من نشرها.
4. **الدفع الحقيقي** غير مفعّل، وهو بانتظار حساب المتجر بقرارك.
5. **ألوان التجويد لكل المصحف** تحتاج بيانات تجويد موثقة لم تُضَف بعد. القارئ الجديد يعرض النص دون تلوين حتى ذلك الحين.
6. **صفحات مصحف المدينة سطرًا بسطر** (15 سطرًا) تحتاج بيانات تخطيط موثقة. الحالي: تقسيم الصفحات من quran-meta بتدفق نصي.
7. **صور الخلفيات** محلية فقط (مضمّنة). مصادر الصور الخارجية محجوبة في بيئة التطوير.
8. **الأذكار المسجّلة** لا تغطي كل الأذكار، لأنها محدودة بما في مصدر hisnmuslim.com.
