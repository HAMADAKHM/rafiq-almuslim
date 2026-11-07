package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * ودجت «الأذكار اليومية»: أذكار الصباح وأذكار المساء جنبًا إلى جنب، وحالة كل منهما اليوم («تم» أو «لم تبدأ بعد»)
 * من سجل التطبيق نفسه. الضغط على أي نصف يفتح أذكاره.
 */
public class DailyAdhkarWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        if (Intent.ACTION_DATE_CHANGED.equals(intent.getAction())) refreshAll(c);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, DailyAdhkarWidgetProvider.class))) render(c, m, id);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_dadhkar);
        WidgetDesign.apply(c, v, R.id.d_root, id, WidgetDesign.Kind.DAILY);
        JSONObject x = WidgetKit.extra(c);
        JSONObject done = x == null ? null : x.optJSONObject("done");
        boolean today = done != null && WidgetKit.today().equals(done.optString("date"));
        boolean mo = today && done.optBoolean("morning"), ev = today && done.optBoolean("evening");
        v.setTextViewText(R.id.d_m_status, mo ? "تم ✓" : "لم تبدأ بعد");
        v.setTextViewText(R.id.d_e_status, ev ? "تم ✓" : "لم تبدأ بعد");
        v.setOnClickPendingIntent(R.id.d_m, WidgetKit.route(c, "/adhkar/morning", 71));
        v.setOnClickPendingIntent(R.id.d_e, WidgetKit.route(c, "/adhkar/evening", 72));
        m.updateAppWidget(id, v);
    }
}
