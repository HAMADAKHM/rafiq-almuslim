package org.rafiqalmuslim.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت مواقيت الصلاة: الصلاة القادمة مع عدّ تنازلي، ومواقيت اليوم الخمس.
 * البيانات محسوبة في التطبيق لسبعة أيام (لا حساب هنا)، ويُعاد رسم الودجت عند دخول كل وقت.
 */
public class PrayerWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "rafiq_widget";
    static final String KEY = "data";
    static final String ACTION_TICK = "org.rafiqalmuslim.app.WIDGET_TICK";

    private static final int[] CELLS = { R.id.cell_0, R.id.cell_1, R.id.cell_2, R.id.cell_3, R.id.cell_4 };
    private static final int[] NAMES = { R.id.p_name_0, R.id.p_name_1, R.id.p_name_2, R.id.p_name_3, R.id.p_name_4 };
    private static final int[] TIMES = { R.id.p_time_0, R.id.p_time_1, R.id.p_time_2, R.id.p_time_3, R.id.p_time_4 };

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
        if (ids.length > 0) scheduleNext(context);
        PlusWidgets.refreshAll(context);
    }

    private static JSONObject load(Context context) {
        try {
            String s = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** [يوم، صلاة] لأول صلاة لم يدخل وقتها بعد، أو null */
    private static int[] findNext(JSONArray days, long now) throws Exception {
        for (int d = 0; d < days.length(); d++) {
            JSONArray prayers = days.getJSONObject(d).getJSONArray("prayers");
            for (int p = 0; p < prayers.length(); p++) {
                if (prayers.getJSONObject(p).getLong("at") > now) return new int[] { d, p };
            }
        }
        return null;
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_prayer);
        WidgetStyle.apply(context, v, R.id.widget_root);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        JSONObject data = load(context);
        try {
            JSONArray days = data == null ? null : data.getJSONArray("days");
            long now = System.currentTimeMillis();
            int[] next = days == null ? null : findNext(days, now);
            if (data == null || data.isNull("city") || next == null) {
                v.setViewVisibility(R.id.widget_content, View.GONE);
                v.setViewVisibility(R.id.widget_empty, View.VISIBLE);
                manager.updateAppWidget(widgetId, v);
                return;
            }
            v.setViewVisibility(R.id.widget_content, View.VISIBLE);
            v.setViewVisibility(R.id.widget_empty, View.GONE);
            JSONObject day = days.getJSONObject(next[0]);
            JSONArray prayers = day.getJSONArray("prayers");
            JSONObject np = prayers.getJSONObject(next[1]);
            v.setTextViewText(R.id.city, data.getString("city"));
            v.setTextViewText(R.id.hijri, day.optString("hijri", ""));
            v.setTextViewText(R.id.next_name, np.getString("label"));
            v.setTextViewText(R.id.next_time, np.getString("time"));
            long left = np.getLong("at") - now;
            v.setChronometer(R.id.countdown, SystemClock.elapsedRealtime() + left, null, true);
            v.setChronometerCountDown(R.id.countdown, true);
            for (int i = 0; i < CELLS.length && i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                v.setTextViewText(NAMES[i], p.getString("label"));
                v.setTextViewText(TIMES[i], p.getString("time"));
                v.setInt(CELLS[i], "setBackgroundResource", i == next[1] ? R.drawable.widget_cell_active : R.drawable.widget_cell);
            }
        } catch (Exception e) {
            v.setViewVisibility(R.id.widget_content, View.GONE);
            v.setViewVisibility(R.id.widget_empty, View.VISIBLE);
        }
        manager.updateAppWidget(widgetId, v);
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
