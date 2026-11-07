package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت «آية اليوم والورد»: آية اليوم من المصحف (محسوبة في التطبيق لسبعة أيام) وحالة ورد اليوم.
 * لا نص هنا من عندنا: الآية تأتي من بيانات المصحف كما هي، والطويلة تُعرض بمرجعها فقط بدل قصّها.
 */
public class DailyWidgetProvider extends AppWidgetProvider {
    /** تغيير المقاس: تُرسم الخلفية من جديد بالمقاس الجديد */
    @Override
    public void onAppWidgetOptionsChanged(android.content.Context c, android.appwidget.AppWidgetManager m, int id, android.os.Bundle o) {
        WidgetStyle.refreshEverything(c);
    }

    static final String KEY = "daily";
    static final String NEXT = "org.rafiqalmuslim.app.AYAH_NEXT";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String a = intent.getAction();
        if (NEXT.equals(a)) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
            android.content.SharedPreferences p = WidgetKit.data(context);
            // «آية أخرى» لهذا اليوم فقط: يعود لآية اليوم في اليوم التالي
            String today = WidgetKit.today();
            int off = today.equals(p.getString("ay_day_" + id, "")) ? p.getInt("ay_off_" + id, 0) + 1 : 1;
            p.edit().putInt("ay_off_" + id, off).putString("ay_day_" + id, today).apply();
            render(context, AppWidgetManager.getInstance(context), id);
            return;
        }
        if (Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a)) refreshAll(context);
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : manager.getAppWidgetIds(new ComponentName(context, DailyWidgetProvider.class))) render(context, manager, id);
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        Tile t = new Tile(context, widgetId, R.drawable.wt_quran, 522, 296);
        JSONObject rs = WidgetKit.resume(context);
        String rr = rs == null ? null : rs.optString("route", null);
        t.zone(40, 240, 210, 282, WidgetKit.route(context, rr != null && rr.startsWith("/") ? rr : "/quran", 9), "متابعة القراءة");
        try {
            String s = context.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            JSONObject data = s == null ? null : new JSONObject(s);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            JSONObject day = null;
            JSONArray days = data == null ? null : data.getJSONArray("days");
            for (int i = 0; days != null && i < days.length(); i++) {
                if (today.equals(days.getJSONObject(i).getString("date"))) { day = days.getJSONObject(i); break; }
            }
            if (day == null) throw new Exception("no data");
            boolean hasText = !day.isNull("text");
            String ayah = hasText ? day.getString("text") : null, ref = day.getString("ref"), route = "/quran";
            android.content.SharedPreferences p = WidgetKit.data(context);
            int off = today.equals(p.getString("ay_day_" + widgetId, "")) ? p.getInt("ay_off_" + widgetId, 0) : 0;
            JSONObject x = WidgetKit.extra(context);
            JSONArray pool = x == null ? null : x.optJSONArray("ayat");
            if (off > 0 && pool != null && pool.length() > 0) {
                JSONObject o = pool.getJSONObject(Math.floorMod(DuaWidgetProvider.dayIndex() * 7 + off, pool.length()));
                ayah = o.optString("t"); ref = o.optString("ref"); route = "/quran/" + o.optInt("s") + "?ayah=" + o.optInt("a");
            }
            if (ayah != null) t.text("﴿" + ayah + "﴾", 204, 90, 494, 166, 31, Tile.INK, Tile.CENTER, Tile.NASKH, 3);
            else t.text(context.getString(R.string.daily_long_ayah), 204, 90, 494, 166, 20, Tile.INK, Tile.CENTER, Tile.BOLD, 3);
            t.text(Tile.refShort(ref), 292, 170, 408, 203, 18, 0xFF3B2F1E, Tile.CENTER, Tile.BOLD, 1);
            t.zone(204, 86, 494, 205, WidgetKit.route(context, route, 10), "آية اليوم");
            // «قال تعالى» يعرض آية أخرى لهذا اليوم
            if (pool != null) t.zone(232, 22, 396, 78, WidgetKit.action(context, DailyWidgetProvider.class, NEXT, widgetId, 8), "آية أخرى");
        } catch (Exception e) {
            t.text(context.getString(R.string.daily_empty), 204, 90, 494, 200, 20, Tile.INK, Tile.CENTER, Tile.BOLD, 3);
        }
        manager.updateAppWidget(widgetId, t.done(WidgetKit.route(context, "/quran", 2)));
    }
}
