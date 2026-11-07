package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت الأذكار: يعرض الذكر مباشرة (من أذكار الصباح أو المساء أو النوم كما في التطبيق، بنصها ومصدرها)،
 * مع عدّاد التكرار: «+١» يزيد العدّ، وعند تمامه ينتقل للذكر التالي تلقائيًا؛ و«التالي» للانتقال يدويًا.
 * القسم تلقائي بحسب الوقت (أو كما يُختار في الاستوديو)، و«تبديل» ينقل بين الأقسام الثلاثة.
 */
public class AdhkarWidgetProvider extends AppWidgetProvider {
    static final String INC = "org.rafiqalmuslim.app.ADHKAR_INC", NEXT = "org.rafiqalmuslim.app.ADHKAR_NEXT", SWITCH = "org.rafiqalmuslim.app.ADHKAR_SWITCH", PREV = "org.rafiqalmuslim.app.ADHKAR_PREV";
    static final String[] CATS = { "morning", "evening", "sleep" };
    static final String[] TITLES = { "أذكار الصباح", "أذكار المساء", "أذكار النوم" };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID || a == null) return;
        SharedPreferences p = WidgetKit.data(c);
        int cat = catOf(c, id), i = p.getInt("ad_i_" + id, 0), n = p.getInt("ad_n_" + id, 0);
        JSONArray list = items(c, cat);
        int len = list == null ? 0 : list.length();
        if (INC.equals(a) && len > 0) {
            int need = list.optJSONObject(Math.min(i, len - 1)).optInt("c", 1);
            n++;
            WidgetKit.tick(c);
            if (n >= need) { n = 0; i = (i + 1) % len; }
            p.edit().putInt("ad_i_" + id, i).putInt("ad_n_" + id, n).apply();
        } else if (NEXT.equals(a) && len > 0) {
            p.edit().putInt("ad_i_" + id, (i + 1) % len).putInt("ad_n_" + id, 0).apply();
        } else if (PREV.equals(a) && len > 0) {
            p.edit().putInt("ad_i_" + id, Math.floorMod(i - 1, len)).putInt("ad_n_" + id, 0).apply();
        } else if (SWITCH.equals(a)) {
            p.edit().putInt("ad_cat_" + id, (cat + 1) % 3).putInt("ad_i_" + id, 0).putInt("ad_n_" + id, 0).apply();
        } else return;
        render(c, AppWidgetManager.getInstance(c), id);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, AdhkarWidgetProvider.class))) render(c, m, id);
    }

    /** القسم: المختار لهذا الودجت، أو من الاستوديو، أو تلقائيًا بحسب الوقت */
    static int catOf(Context c, int id) {
        int own = WidgetKit.data(c).getInt("ad_cat_" + id, -1);
        if (own >= 0) return own % 3;
        String pref = WidgetKit.prefs(c).optString("adhkar", "auto");
        for (int k = 0; k < 3; k++) if (CATS[k].equals(pref)) return k;
        int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        return h >= 3 && h < 12 ? 0 : h < 20 ? 1 : 2;
    }

    static JSONArray items(Context c, int cat) {
        JSONObject x = WidgetKit.extra(c);
        JSONObject ad = x == null ? null : x.optJSONObject("adhkar");
        return ad == null ? null : ad.optJSONArray(CATS[cat]);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        int cat = catOf(c, id);
        Tile t = new Tile(c, id, cat == 0 ? R.drawable.wt_adhkar_m : R.drawable.wt_adhkar_e, 472, 298);
        t.text(TITLES[cat], 226, 24, 368, 68, 23, Tile.GOLD, Tile.RIGHT, Tile.BOLD, 1);
        t.zone(38, 92, 92, 146, WidgetKit.action(c, AdhkarWidgetProvider.class, SWITCH, id, 3), "تبديل الأذكار");
        JSONArray list = items(c, cat);
        if (list == null || list.length() == 0) {
            t.text(c.getString(R.string.plus_empty), 98, 82, 434, 154, 20, Tile.WHITE, Tile.CENTER, Tile.BOLD, 3);
            m.updateAppWidget(id, t.done(WidgetKit.route(c, "/adhkar", 40)));
            return;
        }
        SharedPreferences p = WidgetKit.data(c);
        int i = Math.min(p.getInt("ad_i_" + id, 0), list.length() - 1), n = p.getInt("ad_n_" + id, 0);
        JSONObject d = list.optJSONObject(i);
        int need = Math.max(1, d.optInt("c", 1));
        t.text(d.optString("t"), 98, 80, 434, 156, 31, Tile.WHITE, Tile.CENTER, Tile.NASKH, 3);
        t.text(Tile.ltr(n + " / " + need), 160, 162, 312, 194, 22, Tile.WHITE, Tile.CENTER, Tile.BOLD, 1);
        float frac = Math.min(1f, n / (float) need);
        t.rrect(70, 195, 411, 208, 6.5f, 0x40FFFFFF);
        if (frac > 0) t.rrect(70, 195, Math.max(83, 70 + 341 * frac), 208, 6.5f, 0xFFF2B728);
        t.zone(110, 228, 162, 278, WidgetKit.action(c, AdhkarWidgetProvider.class, PREV, id, 4), "الذكر السابق");
        t.zone(206, 216, 278, 288, WidgetKit.action(c, AdhkarWidgetProvider.class, INC, id, 1), "عدّ");
        t.zone(320, 228, 374, 278, WidgetKit.action(c, AdhkarWidgetProvider.class, NEXT, id, 2), "الذكر التالي");
        t.zone(98, 80, 434, 194, WidgetKit.action(c, AdhkarWidgetProvider.class, INC, id, 5), "عدّ");
        m.updateAppWidget(id, t.done(WidgetKit.route(c, "/adhkar/" + CATS[cat], 41)));
    }
}
