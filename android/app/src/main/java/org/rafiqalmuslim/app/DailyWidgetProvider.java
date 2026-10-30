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
    static final String KEY = "daily";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String a = intent.getAction();
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
            v.setTextViewText(R.id.daily_ayah, hasText ? "﴿" + day.getString("text") + "﴾" : context.getString(R.string.daily_long_ayah));
            v.setTextViewText(R.id.daily_ref, day.getString("ref"));
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
