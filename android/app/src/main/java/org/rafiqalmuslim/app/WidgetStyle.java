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

    /** التصاميم بالترتيب (المعرّف، الاسم، والخلفية) — تعرضها شاشة «إعداد الودجت» */
    static final String[] IDS = { "emerald", "indigo", "royal", "night", "turquoise", "dawn", "nature", "violet", "rose", "evening", "glass" };
    static final String[] NAMES = { "الزمردي (الأصلي)", "النيلي الذهبي", "الملكي", "الليلي", "الفيروزي", "الفجر", "الطبيعي", "البنفسجي", "الوردي", "المساء", "زجاجي شفاف" };
    static final String KEY_PLUS = "plus";
    static final String KEY_TEXT = "text_";

    static int background(Context c) {
        return resOf(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "emerald"));
    }

    /** تصميم ودجت بعينه (من «إعداد الودجت»)، أو null فيتبع التصميم العام */
    static String forWidget(Context c, int widgetId) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("w_" + widgetId, null);
    }

    static boolean plus(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_PLUS, false); }

    static int resOf(String s) {
        switch (s == null ? "" : s) {
            case "indigo": return R.drawable.widget_bg_indigo;
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

    /** خلفية ودجت بعينه: اختياره الخاص إن وُجد (وبلس فعّال لغير الأصلي)، وإلا العام أو الافتراضي المعطى */
    static void apply(Context c, RemoteViews v, int rootId, int widgetId, int fallbackRes) {
        String own = forWidget(c, widgetId);
        if (own != null && (own.equals("emerald") || plus(c))) v.setInt(rootId, "setBackgroundResource", resOf(own));
        else if (fallbackRes != 0) v.setInt(rootId, "setBackgroundResource", fallbackRes);
        else apply(c, v, rootId);
    }

    static void setForWidget(Context c, int widgetId, String style) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("w_" + widgetId, style).apply();
        refreshEverything(c);
    }

    static void refreshEverything(Context c) {
        PrayerWidgetProvider.refreshAll(c);
        DailyWidgetProvider.refreshAll(c);
        ResumeWidgetProvider.refreshAll(c);
        PlusWidgets.refreshAll(c);
    }

    static void set(Context c, String style) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, style).apply();
        refreshEverything(c);
    }
}
