package org.rafiqalmuslim.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** مسار داخل التطبيق يطلبه الضغط على ودجت (مثل «أكمل من حيث وصلت») */
    static final String EXTRA_ROUTE = "org.rafiqalmuslim.ROUTE";
    private static volatile String pendingRoute;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // إضافات محلية: ودجت المواقيت، وصوت الأذان المختار من الجهاز
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(AdhanSoundPlugin.class);
        registerPlugin(DhikrSoundPlugin.class);
        registerPlugin(AppIconPlugin.class);
        // صوت قراءة المعنى في فيديو «التفسير كالقصة»
        registerPlugin(NarrationPlugin.class);
        // التحكم بشاشة التلفاز عبر الشبكة المنزلية
        registerPlugin(TvLinkPlugin.class);
        super.onCreate(savedInstanceState);
        capture(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        capture(intent);
    }

    private static void capture(Intent i) {
        if (i == null) return;
        String r = i.getStringExtra(EXTRA_ROUTE);
        // مسارات داخلية فقط
        if (r != null && r.startsWith("/") && !r.startsWith("//")) pendingRoute = r;
        i.removeExtra(EXTRA_ROUTE);
    }

    static String takeRoute() {
        String r = pendingRoute;
        pendingRoute = null;
        return r;
    }
}
