package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** بيانات ودجتات رفيق بلس (يحفظها التطبيق): {"entitled":bool,"weather":{…}|null,"progress":{…}|null} */
final class PlusWidgets {
    static final String KEY = "plus";
    private PlusWidgets() {}

    static JSONObject load(Context c) {
        try {
            String s = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) { return null; }
    }

    static PendingIntent openApp(Context c, int code) {
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, code, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, WeatherWidgetProvider.class))) WeatherWidgetProvider.render(c, m, id);
        for (int id : m.getAppWidgetIds(new ComponentName(c, ProgressWidgetProvider.class))) ProgressWidgetProvider.render(c, m, id);
    }

    /** «من مزايا رفيق بلس» أو «افتح التطبيق مرة» */
    static boolean showGate(Context c, RemoteViews v, JSONObject data, int content, int empty) {
        if (data != null && data.optBoolean("entitled", false)) return false;
        v.setViewVisibility(content, android.view.View.GONE);
        v.setViewVisibility(empty, android.view.View.VISIBLE);
        v.setTextViewText(empty, c.getString(data == null ? R.string.plus_empty : R.string.plus_locked));
        return true;
    }
}
