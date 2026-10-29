package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * ودجت رفيق بلس «أكمل من حيث وصلت»: آخر موضع قراءة فعلية (يحفظه التطبيق نصًا جاهزًا)،
 * والضغط يفتح المصحف على الموضع نفسه عبر MainActivity.EXTRA_ROUTE.
 */
public class ResumeWidgetProvider extends AppWidgetProvider {
    static final String KEY = "resume";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, ResumeWidgetProvider.class))) render(c, m, id);
    }

    static JSONObject load(Context c) {
        try {
            String s = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) { return null; }
    }

    static PendingIntent open(Context c, String route) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (route != null && route.startsWith("/")) i.putExtra(MainActivity.EXTRA_ROUTE, route);
        return PendingIntent.getActivity(c, 7, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_resume);
        WidgetStyle.apply(c, v, R.id.r_root);
        JSONObject data = load(c);
        boolean entitled = data != null && data.optBoolean("entitled", false);
        v.setOnClickPendingIntent(R.id.r_root, open(c, entitled && data.has("route") ? data.optString("route") : null));
        if (!entitled) {
            v.setViewVisibility(R.id.r_content, View.GONE);
            v.setViewVisibility(R.id.r_empty, View.VISIBLE);
            v.setTextViewText(R.id.r_empty, c.getString(data == null ? R.string.plus_empty : R.string.plus_locked));
            m.updateAppWidget(id, v);
            return;
        }
        if (data.isNull("surah")) {
            v.setViewVisibility(R.id.r_content, View.GONE);
            v.setViewVisibility(R.id.r_empty, View.VISIBLE);
            v.setTextViewText(R.id.r_empty, c.getString(R.string.resume_empty));
            m.updateAppWidget(id, v);
            return;
        }
        v.setViewVisibility(R.id.r_content, View.VISIBLE);
        v.setViewVisibility(R.id.r_empty, View.GONE);
        v.setTextViewText(R.id.r_surah, data.optString("surah"));
        v.setTextViewText(R.id.r_where, data.optString("where"));
        v.setTextViewText(R.id.r_date, data.optString("date"));
        if (data.isNull("percent")) {
            v.setViewVisibility(R.id.r_khatma, View.GONE);
        } else {
            v.setViewVisibility(R.id.r_khatma, View.VISIBLE);
            v.setProgressBar(R.id.r_bar, 100, data.optInt("percent", 0), false);
            v.setTextViewText(R.id.r_pct, data.optString("percentLabel"));
        }
        m.updateAppWidget(id, v);
    }
}
