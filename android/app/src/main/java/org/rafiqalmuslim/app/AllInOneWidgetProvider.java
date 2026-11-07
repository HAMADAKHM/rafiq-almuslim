package org.rafiqalmuslim.app;

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
 * ودجت «الكل في واحد»: الصلاة القادمة مع عدّ تنازلي حي، والمدينة والتاريخين، ومواقيت اليوم،
 * وآية اليوم، وذكر اليوم، واختصارات الأقسام. يتكيف مع المقاس: الصغير للصلاة القادمة فقط، والكبير لكل شيء.
 */
public class AllInOneWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a)) refreshAll(c);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, AllInOneWidgetProvider.class))) render(c, m, id);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_all);
        WidgetDesign.apply(c, v, R.id.o_root, id, WidgetDesign.Kind.ALL);
        v.setOnClickPendingIntent(R.id.o_top, WidgetKit.route(c, "/prayer", 60));
        v.setOnClickPendingIntent(R.id.o_q, WidgetKit.route(c, "/quran", 61));
        v.setOnClickPendingIntent(R.id.o_s, WidgetKit.route(c, "/tasbih", 62));
        v.setOnClickPendingIntent(R.id.o_k, WidgetKit.route(c, "/qibla", 63));
        v.setOnClickPendingIntent(R.id.o_a, WidgetKit.route(c, "/prayer", 64));
        try {
            JSONObject data = PrayerWidgetProvider.load(c);
            JSONArray days = data == null ? null : data.getJSONArray("days");
            long now = System.currentTimeMillis();
            int[] next = days == null ? null : PrayerWidgetProvider.findNext(days, now);
            if (data == null || data.isNull("city") || next == null) throw new Exception("no data");
            v.setViewVisibility(R.id.o_content, View.VISIBLE);
            v.setViewVisibility(R.id.o_empty, View.GONE);
            JSONObject np = days.getJSONObject(next[0]).getJSONArray("prayers").getJSONObject(next[1]);
            v.setTextViewText(R.id.o_label, "الصلاة القادمة: " + np.getString("label"));
            v.setTextViewText(R.id.o_next, np.getString("time"));
            boolean cd = WidgetKit.show(c, "countdown");
            v.setViewVisibility(R.id.o_count, cd ? View.VISIBLE : View.GONE);
            if (cd) {
                v.setChronometer(R.id.o_count, SystemClock.elapsedRealtime() + (np.getLong("at") - now), null, true);
                v.setChronometerCountDown(R.id.o_count, true);
            }
            String ayah = null, ref = null, dhikr = null, today = WidgetKit.today();
            String ds = WidgetKit.data(c).getString(DailyWidgetProvider.KEY, null);
            JSONArray dd = ds == null ? null : new JSONObject(ds).optJSONArray("days");
            for (int i = 0; dd != null && i < dd.length(); i++) {
                JSONObject o = dd.getJSONObject(i);
                if (today.equals(o.optString("date"))) { ayah = o.isNull("text") ? null : o.optString("text"); ref = o.optString("ref"); break; }
            }
            JSONObject x = WidgetKit.extra(c);
            JSONArray dk = x == null ? null : x.optJSONArray("dhikrDays");
            for (int i = 0; dk != null && i < dk.length(); i++) {
                JSONObject o = dk.getJSONObject(i);
                if (today.equals(o.optString("date"))) { dhikr = o.optString("t"); break; }
            }
            v.setTextViewText(R.id.o_ayah, ayah != null ? "﴿" + ayah + "﴾" : "");
            v.setTextViewText(R.id.o_ayah_ref, ref != null ? ref : "");
            v.setTextViewText(R.id.o_dhikr, dhikr != null && !dhikr.isEmpty() ? "ذكر اليوم: " + dhikr : "ذكر اليوم: سبحان الله وبحمده");
            int size = WidgetKit.size(c, id);
            v.setInt(R.id.o_ayah, "setMaxLines", size == 2 ? 4 : 2);
            v.setOnClickPendingIntent(R.id.o_ayah, WidgetKit.route(c, "/quran", 65));
            v.setOnClickPendingIntent(R.id.o_dhikr, WidgetKit.route(c, "/adhkar", 66));
            WidgetKit.text(c, v, R.id.o_next, 30);
            WidgetKit.text(c, v, R.id.o_ayah, 16);
        } catch (Exception e) {
            v.setViewVisibility(R.id.o_content, View.GONE);
            v.setViewVisibility(R.id.o_empty, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.o_root, WidgetKit.route(c, "/", 67));
        }
        m.updateAppWidget(id, v);
    }
}
