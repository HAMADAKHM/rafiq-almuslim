package org.rafiqalmuslim.tv;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;

/** إنشاء متصفح الشاشة المشترك بين التطبيق وشاشة التوقف، وجسر صغير لإعدادات التلفاز */
final class TvWeb {
    static final String PREFS = "rafiq_tv";
    static final String KEY_AUTOSTART = "autostart";
    private static final String BASE = "https://appassets.androidplatform.net/assets/tv/tv.html";

    private TvWeb() {}

    static boolean autostart(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_AUTOSTART, true);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    static WebView create(final Context ctx, boolean dream) {
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(ctx))
            .build();
        WebView web = new WebView(ctx);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setAllowFileAccess(false);
        // الواجهة من أصول التطبيق نفسه: لا تخزين مؤقت، حتى تظهر النسخة الجديدة فور تحديث التطبيق
        ws.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.clearCache(true);
        WebView.setWebContentsDebuggingEnabled(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return withMime(request.getUrl(), loader.shouldInterceptRequest(request.getUrl()));
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                Uri u = Uri.parse(url);
                return withMime(u, loader.shouldInterceptRequest(u));
            }
        });
        if (!dream) web.addJavascriptInterface(new Bridge(ctx.getApplicationContext()), "RafiqTV");
        // app=1: الصوت مسموح دون ضغطة؛ dream=1: وضع شاشة التوقف (بلا أزرار)
        web.loadUrl(BASE + (dream ? "?app=1&dream=1" : "?app=1"));
        return web;
    }

    /** يستدعيه الإعداد في الواجهة: فتح إعدادات شاشة التوقف، والتشغيل التلقائي عند تشغيل التلفاز */
    static final class Bridge {
        private final Context ctx;
        Bridge(Context ctx) { this.ctx = ctx; }

        @JavascriptInterface
        public boolean openScreensaverSettings() {
            String[] actions = { Settings.ACTION_DREAM_SETTINGS, Settings.ACTION_SETTINGS };
            for (String a : actions) {
                try {
                    ctx.startActivity(new Intent(a).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return true;
                } catch (Exception ignored) {
                    // نجرب الإعدادات العامة
                }
            }
            return false;
        }

        @JavascriptInterface
        public boolean getAutostart() { return autostart(ctx); }

        /** هل يُسمح بفتح الشاشة من الخلفية (إذن الظهور فوق التطبيقات) */
        @JavascriptInterface
        public boolean canOpenFromBackground() { return TvService.canOpenFromBackground(ctx); }

        /** يجرب الصفحات بالترتيب: صفحات Android الأصلية مباشرة أولًا (قد تخفيها واجهة الشركة المصنّعة) */
        private boolean tryStart(Intent... tries) {
            for (Intent i : tries) {
                try {
                    if (i.getComponent() == null && i.resolveActivity(ctx.getPackageManager()) == null) continue;
                    ctx.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return true;
                } catch (Exception ignored) { /* التالي */ }
            }
            return false;
        }

        private static Intent comp(String pkg, String cls) { return new Intent().setClassName(pkg, cls); }

        @JavascriptInterface
        public boolean openOverlaySettings() {
            Uri me = Uri.parse("package:" + ctx.getPackageName());
            return tryStart(
                comp("com.android.tv.settings", "com.android.tv.settings.device.apps.specialaccess.SystemAlertWindowActivity").setData(me),
                comp("com.android.settings", "com.android.settings.Settings$AppDrawOverlaySettingsActivity").setData(me),
                comp("com.android.settings", "com.android.settings.Settings$OverlaySettingsActivity"),
                new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, me),
                new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, me),
                new Intent(Settings.ACTION_SETTINGS));
        }

        /** إعدادات Android الكاملة (تحت واجهة الشركة المصنّعة) */
        @JavascriptInterface
        public boolean openAndroidSettings() {
            return tryStart(
                comp("com.android.tv.settings", "com.android.tv.settings.MainSettings"),
                comp("com.android.settings", "com.android.settings.Settings"),
                new Intent(Settings.ACTION_SETTINGS));
        }

        /** نسخة Android ونوع الجهاز (للتشخيص) */
        @JavascriptInterface
        public String getDevice() {
            return "Android " + android.os.Build.VERSION.RELEASE + " (SDK " + android.os.Build.VERSION.SDK_INT + ") — " + android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL;
        }

        // ---------- وضع «الشاشة الرئيسية» (لا يحتاج أي إذن) ----------
        @JavascriptInterface
        public boolean getHomeMode() {
            int st = ctx.getPackageManager().getComponentEnabledSetting(new android.content.ComponentName(ctx, "org.rafiqalmuslim.tv.HomeAlias"));
            return st == android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
        }

        /** تفعيل الشاشة كواجهة رئيسية: تظهر عند تشغيل التلفاز وعند ضغط زر Home */
        @JavascriptInterface
        public void setHomeMode(boolean on) {
            ctx.getPackageManager().setComponentEnabledSetting(
                new android.content.ComponentName(ctx, "org.rafiqalmuslim.tv.HomeAlias"),
                on ? android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED : android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                android.content.pm.PackageManager.DONT_KILL_APP);
        }

        /** يعرض نافذة اختيار الواجهة الرئيسية (بضغط زر Home) */
        @JavascriptInterface
        public void pressHome() {
            tryStart(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME));
        }

        /** يفتح واجهة التلفاز الأصلية (الشاشة الرئيسية للشركة المصنّعة)، لا قائمة التطبيقات */
        @JavascriptInterface
        public boolean openOriginalHome() {
            android.content.pm.PackageManager pm = ctx.getPackageManager();
            Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
            for (android.content.pm.ResolveInfo ri : pm.queryIntentActivities(home, 0)) {
                String pkg = ri.activityInfo.packageName;
                String cls = ri.activityInfo.name;
                // نتجاوز تطبيقنا وواجهة «الإقلاع» المؤقتة في إعدادات Android
                if (pkg.equals(ctx.getPackageName()) || cls.endsWith("FallbackHome")) continue;
                Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).setClassName(pkg, cls);
                if (tryStart(i)) return true;
            }
            return false;
        }

        /** التطبيقات المثبتة (للزر «التطبيقات» في وضع الشاشة الرئيسية): [{"label","pkg","icon"}] */
        @JavascriptInterface
        public String getApps() {
            org.json.JSONArray out = new org.json.JSONArray();
            android.content.pm.PackageManager pm = ctx.getPackageManager();
            java.util.Set<String> seen = new java.util.HashSet<>();
            String[] cats = { Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER };
            for (String cat : cats) {
                for (android.content.pm.ResolveInfo ri : pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(cat), 0)) {
                    String pkg = ri.activityInfo.packageName;
                    if (pkg.equals(ctx.getPackageName()) || !seen.add(pkg)) continue;
                    try {
                        JSONObject o = new JSONObject();
                        o.put("label", String.valueOf(ri.loadLabel(pm)));
                        o.put("pkg", pkg);
                        o.put("icon", iconData(ri.loadIcon(pm)));
                        out.put(o);
                    } catch (Exception ignored) { /* التالي */ }
                }
            }
            return out.toString();
        }

        @JavascriptInterface
        public boolean launchApp(String pkg) {
            android.content.pm.PackageManager pm = ctx.getPackageManager();
            Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
            if (i == null) i = pm.getLaunchIntentForPackage(pkg);
            return i != null && tryStart(i);
        }

        private static String iconData(android.graphics.drawable.Drawable d) {
            android.graphics.Bitmap bmp = android.graphics.Bitmap.createBitmap(96, 96, android.graphics.Bitmap.Config.ARGB_8888);
            android.graphics.Canvas c = new android.graphics.Canvas(bmp);
            d.setBounds(0, 0, 96, 96);
            d.draw(c);
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 90, bos);
            return "data:image/png;base64," + android.util.Base64.encodeToString(bos.toByteArray(), android.util.Base64.NO_WRAP);
        }

        /** حالة الخدمات للتشخيص: {"service":…, "overlay":…, "accessibility":…, "idleMinutes":…, "events":{…}} */
        @JavascriptInterface
        public String getStatus() {
            try {
                JSONObject o = new JSONObject();
                o.put("service", TvService.running);
                o.put("overlay", android.os.Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx));
                o.put("accessibility", IdleWatcher.connected);
                o.put("idleMinutes", TvService.prefs(ctx).getInt(TvService.KEY_IDLE_MIN, 5));
                o.put("events", new JSONObject(TvService.prefs(ctx).getString(TvService.KEY_EVENTS, "{}")));
                return o.toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public boolean openAccessibilitySettings() {
            return tryStart(
                comp("com.android.tv.settings", "com.android.tv.settings.accessibility.AccessibilityActivity"),
                comp("com.android.settings", "com.android.settings.Settings$AccessibilitySettingsActivity"),
                comp("com.android.settings", "com.android.settings.accessibility.AccessibilitySettings"),
                new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS),
                new Intent(Settings.ACTION_SETTINGS));
        }

        @JavascriptInterface
        public void setIdleMinutes(int m) { TvService.prefs(ctx).edit().putInt(TvService.KEY_IDLE_MIN, m).apply(); }

        @JavascriptInterface
        public void startService() { TvService.start(ctx); }

        @JavascriptInterface
        public boolean getIdleTakeover() { return TvService.prefs(ctx).getBoolean(TvService.KEY_IDLE, true); }

        @JavascriptInterface
        public void setIdleTakeover(boolean on) { TvService.prefs(ctx).edit().putBoolean(TvService.KEY_IDLE, on).apply(); }

        /** جدول الأذان للأيام القادمة (تحسبه الواجهة) لتفتح الخدمة الشاشة عند دخول الوقت */
        @JavascriptInterface
        public void setSchedule(String json) {
            TvService.prefs(ctx).edit().putString(TvService.KEY_SCHEDULE, json).apply();
            TvService.start(ctx);
        }

        @JavascriptInterface
        public void setAutostart(boolean on) {
            SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            e.putBoolean(KEY_AUTOSTART, on).apply();
        }
    }

    /**
     * بعض أجهزة التلفاز (Android قديم) لا تعرف نوع ملفات ‎.js‎، فيرفض المتصفح تشغيل الواجهة (شاشة سوداء):
     * نحدد النوع صراحة من امتداد الملف.
     */
    static WebResourceResponse withMime(Uri uri, WebResourceResponse r) {
        if (r == null || uri.getPath() == null) return r;
        String p = uri.getPath().toLowerCase();
        String mime = null;
        if (p.endsWith(".js") || p.endsWith(".mjs")) mime = "text/javascript";
        else if (p.endsWith(".css")) mime = "text/css";
        else if (p.endsWith(".html")) mime = "text/html";
        else if (p.endsWith(".json")) mime = "application/json";
        else if (p.endsWith(".svg")) mime = "image/svg+xml";
        else if (p.endsWith(".woff2")) mime = "font/woff2";
        else if (p.endsWith(".woff")) mime = "font/woff";
        else if (p.endsWith(".png")) mime = "image/png";
        if (mime == null) return r;
        WebResourceResponse out = new WebResourceResponse(mime, "UTF-8", r.getData());
        out.setResponseHeaders(java.util.Collections.singletonMap("Access-Control-Allow-Origin", "*"));
        return out;
    }
}
