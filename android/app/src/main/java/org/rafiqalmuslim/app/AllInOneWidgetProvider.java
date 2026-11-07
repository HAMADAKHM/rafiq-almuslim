package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت «الكل في واحد»: الصلاة القادمة مع عدّ تنازلي حي، والمدينة والتاريخين، ومواقيت اليوم،
 * وآية اليوم، وذكر اليوم، واختصارات الأقسام. يتكيف مع المقاس: الصغير للصلاة القادمة فقط، والكبير لكل شيء.
 */
public class AllInOneWidgetProvider extends AppWidgetProvider {
    static final int[] CELLS = { R.id.o_c0, R.id.o_c1, R.id.o_c2, R.id.o_c3, R.id.o_c4 };
    static final int[] NAMES = { R.id.o_n0, R.id.o_n1, R.id.o_n2, R.id.o_n3, R.id.o_n4 };
    static final int[] TIMES = { R.id.o_t0, R.id.o_t1, R.id.o_t2, R.id.o_t3, R.id.o_t4 };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a)) refreshAll(c);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, AllInOneWidgetProvider.class))) render(c, m, id);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_all);
        WidgetStyle.apply(c, v, R.id.o_root, id, 0);
        v.setOnClickPendingIntent(R.id.o_top, WidgetKit.route(c, "/prayer", 60));
        v.setOnClickPendingIntent(R.id.o_times, WidgetKit.route(c, "/prayer", 60));
        v.setOnClickPendingIntent(R.id.o_q, WidgetKit.route(c, "/quran", 61));
        v.setOnClickPendingIntent(R.id.o_a, WidgetKit.route(c, "/adhkar", 62));
        v.setOnClickPendingIntent(R.id.o_k, WidgetKit.route(c, "/qibla", 63));
        v.setOnClickPendingIntent(R.id.o_s, WidgetKit.route(c, "/tasbih", 64));
        try {
            JSONObject data = PrayerWidgetProvider.load(c);
            JSONArray days = data == null ? null : data.getJSONArray("days");
            long now = System.currentTimeMillis();
            int[] next = days == null ? null : PrayerWidgetProvider.findNext(days, now);
            if (data == null || data.isNull("city") || next == null) throw new Exception("no data");
            v.setViewVisibility(R.id.o_content, View.VISIBLE);
            v.setViewVisibility(R.id.o_empty, View.GONE);
            JSONObject day = days.getJSONObject(next[0]);
            JSONArray prayers = day.getJSONArray("prayers");
            JSONObject np = prayers.getJSONObject(next[1]);
            v.setTextViewText(R.id.o_next, np.getString("label") + "  " + np.getString("time"));
            boolean cd = WidgetKit.show(c, "countdown");
            v.setViewVisibility(R.id.o_count, cd ? View.VISIBLE : View.GONE);
            if (cd) {
                v.setChronometer(R.id.o_count, SystemClock.elapsedRealtime() + (np.getLong("at") - now), null, true);
                v.setChronometerCountDown(R.id.o_count, true);
            }
            StringBuilder meta = new StringBuilder();
            if (WidgetKit.show(c, "city")) meta.append(data.getString("city"));
            if (WidgetKit.show(c, "hijri") && !day.optString("hijri").isEmpty()) meta.append(meta.length() > 0 ? " • " : "").append(day.optString("hijri"));
            if (WidgetKit.show(c, "greg")) meta.append(meta.length() > 0 ? " • " : "").append(new SimpleDateFormat("EEEE d MMMM", new Locale("ar")).format(new Date()));
            v.setTextViewText(R.id.o_meta, meta.toString());
            v.setViewVisibility(R.id.o_meta, meta.length() > 0 ? View.VISIBLE : View.GONE);
            for (int i = 0; i < CELLS.length && i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                boolean on = i == next[1];
                v.setTextViewText(NAMES[i], p.getString("label"));
                v.setTextViewText(TIMES[i], p.getString("time"));
                v.setInt(CELLS[i], "setBackgroundResource", on ? R.drawable.widget_cell_active : R.drawable.widget_cell);
                v.setTextColor(NAMES[i], on ? 0xFF1B2F2A : 0xFFEFE4CC);
                v.setTextColor(TIMES[i], on ? 0xFF10221F : 0xFFFFFFFF);
            }
            // آية اليوم (من بيانات ودجت الآية) وذكر اليوم
            String ayah = null, ref = null, dhikr = null, today = WidgetKit.today();
            String ds = WidgetKit.data(c).getString(DailyWidgetProvider.KEY, null);
            JSONArray dd = ds == null ? null : new JSONObject(ds).optJSONArray("days");
            for (int i = 0; dd != null && i < dd.length(); i++) {
                JSONObject o = dd.getJSONObject(i);
                if (today.equals(o.optString("date"))) { ayah = o.isNull("text") ? null : o.optString("text"); ref = o.optString("ref"); break; }
            }
            JSONObject x = WidgetKit.extra(c);
            JSONArray dk = x == null ? null : x.optJSONArray("dhikrDays");
            for (int i = 0; dk != null && i < dk.length(); i++) {
                JSONObject o = dk.getJSONObject(i);
                if (today.equals(o.optString("date"))) { dhikr = o.optString("t"); break; }
            }
            int size = WidgetKit.size(c, id);
            v.setViewVisibility(R.id.o_times, size >= 1 ? View.VISIBLE : View.GONE);
            v.setViewVisibility(R.id.o_links, size >= 1 ? View.VISIBLE : View.GONE);
            boolean big = size == 2;
            v.setViewVisibility(R.id.o_ayah, big && ayah != null ? View.VISIBLE : View.GONE);
            v.setViewVisibility(R.id.o_ayah_ref, big && ref != null ? View.VISIBLE : View.GONE);
            v.setViewVisibility(R.id.o_dhikr, big && dhikr != null && !dhikr.isEmpty() ? View.VISIBLE : View.GONE);
            if (ayah != null) v.setTextViewText(R.id.o_ayah, "﴿" + ayah + "﴾");
            if (ref != null) v.setTextViewText(R.id.o_ayah_ref, ref);
            if (dhikr != null) v.setTextViewText(R.id.o_dhikr, "ذكر اليوم: " + dhikr);
            v.setOnClickPendingIntent(R.id.o_ayah, WidgetKit.route(c, "/quran", 65));
            v.setOnClickPendingIntent(R.id.o_dhikr, WidgetKit.route(c, "/adhkar", 66));
            WidgetKit.text(c, v, R.id.o_next, size == 0 ? 18 : 20);
            WidgetKit.text(c, v, R.id.o_ayah, 15);
            WidgetKit.tint(v, WidgetKit.light(c, id), new int[] { R.id.o_next, R.id.o_ayah }, new int[] { R.id.o_label, R.id.o_count, R.id.o_ayah_ref }, new int[] { R.id.o_meta, R.id.o_dhikr, R.id.o_q, R.id.o_a, R.id.o_k, R.id.o_s });
        } catch (Exception e) {
            v.setViewVisibility(R.id.o_content, View.GONE);
            v.setViewVisibility(R.id.o_empty, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.o_root, WidgetKit.route(c, "/", 67));
        }
        m.updateAppWidget(id, v);
    }
}
