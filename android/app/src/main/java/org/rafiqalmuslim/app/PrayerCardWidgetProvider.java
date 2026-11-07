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
    /** تغيير المقاس: تُرسم الخلفية من جديد بالمقاس الجديد */
    @Override
    public void onAppWidgetOptionsChanged(android.content.Context c, android.appwidget.AppWidgetManager m, int id, android.os.Bundle o) {
        WidgetStyle.refreshEverything(c);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new android.content.ComponentName(c, PrayerCardWidgetProvider.class))) render(c, m, id);
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_prayer_card);
        WidgetDesign.apply(context, v, R.id.k_root, widgetId, WidgetDesign.Kind.PRAYER_L);
        v.setOnClickPendingIntent(R.id.k_root, WidgetKit.route(context, "/prayer", 7));
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
            JSONObject day = days.getJSONObject(next[0]);
            JSONObject np = day.getJSONArray("prayers").getJSONObject(next[1]);
            v.setTextViewText(R.id.k_time, np.getString("time"));
            v.setTextViewText(R.id.k_name, "—  " + np.getString("label") + "  —");
            boolean cd = WidgetKit.show(context, "countdown");
            v.setViewVisibility(R.id.k_count, cd ? View.VISIBLE : View.GONE);
            if (cd) {
                v.setChronometer(R.id.k_count, SystemClock.elapsedRealtime() + (np.getLong("at") - now), null, true);
                v.setChronometerCountDown(R.id.k_count, true);
            }
            v.setTextViewText(R.id.k_greg, new java.text.SimpleDateFormat("EEEE d MMMM yyyy", new java.util.Locale("ar")).format(new java.util.Date()));
            v.setTextViewText(R.id.k_hijri, day.optString("hijri", ""));
            v.setViewVisibility(R.id.k_hijri, WidgetKit.show(context, "hijri") ? View.VISIBLE : View.GONE);
            WidgetKit.text(context, v, R.id.k_time, 50);
        } catch (Exception e) {
            v.setViewVisibility(R.id.k_content, View.GONE);
            v.setViewVisibility(R.id.k_empty, View.VISIBLE);
        }
        manager.updateAppWidget(widgetId, v);
    }
}
