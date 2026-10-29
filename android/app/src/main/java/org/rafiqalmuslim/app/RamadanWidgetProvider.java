package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** ودجت رفيق بلس: رمضان — العدّ التنازلي لنهاية السحور (الفجر) أو للإفطار (المغرب)، وخارجه الأيام المتبقية */
public class RamadanWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        if (Intent.ACTION_DATE_CHANGED.equals(intent.getAction())) PlusWidgets.refreshAll(c);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_ramadan);
        WidgetStyle.apply(c, v, R.id.r_root);
        v.setOnClickPendingIntent(R.id.r_root, PlusWidgets.openApp(c, 8));
        JSONObject data = PlusWidgets.load(c);
        if (PlusWidgets.showGate(c, v, data, R.id.r_content, R.id.r_empty)) { m.updateAppWidget(id, v); return; }
        JSONObject r = data.optJSONObject("ramadan");
        if (r == null) { PlusWidgets.showGate(c, v, null, R.id.r_content, R.id.r_empty); m.updateAppWidget(id, v); return; }
        v.setViewVisibility(R.id.r_content, View.VISIBLE);
        v.setViewVisibility(R.id.r_empty, View.GONE);
        long now = System.currentTimeMillis();
        JSONArray days = r.optJSONArray("days");
        JSONObject next = null;
        String kind = null;
        for (int i = 0; days != null && i < days.length() && next == null; i++) {
            JSONObject d = days.optJSONObject(i);
            if (d == null) continue;
            if (d.optLong("fajr") > now) { next = d; kind = "suhoor"; }
            else if (d.optLong("maghrib") > now) { next = d; kind = "iftar"; }
        }
        if (next != null) {
            boolean iftar = "iftar".equals(kind);
            long at = next.optLong(iftar ? "maghrib" : "fajr");
            v.setTextViewText(R.id.r_title, "رمضان — اليوم " + TasbihWidgetProvider.ar(next.optInt("day", 1)));
            v.setTextViewText(R.id.r_label, iftar ? "الإفطار بعد" : "نهاية السحور بعد");
            v.setViewVisibility(R.id.r_countdown, View.VISIBLE);
            v.setChronometer(R.id.r_countdown, SystemClock.elapsedRealtime() + (at - now), null, true);
            v.setChronometerCountDown(R.id.r_countdown, true);
            v.setTextViewText(R.id.r_time, next.optString(iftar ? "maghribTime" : "fajrTime", ""));
        } else {
            v.setTextViewText(R.id.r_title, "رمضان");
            v.setTextViewText(R.id.r_label, r.optString("label", ""));
            v.setViewVisibility(R.id.r_countdown, View.GONE);
            v.setTextViewText(R.id.r_time, "بحسب التقويم المحسوب");
        }
        m.updateAppWidget(id, v);
    }
}
