package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت «بطاقة الصلاة القادمة»: كقسم الصلاة في الرئيسية — اسم الصلاة القادمة ووقتها والعدّ التنازلي
 * ولوحة المسجد والمدينة، ثم الصلوات الخمس بأيقوناتها والقادمة على خلفية ذهبية.
 * البيانات نفسها التي يحسبها التطبيق لودجت المواقيت (لا حساب هنا)، ويُعاد الرسم عند دخول كل وقت.
 */
public class PrayerCardWidgetProvider extends AppWidgetProvider {
    private static final int[] CELLS = { R.id.k_cell_0, R.id.k_cell_1, R.id.k_cell_2, R.id.k_cell_3, R.id.k_cell_4 };
    private static final int[] ICONS = { R.id.k_icon_0, R.id.k_icon_1, R.id.k_icon_2, R.id.k_icon_3, R.id.k_icon_4 };
    private static final int[] NAMES = { R.id.k_name_0, R.id.k_name_1, R.id.k_name_2, R.id.k_name_3, R.id.k_name_4 };
    private static final int[] TIMES = { R.id.k_time_0, R.id.k_time_1, R.id.k_time_2, R.id.k_time_3, R.id.k_time_4 };
    private static final int GOLD = 0xFFF6C35A, INK = 0xFF1B1640, MUTED = 0xFFCFC8EC, WHITE = 0xFFFFFFFF;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
        PrayerWidgetProvider.scheduleNext(context);
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_prayer_card);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.k_root, PendingIntent.getActivity(context, 7, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        JSONObject data = PrayerWidgetProvider.load(context);
        try {
            JSONArray days = data == null ? null : data.getJSONArray("days");
            long now = System.currentTimeMillis();
            int[] next = days == null ? null : PrayerWidgetProvider.findNext(days, now);
            if (data == null || data.isNull("city") || next == null) {
                v.setViewVisibility(R.id.k_content, View.GONE);
                v.setViewVisibility(R.id.k_empty, View.VISIBLE);
                manager.updateAppWidget(widgetId, v);
                return;
            }
            v.setViewVisibility(R.id.k_content, View.VISIBLE);
            v.setViewVisibility(R.id.k_empty, View.GONE);
            JSONArray prayers = days.getJSONObject(next[0]).getJSONArray("prayers");
            JSONObject np = prayers.getJSONObject(next[1]);
            v.setTextViewText(R.id.k_name, np.getString("label"));
            v.setTextViewText(R.id.k_time, np.getString("time"));
            v.setTextViewText(R.id.k_city, data.getString("city"));
            v.setChronometer(R.id.k_count, SystemClock.elapsedRealtime() + (np.getLong("at") - now), null, true);
            v.setChronometerCountDown(R.id.k_count, true);
            for (int i = 0; i < CELLS.length && i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                boolean on = i == next[1];
                v.setTextViewText(NAMES[i], p.getString("label"));
                v.setTextViewText(TIMES[i], p.getString("time"));
                v.setInt(CELLS[i], "setBackgroundResource", on ? R.drawable.widget_card_active : R.drawable.widget_card_cell);
                v.setTextColor(NAMES[i], on ? INK : MUTED);
                v.setTextColor(TIMES[i], on ? INK : WHITE);
                v.setInt(ICONS[i], "setColorFilter", on ? INK : GOLD);
            }
        } catch (Exception e) {
            v.setViewVisibility(R.id.k_content, View.GONE);
            v.setViewVisibility(R.id.k_empty, View.VISIBLE);
        }
        manager.updateAppWidget(widgetId, v);
    }
}
