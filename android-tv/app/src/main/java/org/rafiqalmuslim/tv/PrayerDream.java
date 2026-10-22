package org.rafiqalmuslim.tv;

import android.service.dreams.DreamService;
import android.webkit.WebView;

/**
 * شاشة التوقف (Screen saver): حين يُترك التلفاز دون استخدام يعرض النظام شاشة المواقيت تلقائيًا،
 * ويُرفع الأذان عند دخول الوقت. أي ضغطة على جهاز التحكم تخرج منها.
 */
public class PrayerDream extends DreamService {
    private WebView web;

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setInteractive(false);
        setFullscreen(true);
        setScreenBright(true);
        web = TvWeb.create(this, true);
        setContentView(web);
    }

    @Override
    public void onDetachedFromWindow() {
        if (web != null) { web.destroy(); web = null; }
        super.onDetachedFromWindow();
    }
}
