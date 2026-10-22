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

        @JavascriptInterface
        public boolean openOverlaySettings() {
            Intent[] tries = {
                new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + ctx.getPackageName())),
                new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.getPackageName())),
                new Intent(Settings.ACTION_SETTINGS),
            };
            for (Intent i : tries) {
                try { ctx.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return true; } catch (Exception ignored) { /* التالي */ }
            }
            return false;
        }

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
