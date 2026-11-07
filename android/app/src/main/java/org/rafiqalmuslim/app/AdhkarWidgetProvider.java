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
    static final String INC = "org.rafiqalmuslim.app.ADHKAR_INC", NEXT = "org.rafiqalmuslim.app.ADHKAR_NEXT", SWITCH = "org.rafiqalmuslim.app.ADHKAR_SWITCH";
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
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_adhkar);
        WidgetStyle.apply(c, v, R.id.a_root, id, 0);
        int cat = catOf(c, id);
        JSONArray list = items(c, cat);
        if (list == null || list.length() == 0) {
            v.setViewVisibility(R.id.a_content, View.GONE);
            v.setViewVisibility(R.id.a_empty, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.a_root, WidgetKit.route(c, "/adhkar", 40));
            m.updateAppWidget(id, v);
            return;
        }
        v.setViewVisibility(R.id.a_content, View.VISIBLE);
        v.setViewVisibility(R.id.a_empty, View.GONE);
        SharedPreferences p = WidgetKit.data(c);
        int i = Math.min(p.getInt("ad_i_" + id, 0), list.length() - 1), n = p.getInt("ad_n_" + id, 0);
        JSONObject d = list.optJSONObject(i);
        int need = d.optInt("c", 1), size = WidgetKit.size(c, id);
        v.setTextViewText(R.id.a_cat, TITLES[cat] + "  " + WidgetKit.ar(i + 1) + "/" + WidgetKit.ar(list.length()));
        v.setTextViewText(R.id.a_text, d.optString("t"));
        v.setTextViewText(R.id.a_src, d.optString("s"));
        v.setTextViewText(R.id.a_count, WidgetKit.ar(n) + " / " + WidgetKit.ar(need));
        v.setInt(R.id.a_text, "setMaxLines", size == 0 ? 2 : size == 1 ? 4 : 9);
        v.setViewVisibility(R.id.a_src, size == 0 ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.a_switch, size == 0 ? View.GONE : View.VISIBLE);
        WidgetKit.text(c, v, R.id.a_text, size == 2 ? 17 : 15);
        WidgetKit.tint(v, WidgetKit.light(c, id), new int[] { R.id.a_text }, new int[] { R.id.a_cat, R.id.a_count }, new int[] { R.id.a_src, R.id.a_next, R.id.a_switch });
        v.setOnClickPendingIntent(R.id.a_text, WidgetKit.route(c, "/adhkar/" + CATS[cat], 41));
        v.setOnClickPendingIntent(R.id.a_inc, WidgetKit.action(c, AdhkarWidgetProvider.class, INC, id, 1));
        v.setOnClickPendingIntent(R.id.a_count, WidgetKit.action(c, AdhkarWidgetProvider.class, INC, id, 1));
        v.setOnClickPendingIntent(R.id.a_next, WidgetKit.action(c, AdhkarWidgetProvider.class, NEXT, id, 2));
        v.setOnClickPendingIntent(R.id.a_switch, WidgetKit.action(c, AdhkarWidgetProvider.class, SWITCH, id, 3));
        m.updateAppWidget(id, v);
    }
}
