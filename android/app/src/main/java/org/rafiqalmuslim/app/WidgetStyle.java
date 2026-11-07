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
    static final String[] IDS = { "g-app", "g-light", "g-night", "g-mosque", "g-quran", "g-kaaba", "g-madinah", "g-pattern", "emerald", "indigo", "royal", "night", "turquoise", "dawn", "nature", "violet", "rose", "evening", "glass" };
    static final String[] NAMES = { "تصميم التطبيق (الأصلي)", "الفاتح العاجي", "ليلة الهلال", "المسجد عند الغروب", "المصحف الشريف", "الكعبة المشرفة", "المسجد النبوي", "النقش الأخضر", "الزمردي الذهبي", "النيلي الذهبي", "الملكي", "الليلي", "الفيروزي", "الفجر", "الطبيعي", "البنفسجي", "الوردي", "المساء", "زجاجي شفاف" };
    static final String KEY_PLUS = "plus";
    static final String KEY_TEXT = "text_";

    static final String DEFAULT = "g-app";
    static final String KEY_SHAPE = "shape";

    static int background(Context c) {
        return resOf(global(c));
    }

    /** التصميم العام (الافتراضي: صورة «ليلة الهلال» بإطار ذهبي كما في التطبيق) */
    static String global(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, DEFAULT);
    }

    /** التصاميم المجانية: صور التصميم الذهبي والأصلي؛ والملوّنة لمشتركي بلس */
    static boolean free(String s) { return s != null && (s.equals("emerald") || WidgetArt.isArt(s)); }

    /** شكل الودجت: الخاص به أو العام */
    static String shapeFor(Context c, int widgetId) {
        android.content.SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return p.getString("s_" + widgetId, p.getString(KEY_SHAPE, "round"));
    }

    /** شفافية خلفية الودجت (رفيق بلس): 100 معتمة … 0 شفافة تمامًا؛ الخاصة بالودجت أو العامة */
    static int alphaFor(Context c, int widgetId) {
        if (!plus(c)) return 100;
        android.content.SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return Math.max(0, Math.min(100, p.getInt("a_" + widgetId, p.getInt("alpha", 100))));
    }

    static void setAlphaForWidget(Context c, int widgetId, int alpha) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("a_" + widgetId, alpha).apply();
        refreshEverything(c);
    }

    static void setShapeForWidget(Context c, int widgetId, String shape) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("s_" + widgetId, shape).apply();
        refreshEverything(c);
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
        String style = own != null && (free(own) || plus(c)) ? own : global(c);
        if (!free(style) && !plus(c)) style = DEFAULT;
        applyStyle(c, v, rootId, widgetId, style);
    }

    /** يرسم خلفية بتصميم محدد (مثل خلفية اليوم في ودجت الدعاء) مع الشكل والشفافية المختارين */
    static void applyStyle(Context c, RemoteViews v, int rootId, int widgetId, String style) {
        int alpha = alphaFor(c, widgetId);
        // الخلفية صورة خلف المحتوى، فتُضبط شفافيتها دون أن تتأثر الكتابة
        v.setInt(rootId, "setBackgroundColor", 0);
        if (alpha <= 0) { v.setViewVisibility(R.id.wbg, android.view.View.GONE); return; }
        boolean drawn = false;
        if (WidgetArt.isArt(style)) {
            try {
                v.setImageViewBitmap(R.id.wbg, WidgetArt.render(c, style, shapeFor(c, widgetId), widgetId));
                drawn = true;
            } catch (Throwable t) { style = "emerald"; }
        }
        if (!drawn) v.setImageViewResource(R.id.wbg, resOf(style));
        v.setViewVisibility(R.id.wbg, android.view.View.VISIBLE);
        v.setInt(R.id.wbg, "setImageAlpha", Math.round(alpha * 2.55f));
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
        AdhkarWidgetProvider.refreshAll(c);
        DuaWidgetProvider.refreshAll(c);
        AllInOneWidgetProvider.refreshAll(c);
    }

    static void set(Context c, String style) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, style).apply();
        refreshEverything(c);
    }
}
