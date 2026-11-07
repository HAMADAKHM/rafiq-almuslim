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
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_daily);
        WidgetStyle.apply(context, v, R.id.daily_root, widgetId, 0);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.daily_root, PendingIntent.getActivity(context, 2, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        try {
            String s = context.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            JSONObject data = s == null ? null : new JSONObject(s);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            JSONObject day = null;
            JSONArray days = data == null ? null : data.getJSONArray("days");
            for (int i = 0; days != null && i < days.length(); i++) {
                if (today.equals(days.getJSONObject(i).getString("date"))) { day = days.getJSONObject(i); break; }
            }
            if (day == null) {
                v.setViewVisibility(R.id.daily_content, View.GONE);
                v.setViewVisibility(R.id.daily_empty, View.VISIBLE);
                manager.updateAppWidget(widgetId, v);
                return;
            }
            v.setViewVisibility(R.id.daily_content, View.VISIBLE);
            v.setViewVisibility(R.id.daily_empty, View.GONE);
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
            v.setTextViewText(R.id.daily_ayah, ayah != null ? "﴿" + ayah + "﴾" : context.getString(R.string.daily_long_ayah));
            v.setTextViewText(R.id.daily_ref, ref);
            int size = WidgetKit.size(context, widgetId);
            v.setInt(R.id.daily_ayah, "setMaxLines", size == 0 ? 2 : size == 1 ? 4 : 8);
            WidgetKit.text(context, v, R.id.daily_ayah, size == 2 ? 19 : 16);
            v.setViewVisibility(R.id.daily_actions, size == 0 || pool == null ? View.GONE : View.VISIBLE);
            v.setOnClickPendingIntent(R.id.daily_next, WidgetKit.action(context, DailyWidgetProvider.class, NEXT, widgetId, 8));
            // «تابع القراءة»: آخر موضع قراءة فعلية (من بيانات ودجت المتابعة) أو المصحف
            JSONObject rs = ResumeWidgetProvider.load(context);
            String rr = rs == null ? null : rs.optString("route", null);
            v.setOnClickPendingIntent(R.id.daily_resume, WidgetKit.route(context, rr != null && rr.startsWith("/") ? rr : "/quran", 9));
            v.setOnClickPendingIntent(R.id.daily_ayah, WidgetKit.route(context, route, 10));
            WidgetKit.tint(v, WidgetKit.light(context, widgetId), new int[] { R.id.daily_ayah }, new int[] { R.id.daily_ref }, new int[] { R.id.daily_wird, R.id.daily_next });
            JSONObject w = data.isNull("wird") ? null : data.getJSONObject("wird");
            if (w == null) {
                v.setTextViewText(R.id.daily_wird, context.getString(R.string.daily_no_wird));
                v.setViewVisibility(R.id.daily_progress, View.GONE);
            } else {
                boolean sameDay = today.equals(w.getString("date"));
                // حالة الإتمام صحيحة ليوم آخر فتح فقط؛ في يوم جديد يُعرض ورد اليوم كأنه لم يُقرأ بعد حتى يُفتح التطبيق
                String status = sameDay && w.getBoolean("done") ? context.getString(R.string.daily_wird_done) : context.getString(R.string.daily_wird_pending);
                v.setTextViewText(R.id.daily_wird, context.getString(R.string.daily_wird) + " " + (sameDay ? w.getString("label") + " • " : "") + status);
                v.setViewVisibility(R.id.daily_progress, View.VISIBLE);
                v.setProgressBar(R.id.daily_progress, 100, w.getInt("percent"), false);
            }
        } catch (Exception e) {
            v.setViewVisibility(R.id.daily_content, View.GONE);
            v.setViewVisibility(R.id.daily_empty, View.VISIBLE);
        }
        manager.updateAppWidget(widgetId, v);
    }
}
