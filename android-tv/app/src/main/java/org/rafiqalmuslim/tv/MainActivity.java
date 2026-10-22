package org.rafiqalmuslim.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

/**
 * شاشة رفيق المسلم للتلفاز: تعرض واجهة الشاشة (المبنية من src/tv) من أصول التطبيق نفسه دون إنترنت،
 * وتبقي الشاشة مضاءة، وتسمح بتشغيل الأذان دون ضغطة سابقة. الإنترنت مطلوب لصوت الأذان فقط.
 */
public class MainActivity extends Activity {
    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        web = new WebView(this);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setAllowFileAccess(false);
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
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        setContentView(web);
        hideSystemUi();
        // app=1: داخل التطبيق يُسمح بالصوت مباشرة، ولا حاجة لزر «ملء الشاشة»
        web.loadUrl("https://appassets.androidplatform.net/assets/tv/tv.html?app=1");
        web.requestFocus();
    }

    /**
     * بعض أجهزة التلفاز (Android قديم) لا تعرف نوع ملفات ‎.js‎، فيرفض المتصفح تشغيل الواجهة (شاشة سوداء):
     * نحدد النوع صراحة من امتداد الملف.
     */
    private static WebResourceResponse withMime(Uri uri, WebResourceResponse r) {
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

    private void hideSystemUi() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
