package org.rafiqalmuslim.tv;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

/**
 * شاشة رفيق المسلم للتلفاز: تعرض واجهة الشاشة (المبنية من src/tv) من أصول التطبيق نفسه دون إنترنت،
 * وتبقي الشاشة مضاءة، وتسمح بتشغيل الأذان دون ضغطة سابقة. الإنترنت مطلوب لصوت الأذان فقط.
 */
public class MainActivity extends Activity {
    /** هل الشاشة ظاهرة الآن (حتى لا تُفتح فوق نفسها، ولا يُكرر الأذان) */
    static volatile boolean visible = false;
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        web = TvWeb.create(this, false);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        setContentView(web);
        hideSystemUi();
        web.requestFocus();
        TvService.start(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        visible = true;
        if (web != null) web.onResume();
        // أوامر الجوال تُطبَّق فورًا على الشاشة الظاهرة
        RemoteServer.screen = new RemoteServer.ScreenHook() {
            public void applyNow() { runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.__rafiqRemoteApply&&window.__rafiqRemoteApply()", null); }); }
            public boolean nextScene() { runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.__rafiqNextScene&&window.__rafiqNextScene()", null); }); return true; }
            public void backgroundsChanged() { runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.dispatchEvent(new Event('rafiq-backgrounds'))", null); }); }
            public boolean key(int code) {
                runOnUiThread(() -> {
                    dispatchKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, code));
                    dispatchKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, code));
                });
                return true;
            }
        };
        if (web != null) web.evaluateJavascript("window.__rafiqRemoteApply&&window.__rafiqRemoteApply()", null);
    }

    @Override
    protected void onPause() {
        visible = false;
        RemoteServer.screen = null;
        TvService.markActive(getApplicationContext(), null);
        TvService.onScreenLeft(getApplicationContext());
        // تعلم الصفحة أنها مخفية فتتوقف التلاوة (حتى لا تعمل فوق يوتيوب، ولا تمنع اكتشاف عدم الاستخدام)
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent e) {
        // أذان خدمة الخلفية ما زال يُرفع (بدأ والتلفاز على تطبيق آخر): أي زر يوقفه
        // (ويصل الزر للصفحة أيضًا فتُغلق شاشة الأذان)
        if (TvService.adhanActive && e.getAction() == android.view.KeyEvent.ACTION_DOWN) TvService.requestStopAdhan(this);
        return super.dispatchKeyEvent(e);
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
        // فُتحت تلقائيًا فوق لعبة أو قناة: زر الرجوع يعيد إلى ما كان عليه
        if (TvService.autoOpenAt > 0 && System.currentTimeMillis() - TvService.autoOpenAt < TvService.AUTO_GRACE_MS && moveTaskToBack(true)) return;
        if (web != null && web.canGoBack()) web.goBack();
        // في وضع الشاشة الرئيسية لا يُغلق زر الرجوع الشاشة (هي واجهة التلفاز)
        else if (!new TvWeb.Bridge(getApplicationContext()).getHomeMode()) super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
