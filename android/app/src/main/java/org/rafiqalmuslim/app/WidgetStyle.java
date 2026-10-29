package org.rafiqalmuslim.app;

import android.content.Context;
import android.widget.RemoteViews;

/**
 * «تصميم الودجت» (رفيق بلس): خلفية واحدة يختارها المستخدم لكل ودجتات التطبيق، بألوان الثيمات.
 * الاختيار تحفظه الواجهة بعد التحقق من الاشتراك، وتعيده إلى الأصلي عند انتهائه.
 */
final class WidgetStyle {
    static final String PREFS = "rafiq_widget_style";
    static final String KEY = "style";
    private WidgetStyle() {}

    static int background(Context c) {
        String s = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "emerald");
        switch (s == null ? "" : s) {
            case "royal": return R.drawable.widget_bg_royal;
            case "night": return R.drawable.widget_bg_night;
            case "turquoise": return R.drawable.widget_bg_turquoise;
            case "dawn": return R.drawable.widget_bg_dawn;
            case "nature": return R.drawable.widget_bg_nature;
            case "violet": return R.drawable.widget_bg_violet;
            case "rose": return R.drawable.widget_bg_rose;
            case "evening": return R.drawable.widget_bg_evening;
            case "glass": return R.drawable.widget_bg_glass;
            default: return R.drawable.widget_bg;
        }
    }

    static void apply(Context c, RemoteViews v, int rootId) {
        v.setInt(rootId, "setBackgroundResource", background(c));
    }

    static void set(Context c, String style) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, style).apply();
        PrayerWidgetProvider.refreshAll(c);
        DailyWidgetProvider.refreshAll(c);
        ResumeWidgetProvider.refreshAll(c);
        PlusWidgets.refreshAll(c);
    }
}
