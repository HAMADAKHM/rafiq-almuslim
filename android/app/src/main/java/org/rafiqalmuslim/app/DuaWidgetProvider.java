package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت دعاء اليوم: دعاء من القرآن والسنة كما في التطبيق (بنصه ومصدره)، يتبدل كل يوم مع خلفية مختلفة،
 * وزر «دعاء آخر»، و«نسخ» (يضعه في الحافظة)، و«مشاركة» (قائمة المشاركة في الجوال).
 */
public class DuaWidgetProvider extends AppWidgetProvider {
    static final String NEXT = "org.rafiqalmuslim.app.DUA_NEXT";
    /** خلفيات تتبدل يوميًا (ما لم يختر المستخدم تصميمًا لهذا الودجت) */
    static final String[] DAILY_BG = { "g-night", "g-mosque", "g-quran", "g-madinah", "g-kaaba", "g-pattern", "g-app" };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(a)) { refreshAll(c); return; }
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (!NEXT.equals(a) || id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
        WidgetKit.data(c).edit().putInt("du_off_" + id, WidgetKit.data(c).getInt("du_off_" + id, 0) + 1).apply();
        render(c, AppWidgetManager.getInstance(c), id);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, DuaWidgetProvider.class))) render(c, m, id);
    }

    static int dayIndex() { return (int) ((System.currentTimeMillis() + java.util.TimeZone.getDefault().getOffset(System.currentTimeMillis())) / 86_400_000L); }

    static void render(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_dua);
        int day = dayIndex();
        // خلفية اليوم ما لم يُختر تصميم خاص لهذا الودجت
        WidgetDesign.apply(c, v, R.id.u_root, id, WidgetDesign.Kind.DUA);
        JSONObject x = WidgetKit.extra(c);
        JSONArray list = x == null ? null : x.optJSONArray("duas");
        if (list == null || list.length() == 0) {
            v.setViewVisibility(R.id.u_content, View.GONE);
            v.setViewVisibility(R.id.u_empty, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.u_root, WidgetKit.route(c, "/duas", 50));
            m.updateAppWidget(id, v);
            return;
        }
        v.setViewVisibility(R.id.u_content, View.VISIBLE);
        v.setViewVisibility(R.id.u_empty, View.GONE);
        int idx = Math.floorMod(day * 5 + 3 + WidgetKit.data(c).getInt("du_off_" + id, 0), list.length());
        JSONObject d = list.optJSONObject(idx);
        String text = d.optString("t"), src = d.optString("s");
        int size = WidgetKit.size(c, id);
        v.setTextViewText(R.id.u_text, text);
        v.setTextViewText(R.id.u_src, src);
        v.setInt(R.id.u_text, "setMaxLines", size == 0 ? 2 : size == 1 ? 3 : 8);
        v.setViewVisibility(R.id.u_actions, size == 0 ? View.GONE : View.VISIBLE);
        WidgetKit.text(c, v, R.id.u_text, size == 2 ? 19 : 18);
        v.setViewVisibility(R.id.u_src, size == 0 ? View.GONE : View.VISIBLE);
        String full = text + "\n— " + src + "\n\nمن تطبيق رفيق المسلم";
        Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, full);
        Intent chooser = Intent.createChooser(send, "مشاركة الدعاء").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.u_share, PendingIntent.getActivity(c, 51 * 1000 + (id % 1000), chooser, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        Intent copy = new Intent(c, CopyActivity.class).putExtra(CopyActivity.EXTRA_TEXT, full).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION);
        v.setOnClickPendingIntent(R.id.u_copy, PendingIntent.getActivity(c, 52 * 1000 + (id % 1000), copy, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        v.setOnClickPendingIntent(R.id.u_next, WidgetKit.action(c, DuaWidgetProvider.class, NEXT, id, 5));
        v.setOnClickPendingIntent(R.id.u_text, WidgetKit.route(c, "/duas", 53));
        m.updateAppWidget(id, v);
    }
}
