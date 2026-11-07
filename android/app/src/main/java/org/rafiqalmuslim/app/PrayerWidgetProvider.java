package org.rafiqalmuslim.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت مواقيت الصلاة (صغير) بتصميم اللوحة المعتمدة: «العصر القادم» ووقته الكبير والعدّ التنازلي الحي،
 * وصف الصلوات الخمس والقادمة مميزة. البيانات محسوبة في التطبيق لسبعة أيام، ويُعاد الرسم عند دخول كل وقت.
 */
public class PrayerWidgetProvider extends AppWidgetProvider {
    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, id); }

    static final String PREFS = "rafiq_widget";
    static final String KEY = "data";
    static final String ACTION_TICK = "org.rafiqalmuslim.app.WIDGET_TICK";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
        scheduleNext(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String a = intent.getAction();
        if (ACTION_TICK.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a) || Intent.ACTION_DATE_CHANGED.equals(a)) {
            refreshAll(context);
        }
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
        for (int id : ids) render(context, manager, id);
        int[] cards = manager.getAppWidgetIds(new ComponentName(context, PrayerCardWidgetProvider.class));
        for (int id : cards) PrayerCardWidgetProvider.render(context, manager, id);
        if (ids.length > 0 || cards.length > 0) scheduleNext(context);
        PlusWidgets.refreshAll(context);
        LockNotif.update(context);
        AllInOneWidgetProvider.refreshAll(context);
    }

    static JSONObject load(Context context) {
        try {
            String s = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** [يوم، صلاة] لأول صلاة لم يدخل وقتها بعد، أو null */
    static int[] findNext(JSONArray days, long now) throws Exception {
        for (int d = 0; d < days.length(); d++) {
            JSONArray prayers = days.getJSONObject(d).getJSONArray("prayers");
            for (int p = 0; p < prayers.length(); p++) {
                if (prayers.getJSONObject(p).getLong("at") > now) return new int[] { d, p };
            }
        }
        return null;
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        Tile t = new Tile(context, widgetId, R.drawable.wt_prayer, 470, 296);
        try {
            JSONObject data = load(context);
            JSONArray days = data == null ? null : data.getJSONArray("days");
            long now = System.currentTimeMillis();
            int[] next = days == null ? null : findNext(days, now);
            if (data == null || data.isNull("city") || next == null) throw new Exception("no data");
            JSONObject day = days.getJSONObject(next[0]);
            JSONArray prayers = day.getJSONArray("prayers");
            JSONObject np = prayers.getJSONObject(next[1]);
            t.text(np.getString("label") + " القادم", 196, 60, 364, 100, 25, Tile.GOLD, Tile.RIGHT, Tile.BOLD, 1);
            t.text(Tile.hm(np.getString("time")), 205, 100, 392, 164, 62, Tile.WHITE, Tile.RIGHT, Tile.BOLD, 1);
            if (WidgetKit.show(context, "countdown")) t.countdown(np.getLong("at") - now, 200, 172, 352, 202, 23, Tile.WHITE);
            // الصلوات الخمس من اليمين: الفجر … العشاء، والقادمة مميزة كما في التصميم
            float x0 = 14, cw = 88.4f;
            for (int i = 0; i < 5 && i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                float r = 456 - i * cw, l = r - cw + 5;
                boolean on = i == next[1];
                t.rrect(l, 223, r, 285, 10, on ? 0x80A8913C : 0x2E000000);
                t.stroke(l, 223, r, 285, 10, on ? 0x66E9C46A : 0x1FFFFFFF, 0.8f);
                t.text(p.getString("label"), l, 227, r, 251, 18, on ? Tile.GOLD : 0xFFF2EAD8, Tile.CENTER, Tile.BOLD, 1);
                t.text(Tile.hm(p.getString("time")), l, 252, r, 280, 21, Tile.WHITE, Tile.CENTER, Tile.BOLD, 1);
            }
        } catch (Exception e) {
            t.text(context.getString(R.string.widget_empty), 196, 70, 460, 205, 19, Tile.WHITE, Tile.CENTER, Tile.BOLD, 4);
        }
        manager.updateAppWidget(widgetId, t.done(WidgetKit.route(context, "/prayer", 0)));
    }

    /** إعادة الرسم بعد دخول الصلاة القادمة مباشرة (تنبيه غير دقيق يكفي لتحديث الشكل) */
    static void scheduleNext(Context context) {
        try {
            JSONObject data = load(context);
            if (data == null) return;
            JSONArray days = data.getJSONArray("days");
            int[] next = findNext(days, System.currentTimeMillis());
            if (next == null) return;
            long at = days.getJSONObject(next[0]).getJSONArray("prayers").getJSONObject(next[1]).getLong("at") + 1000;
            Intent tick = new Intent(context, PrayerWidgetProvider.class).setAction(ACTION_TICK);
            PendingIntent pi = PendingIntent.getBroadcast(context, 1, tick, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.setWindow(AlarmManager.RTC, at, 60_000, pi);
        } catch (Exception ignored) {
            // الودجت يعرض آخر حالة، ويُحدَّث عند فتح التطبيق
        }
    }
}
