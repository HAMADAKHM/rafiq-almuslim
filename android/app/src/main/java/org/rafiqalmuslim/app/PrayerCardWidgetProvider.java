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
        Tile t = new Tile(context, widgetId, R.drawable.wt_prayer_l, 545, 270);
        try {
            JSONObject data = PrayerWidgetProvider.load(context);
            JSONArray days = data == null ? null : data.getJSONArray("days");
            long now = System.currentTimeMillis();
            int[] next = days == null ? null : PrayerWidgetProvider.findNext(days, now);
            if (data == null || data.isNull("city") || next == null) throw new Exception("no data");
            JSONObject day = days.getJSONObject(next[0]);
            JSONObject np = day.getJSONArray("prayers").getJSONObject(next[1]);
            t.text(Tile.hm(np.getString("time")), 268, 84, 500, 168, 76, Tile.GOLD, Tile.CENTER, Tile.BOLD, 1);
            t.text(np.getString("label"), 361, 174, 446, 206, 21, Tile.GOLD, Tile.CENTER, Tile.BOLD, 1);
            java.util.Date d = new java.util.Date();
            java.util.Locale ar = new java.util.Locale("ar");
            java.util.Calendar cal = java.util.Calendar.getInstance();
            String greg = new java.text.SimpleDateFormat("EEEE", ar).format(d) + " " + cal.get(java.util.Calendar.DAY_OF_MONTH) + " "
                + new java.text.SimpleDateFormat("MMMM", ar).format(d) + " " + cal.get(java.util.Calendar.YEAR);
            t.text(greg, 288, 216, 478, 250, 19, Tile.WHITE, Tile.RIGHT, Tile.BOLD, 1);
            if (WidgetKit.show(context, "hijri")) t.text(day.optString("hijri", ""), 20, 216, 216, 250, 19, Tile.WHITE, Tile.RIGHT, Tile.BOLD, 1);
        } catch (Exception e) {
            t.text(context.getString(R.string.widget_empty), 270, 90, 500, 200, 20, Tile.WHITE, Tile.CENTER, Tile.BOLD, 4);
        }
        manager.updateAppWidget(widgetId, t.done(WidgetKit.route(context, "/prayer", 7)));
    }
}
