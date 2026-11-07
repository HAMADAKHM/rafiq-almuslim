package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت «الكل في واحد»: الصلاة القادمة مع عدّ تنازلي حي، والمدينة والتاريخين، ومواقيت اليوم،
 * وآية اليوم، وذكر اليوم، واختصارات الأقسام. يتكيف مع المقاس: الصغير للصلاة القادمة فقط، والكبير لكل شيء.
 */
public class AllInOneWidgetProvider extends AppWidgetProvider {
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
        Tile t = new Tile(c, id, R.drawable.wt_all, 657, 282);
        // أيقونات التصميم: القرآن، السبحة، القبلة، الأذكار (من اليمين)
        t.text("الأذكار", 356, 244, 416, 268, 15, Tile.WHITE, Tile.CENTER, Tile.BOLD, 1);
        t.zone(570, 205, 632, 270, WidgetKit.route(c, "/quran", 61), "القرآن");
        t.zone(502, 205, 564, 270, WidgetKit.route(c, "/tasbih", 62), "السبحة");
        t.zone(430, 205, 494, 270, WidgetKit.route(c, "/qibla", 63), "القبلة");
        t.zone(356, 205, 420, 270, WidgetKit.route(c, "/adhkar", 64), "الأذكار");
        try {
            JSONObject data = PrayerWidgetProvider.load(c);
            JSONArray days = data == null ? null : data.getJSONArray("days");
            long now = System.currentTimeMillis();
            int[] next = days == null ? null : PrayerWidgetProvider.findNext(days, now);
            if (data != null && !data.isNull("city") && next != null) {
                JSONObject np = days.getJSONObject(next[0]).getJSONArray("prayers").getJSONObject(next[1]);
                t.text(Tile.hm(np.getString("time")), 468, 108, 630, 162, 52, Tile.WHITE, Tile.RIGHT, Tile.BOLD, 1);
                if (WidgetKit.show(c, "countdown")) t.countdown(np.getLong("at") - now, 460, 166, 594, 190, 18, Tile.WHITE);
            } else {
                t.text(c.getString(R.string.widget_empty), 460, 108, 640, 192, 14, Tile.WHITE, Tile.RIGHT, Tile.BOLD, 3);
            }
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
            if (ayah != null) t.text("﴿" + ayah + "﴾", 32, 86, 328, 142, 27, Tile.WHITE, Tile.CENTER, Tile.NASKH, 2);
            else if (ref != null) t.text(c.getString(R.string.daily_long_ayah), 32, 86, 328, 142, 17, Tile.WHITE, Tile.CENTER, Tile.BOLD, 2);
            if (ref != null) t.text(Tile.refShort(ref), 96, 148, 272, 180, 18, Tile.WHITE, Tile.CENTER, Tile.BOLD, 1);
            android.text.SpannableStringBuilder sb = new android.text.SpannableStringBuilder("ذكر اليوم: ");
            sb.setSpan(new android.text.style.ForegroundColorSpan(Tile.GOLD), 0, sb.length(), 0);
            sb.append(dhikr != null && !dhikr.isEmpty() ? dhikr : "سبحان الله وبحمده");
            t.text(sb, 36, 208, 272, 246, 20, Tile.WHITE, Tile.RIGHT, Tile.BOLD, 1);
            t.zone(32, 86, 328, 182, WidgetKit.route(c, "/quran", 65), "آية اليوم");
            t.zone(36, 204, 300, 250, WidgetKit.route(c, "/adhkar", 66), "ذكر اليوم");
        } catch (Exception ignored) {}
        m.updateAppWidget(id, t.done(WidgetKit.route(c, "/prayer", 60)));
    }
}
