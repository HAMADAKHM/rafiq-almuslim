package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * ودجت رفيق بلس: المسبحة. كل ضغطة تزيد العدّ؛ وتتتابع الأذكار ٣٣ مرة لكل منها:
 * سبحان الله، الحمد لله، الله أكبر (كما في التسبيح بعد الصلاة — رواه مسلم 597).
 */
public class TasbihWidgetProvider extends AppWidgetProvider {
    static final String ACTION_INC = "org.rafiqalmuslim.app.TASBIH_INC";
    static final String ACTION_RESET = "org.rafiqalmuslim.app.TASBIH_RESET";
    private static final String KEY_COUNT = "tasbih_count";
    private static final String[] PHRASES = { "سبحان الله", "الحمد لله", "الله أكبر" };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        SharedPreferences p = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE);
        if (ACTION_INC.equals(a)) p.edit().putInt(KEY_COUNT, p.getInt(KEY_COUNT, 0) + 1).apply();
        else if (ACTION_RESET.equals(a)) p.edit().putInt(KEY_COUNT, 0).apply();
        else return;
        refreshAll(c);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, TasbihWidgetProvider.class))) render(c, m, id);
    }

    private static PendingIntent broadcast(Context c, String action, int code) {
        return PendingIntent.getBroadcast(c, code, new Intent(c, TasbihWidgetProvider.class).setAction(action), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String ar(int n) {
        String d = String.valueOf(n);
        StringBuilder b = new StringBuilder();
        for (char ch : d.toCharArray()) b.append((char) ('٠' + (ch - '0')));
        return b.toString();
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_tasbih);
        WidgetStyle.apply(c, v, R.id.t_root, id, 0);
        JSONObject data = PlusWidgets.load(c);
        if (PlusWidgets.showGate(c, v, data, R.id.t_content, R.id.t_empty)) {
            v.setOnClickPendingIntent(R.id.t_root, PlusWidgets.openApp(c, 5));
            m.updateAppWidget(id, v);
            return;
        }
        v.setViewVisibility(R.id.t_content, View.VISIBLE);
        v.setViewVisibility(R.id.t_empty, View.GONE);
        int total = c.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).getInt(KEY_COUNT, 0);
        int round = total % 99;
        int idx = Math.min(2, round / 33);
        v.setTextViewText(R.id.t_phrase, PHRASES[idx]);
        v.setTextViewText(R.id.t_count, ar(round - idx * 33) + " / ٣٣");
        v.setTextViewText(R.id.t_total, "المجموع " + ar(total));
        v.setOnClickPendingIntent(R.id.t_root, broadcast(c, ACTION_INC, 6));
        v.setOnClickPendingIntent(R.id.t_reset, broadcast(c, ACTION_RESET, 7));
        m.updateAppWidget(id, v);
    }
}
