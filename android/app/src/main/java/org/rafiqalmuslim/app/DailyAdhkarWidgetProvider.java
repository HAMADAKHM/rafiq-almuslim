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
        Tile t = new Tile(c, id, R.drawable.wt_dadhkar, 413, 254);
        JSONObject x = WidgetKit.extra(c);
        JSONObject done = x == null ? null : x.optJSONObject("done");
        boolean today = done != null && WidgetKit.today().equals(done.optString("date"));
        boolean mo = today && done.optBoolean("morning"), ev = today && done.optBoolean("evening");
        t.text(ev ? "تم" : "لم تبدأ بعد", 12, 136, 198, 174, 21, 0xFFEFF3F8, Tile.CENTER, Tile.BOLD, 1);
        t.text(mo ? "تم" : "لم تبدأ بعد", 214, 136, 400, 174, 21, 0xFFFBEFD6, Tile.CENTER, Tile.BOLD, 1);
        t.zone(206, 0, 413, 190, WidgetKit.route(c, "/adhkar/morning", 71), "أذكار الصباح");
        t.zone(0, 0, 206, 190, WidgetKit.route(c, "/adhkar/evening", 72), "أذكار المساء");
        m.updateAppWidget(id, t.done(WidgetKit.route(c, "/adhkar", 73)));
    }
}
