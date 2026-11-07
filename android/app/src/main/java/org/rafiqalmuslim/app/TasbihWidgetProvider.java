package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * ودجت رفيق بلس: المسبحة. كل ضغطة تزيد العدّ؛ وتتتابع الأذكار ٣٣ مرة لكل منها:
 * سبحان الله، الحمد لله، الله أكبر (كما في التسبيح بعد الصلاة — رواه مسلم 597).
 */
public class TasbihWidgetProvider extends AppWidgetProvider {
    /** تغيير المقاس: تُرسم الخلفية من جديد بالمقاس الجديد */
    @Override
    public void onAppWidgetOptionsChanged(android.content.Context c, android.appwidget.AppWidgetManager m, int id, android.os.Bundle o) {
        WidgetStyle.refreshEverything(c);
    }

    static final String ACTION_INC = "org.rafiqalmuslim.app.TASBIH_INC";
    static final String ACTION_RESET = "org.rafiqalmuslim.app.TASBIH_RESET";
    static final String ACTION_MODE = "org.rafiqalmuslim.app.TASBIH_MODE";
    /** الأذكار: «seq» التسبيح بعد الصلاة ٣٣×٣ (كما كان)، أو ذكر واحد بعدّ ١٠٠ */
    static final String[] MODES = { "seq", "subhan", "hamd", "akbar", "tahlil", "istighfar", "salawat", "hawqala" };
    static final String[] MODE_TEXT = { "", "سبحان الله", "الحمد لله", "الله أكبر", "لا إله إلا الله", "أستغفر الله", "اللهم صلِّ على محمد", "لا حول ولا قوة إلا بالله" };
    private static final String KEY_COUNT = "tasbih_count";
    private static final String[] PHRASES = { "سبحان الله", "الحمد لله", "الله أكبر" };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        SharedPreferences p = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE);
        int id = intent.getIntExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, -1);
        String k = countKey(p, id);
        if (ACTION_INC.equals(a)) { p.edit().putInt(k, p.getInt(k, 0) + 1).apply(); WidgetKit.tick(c); }
        else if (ACTION_RESET.equals(a)) p.edit().putInt(k, 0).apply();
        else if (ACTION_MODE.equals(a) && id >= 0) p.edit().putInt("ts_mode_" + id, (modeOf(c, id) + 1) % MODES.length).putInt(k, 0).apply();
        else return;
        if (id >= 0) render(c, AppWidgetManager.getInstance(c), id); else refreshAll(c);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, TasbihWidgetProvider.class))) render(c, m, id);
    }

    /** عدّ كل ودجت محفوظ وحده (ويبدأ من العدّ السابق المشترك أول مرة) */
    static String countKey(SharedPreferences p, int id) {
        if (id < 0) return KEY_COUNT;
        String k = "ts_n_" + id;
        if (!p.contains(k)) p.edit().putInt(k, p.getInt(KEY_COUNT, 0)).apply();
        return k;
    }

    static int modeOf(Context c, int id) {
        int own = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getInt("ts_mode_" + id, -1);
        if (own >= 0) return own % MODES.length;
        String pref = WidgetKit.prefs(c).optString("tasbih", "seq");
        for (int i = 0; i < MODES.length; i++) if (MODES[i].equals(pref)) return i;
        return 0;
    }

    private static PendingIntent broadcast(Context c, String action, int code) {
        return PendingIntent.getBroadcast(c, code, new Intent(c, TasbihWidgetProvider.class).setAction(action), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String ar(int n) {
        String d = String.valueOf(n);
        StringBuilder b = new StringBuilder();
        for (char ch : d.toCharArray()) b.append((char) ('٠' + (ch - '0')));
        return b.toString();
    }

    static void render(Context c, AppWidgetManager m, int id) {
        Tile t = new Tile(c, id, R.drawable.wt_tasbih, 342, 250);
        JSONObject data = PlusWidgets.load(c);
        if (data == null || !data.optBoolean("entitled", false)) {
            t.text(c.getString(data == null ? R.string.plus_empty : R.string.plus_locked), 70, 70, 196, 150, 15, Tile.WHITE, Tile.CENTER, Tile.BOLD, 4);
            m.updateAppWidget(id, t.done(PlusWidgets.openApp(c, 5)));
            return;
        }
        SharedPreferences p = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE);
        int total = p.getInt(countKey(p, id), 0);
        int mode = modeOf(c, id);
        String phrase, count, target;
        if (mode == 0) {
            int round = total % 99, idx = Math.min(2, round / 33);
            phrase = PHRASES[idx]; count = String.valueOf(round - idx * 33); target = "/ 33";
        } else {
            phrase = MODE_TEXT[mode]; count = String.valueOf(total % 100); target = "/ 100";
        }
        t.text(count, 82, 62, 182, 138, 66, Tile.WHITE, Tile.CENTER, Tile.BOLD, 1);
        t.text(Tile.ltr(target), 94, 136, 172, 166, 23, Tile.WHITE, Tile.CENTER, Tile.BOLD, 1);
        t.text(phrase, 224, 36, 332, 146, 31, Tile.CREAM, Tile.CENTER, Tile.NASKH, 3);
        t.zone(240, 162, 314, 234, WidgetKit.action(c, TasbihWidgetProvider.class, ACTION_RESET, id, 7), "تصفير");
        t.zone(224, 36, 332, 146, WidgetKit.action(c, TasbihWidgetProvider.class, ACTION_MODE, id, 4), "تغيير الذكر");
        m.updateAppWidget(id, t.done(WidgetKit.action(c, TasbihWidgetProvider.class, ACTION_INC, id, 6)));
    }
}
