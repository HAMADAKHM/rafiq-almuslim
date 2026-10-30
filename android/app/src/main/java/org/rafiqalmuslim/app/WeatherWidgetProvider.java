package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** ودجت رفيق بلس: الطقس في المدينة (آخر ما جلبه التطبيق) والصلاة القادمة مع عدّ تنازلي */
public class WeatherWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_weather);
        WidgetStyle.apply(c, v, R.id.w_root, id, 0);
        v.setOnClickPendingIntent(R.id.w_root, PlusWidgets.openApp(c, 3));
        JSONObject data = PlusWidgets.load(c);
        if (PlusWidgets.showGate(c, v, data, R.id.w_content, R.id.w_empty)) { m.updateAppWidget(id, v); return; }
        v.setViewVisibility(R.id.w_content, View.VISIBLE);
        v.setViewVisibility(R.id.w_empty, View.GONE);
        JSONObject w = data.optJSONObject("weather");
        if (w != null) {
            v.setTextViewText(R.id.w_icon, w.optString("icon", ""));
            v.setTextViewText(R.id.w_temp, w.optString("temp", "") + "°");
            v.setTextViewText(R.id.w_label, w.optString("label", "") + " • " + w.optString("range", ""));
            v.setTextViewText(R.id.w_city, w.optString("city", ""));
        } else {
            v.setTextViewText(R.id.w_icon, "🌡️");
            v.setTextViewText(R.id.w_temp, "—");
            v.setTextViewText(R.id.w_label, "افتح التطبيق مع الإنترنت لتحديث الطقس");
            v.setTextViewText(R.id.w_city, "");
        }
        // الصلاة القادمة من بيانات ودجت المواقيت نفسها (محسوبة في التطبيق لسبعة أيام)
        try {
            String s = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getString(PrayerWidgetProvider.KEY, null);
            JSONArray days = s == null ? null : new JSONObject(s).getJSONArray("days");
            long now = System.currentTimeMillis();
            JSONObject next = null;
            for (int d = 0; days != null && d < days.length() && next == null; d++) {
                JSONArray ps = days.getJSONObject(d).getJSONArray("prayers");
                for (int p = 0; p < ps.length(); p++) if (ps.getJSONObject(p).getLong("at") > now) { next = ps.getJSONObject(p); break; }
            }
            if (next != null) {
                v.setTextViewText(R.id.w_prayer, next.getString("label"));
                v.setTextViewText(R.id.w_prayer_time, next.getString("time"));
                v.setChronometer(R.id.w_countdown, SystemClock.elapsedRealtime() + (next.getLong("at") - now), null, true);
                v.setChronometerCountDown(R.id.w_countdown, true);
            } else {
                v.setTextViewText(R.id.w_prayer, "—");
            }
        } catch (Exception ignored) { /* يبقى الطقس وحده */ }
        m.updateAppWidget(id, v);
    }
}
