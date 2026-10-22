package org.rafiqalmuslim.tv;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;

/**
 * مراقب عدم الاستخدام (خدمة إتاحة يفعّلها المستخدم مرة واحدة):
 * يعرف وقت آخر ضغطة على جهاز التحكم فقط — لا يقرأ محتوى الشاشة ولا يرسل شيئًا.
 * - بعد دقائق من عدم الاستخدام (ولا شيء يُشغَّل) تفتح الخدمة شاشة المواقيت.
 * - أثناء رفع الأذان: أي زر يوقفه.
 * الخدمات المرتبطة بالنظام مسموح لها بفتح الشاشة من الخلفية.
 */
public class IdleWatcher extends AccessibilityService {
    static volatile long lastKeyAt = System.currentTimeMillis();
    static volatile boolean connected = false;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        connected = true;
        lastKeyAt = System.currentTimeMillis();
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.flags |= AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
            setServiceInfo(info);
        }
        TvService.start(this);
        TvService.log(this, "accessibility_on");
    }

    @Override
    protected boolean onKeyEvent(KeyEvent event) {
        lastKeyAt = System.currentTimeMillis();
        // أثناء الأذان: أي زر يوقفه، ولا يُمرَّر للتطبيق الحالي
        if (TvService.adhanActive) {
            if (event.getAction() == KeyEvent.ACTION_UP) TvService.requestStopAdhan(this);
            return true;
        }
        return false;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) { /* لا نقرأ محتوى الشاشة */ }

    @Override
    public void onInterrupt() {}

    @Override
    public void onDestroy() {
        connected = false;
        super.onDestroy();
    }
}
