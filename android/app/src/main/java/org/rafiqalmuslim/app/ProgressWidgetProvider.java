package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/** ودجت رفيق بلس: الأيام المتتالية، وورد اليوم، وأذكار الصباح والمساء (من سجل الجهاز عند آخر فتح) */
public class ProgressWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (Intent.ACTION_DATE_CHANGED.equals(intent.getAction())) PlusWidgets.refreshAll(context);
    }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_progress);
        WidgetStyle.apply(c, v, R.id.g_root);
        v.setOnClickPendingIntent(R.id.g_root, PlusWidgets.openApp(c, 4));
        JSONObject data = PlusWidgets.load(c);
        if (PlusWidgets.showGate(c, v, data, R.id.g_content, R.id.g_empty)) { m.updateAppWidget(id, v); return; }
        JSONObject p = data.optJSONObject("progress");
        if (p == null) { PlusWidgets.showGate(c, v, null, R.id.g_content, R.id.g_empty); m.updateAppWidget(id, v); return; }
        v.setViewVisibility(R.id.g_content, View.VISIBLE);
        v.setViewVisibility(R.id.g_empty, View.GONE);
        // البيانات ليوم آخر فتح: في يوم جديد تُعرض كأنها لم تُسجَّل بعد
        boolean sameDay = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()).equals(p.optString("date"));
        v.setTextViewText(R.id.g_streak, p.optString("streak", "0"));
        v.setTextViewText(R.id.g_wird, p.isNull("wird") ? "ابدأ خطة ختمة لتظهر هنا" : "ورد اليوم: " + p.optString("wird") + (sameDay && p.optBoolean("wirdDone") ? " • تمّ" : ""));
        v.setProgressBar(R.id.g_bar, 100, p.optInt("percent", 0), false);
        v.setTextViewText(R.id.g_morning, (sameDay && p.optBoolean("morning") ? "✓ " : "○ ") + "أذكار الصباح");
        v.setTextViewText(R.id.g_evening, (sameDay && p.optBoolean("evening") ? "✓ " : "○ ") + "أذكار المساء");
        v.setInt(R.id.g_morning, "setBackgroundResource", sameDay && p.optBoolean("morning") ? R.drawable.widget_cell_active : R.drawable.widget_cell);
        v.setInt(R.id.g_evening, "setBackgroundResource", sameDay && p.optBoolean("evening") ? R.drawable.widget_cell_active : R.drawable.widget_cell);
        m.updateAppWidget(id, v);
    }
}
