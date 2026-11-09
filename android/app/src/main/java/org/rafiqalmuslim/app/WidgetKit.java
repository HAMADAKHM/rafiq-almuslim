package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.TypedValue;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/**
 * أدوات مشتركة لودجتات رفيق المسلم: مقاس الودجت (صغير/متوسط/كبير)، وإعدادات «استوديو الودجت»
 * (العناصر الظاهرة وحجم الخط ونوع الأذكار والاهتزاز)، ولون الكتابة للخلفية الفاتحة، وفتح قسم معيّن من التطبيق.
 */
final class WidgetKit {
    private WidgetKit() {}
    static final String KEY_EXTRA = "extra";
    static final String KEY_PREFS = "wprefs";

    static SharedPreferences data(Context c) { return c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE); }

    static JSONObject extra(Context c) {
        try { String s = data(c).getString(KEY_EXTRA, null); return s == null ? null : new JSONObject(s); } catch (Exception e) { return null; }
    }

    static JSONObject prefs(Context c) {
        try { String s = c.getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).getString(KEY_PREFS, null); return s == null ? new JSONObject() : new JSONObject(s); } catch (Exception e) { return new JSONObject(); }
    }

    static boolean show(Context c, String key) { return prefs(c).optBoolean(key, true); }

    static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }

    /** 0 صغير، 1 متوسط، 2 كبير — بحسب ارتفاع الودجت وعرضه الحاليين (يتغير عند تغيير الحجم) */
    static int size(Context c, int id) {
        try {
            Bundle o = AppWidgetManager.getInstance(c).getAppWidgetOptions(id);
            int h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0), w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
            if (h <= 0) return 1;
            if (h < 100 || w < 150) return 0;
            if (h < 210) return 1;
            return 2;
        } catch (Exception e) { return 1; }
    }

    /** حجم الخط من الاستوديو (85–130٪) */
    static void text(Context c, RemoteViews v, int viewId, float sp) {
        int pct = Math.max(85, Math.min(130, prefs(c).optInt("font", 100)));
        v.setTextViewTextSize(viewId, TypedValue.COMPLEX_UNIT_SP, sp * pct / 100f);
    }

    /** الخلفية الفاتحة (الكريمي): كتابة داكنة بدل البيضاء */
    static boolean light(Context c, int id) {
        String own = WidgetStyle.forWidget(c, id);
        String s = own != null ? own : WidgetStyle.global(c);
        return "g-light".equals(s) && WidgetStyle.alphaFor(c, id) > 30;
    }

    static void tint(RemoteViews v, boolean light, int[] main, int[] accent, int[] muted) {
        if (!light) return;
        for (int id : main) v.setTextColor(id, 0xFF1B2F2A);
        for (int id : accent) v.setTextColor(id, 0xFF8A6A1F);
        for (int id : muted) v.setTextColor(id, 0xFF4B5A52);
    }

    /** فتح قسم معيّن من التطبيق (مسار داخلي فقط) */
    static PendingIntent route(Context c, String route, int code) {
        Intent i = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (route != null && route.startsWith("/") && !route.startsWith("//")) i.putExtra(MainActivity.EXTRA_ROUTE, route);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** أمر للودجت نفسه (زيادة، التالي…) مع رقم الودجت */
    static PendingIntent action(Context c, Class<?> cls, String action, int widgetId, int code) {
        Intent i = new Intent(c, cls).setAction(action).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        return PendingIntent.getBroadcast(c, code * 10000 + (widgetId % 10000), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String ar(int n) { return TasbihWidgetProvider.ar(n); }

    /** اهتزاز قصير اختياري (من الاستوديو) */
    static void tick(Context c) { tick(c, false); }

    /**
     * ردّ فعل الضغط على المسبحة والأذكار: اهتزاز (خفيف أو قوي) وصوت نقرة، أو صوت «تمام» عند اكتمال الدورة.
     * الصوت يحترم وضع الصامت والاهتزاز في الجوال، والإعدادات من «استوديو الودجت».
     */
    static void tick(Context c, boolean round) {
        JSONObject p = prefs(c);
        if (p.optBoolean("vibrate", true)) {
            try {
                android.os.Vibrator vib = (android.os.Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
                if (vib != null && vib.hasVibrator()) {
                    boolean strong = "strong".equals(p.optString("vibrateLevel", "light"));
                    long ms = round ? 160 : strong ? 40 : 18;
                    int amp = round || strong ? 255 : 120;
                    if (android.os.Build.VERSION.SDK_INT >= 26) vib.vibrate(android.os.VibrationEffect.createOneShot(ms, amp));
                    else vib.vibrate(ms);
                }
            } catch (Exception ignored) {}
        }
        if (p.optBoolean("tapSound", true)) {
            try {
                android.media.AudioManager am = (android.media.AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
                if (am == null || am.getRingerMode() == android.media.AudioManager.RINGER_MODE_NORMAL) playTap(c, round ? R.raw.w_round : R.raw.w_tick);
            } catch (Exception ignored) {}
        }
    }

    private static android.media.SoundPool pool;
    private static int tickId, roundId;
    private static final java.util.Set<Integer> loaded = new java.util.HashSet<>();

    /** صوت قصير بزمن استجابة منخفض (SoundPool محمَّل مرة واحدة) */
    private static synchronized void playTap(Context c, int res) {
        if (pool == null) {
            android.media.AudioAttributes aa = new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            pool = new android.media.SoundPool.Builder().setMaxStreams(3).setAudioAttributes(aa).build();
            pool.setOnLoadCompleteListener((sp, id, status) -> {
                if (status != 0) return;
                synchronized (WidgetKit.class) { loaded.add(id); }
                if (id == pending) { sp.play(id, 0.8f, 0.8f, 1, 0, 1f); pending = -1; }
            });
            tickId = pool.load(c.getApplicationContext(), R.raw.w_tick, 1);
            roundId = pool.load(c.getApplicationContext(), R.raw.w_round, 1);
        }
        int id = res == R.raw.w_round ? roundId : tickId;
        if (loaded.contains(id)) pool.play(id, 0.8f, 0.8f, 1, 0, 1f);
        else pending = id;
    }
    private static int pending = -1;

    /** آخر موضع قراءة فعلية (يحفظه التطبيق) — لزر «متابعة القراءة» في ودجت القرآن */
    static final String RESUME = "resume";
    static org.json.JSONObject resume(Context c) {
        try {
            String s = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getString(RESUME, null);
            return s == null ? null : new org.json.JSONObject(s);
        } catch (Exception e) { return null; }
    }
}
