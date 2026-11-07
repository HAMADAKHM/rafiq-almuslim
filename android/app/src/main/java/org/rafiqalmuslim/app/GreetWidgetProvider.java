package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت «البطاقات العصرية»: صورة طبيعة تتبدل كل يوم، وبطاقة زجاجية فيها تحية الوقت (صباح الخير، مساء الخير…)
 * وعبارة اليوم من عبارات التطبيق. يتحدث مع تغيّر الوقت (كل ساعة) والتاريخ.
 */
public class GreetWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) refreshAll(c);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, GreetWidgetProvider.class))) render(c, m, id);
    }

    static String greeting() {
        int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        if (h >= 4 && h < 12) return "صباح الخير";
        if (h >= 12 && h < 18) return "طاب يومك";
        if (h >= 18 && h < 23) return "مساء الخير";
        return "تصبح على خير";
    }

    static void render(Context c, AppWidgetManager m, int id) {
        Tile t = new Tile(c, id, R.drawable.wt_greet, 494, 270);
        String phrase = "تقبّل الله منا ومنكم";
        JSONObject x = WidgetKit.extra(c);
        JSONArray ph = x == null ? null : x.optJSONArray("phrases");
        if (ph != null && ph.length() > 0) phrase = ph.optString(Math.floorMod(DuaWidgetProvider.dayIndex(), ph.length()), phrase);
        t.text(greeting(), 66, 76, 288, 132, 42, Tile.WHITE, Tile.CENTER, Tile.NASKH, 1);
        t.text(phrase, 66, 134, 288, 176, 23, Tile.WHITE, Tile.CENTER, Tile.BOLD, 2);
        m.updateAppWidget(id, t.done(WidgetKit.route(c, "/", 70)));
    }
}
