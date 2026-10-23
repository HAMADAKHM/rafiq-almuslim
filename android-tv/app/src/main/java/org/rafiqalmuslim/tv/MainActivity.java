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
    protected void onResume() { super.onResume(); visible = true; }

    @Override
    protected void onPause() { visible = false; super.onPause(); }

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
        // في وضع الشاشة الرئيسية لا يُغلق زر الرجوع الشاشة (هي واجهة التلفاز)
        else if (!new TvWeb.Bridge(getApplicationContext()).getHomeMode()) super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
