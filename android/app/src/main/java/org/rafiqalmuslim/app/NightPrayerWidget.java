package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Bundle;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ودجت «مواقيت الصلاة» بالهوية الليلية الفاخرة (كحلي وذهبي وضوء فانوس دافئ)، بثلاثة أحجام:
 * - صغير: الصلاة القادمة ووقتها والوقت المتبقي (عدّ حي).
 * - متوسط: الصلاة الحالية أو القادمة والوقت المتبقي، وصف مختصر بالمواقيت الست.
 * - كبير: كل المواقيت في قائمة والحالية مميزة، والعدّ، واسم المدينة والتاريخ الهجري.
 * التصميم يتكيف مع مقاس الودجت عند تغيير حجمه. يُرسم كله بالشيفرة (لا صور).
 * البطارية: العدّ التنازلي يتولاه النظام (Chronometer) دون تحديثات، ويُعاد الرسم مرة عند دخول كل صلاة فقط.
 */
public abstract class NightPrayerWidget extends AppWidgetProvider {
    static final int NAVY = 0xFF0D1833, NAVY2 = 0xFF0A1226, GOLD = 0xFFE3C27F, GOLD_D = 0xFFC9A85C, CREAM = 0xFFF4EFE3, MUTED = 0xFFA9B3CA, GREEN = 0xFF2E9E63;
    static final String[] SHORT = { "الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء" };

    /** الحجم الافتراضي لهذا النوع (0 صغير، 1 متوسط، 2 كبير)؛ يتغير التصميم إن غيّر المستخدم الحجم */
    abstract int kind();

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) render(c, m, id, kind());
        PrayerWidgetProvider.scheduleNext(c);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) { render(c, m, id, kind()); }

    static final Class<?>[] ALL = { NightPrayerSmall.class, NightPrayerMedium.class, NightPrayerLarge.class };

    /** يعيد رسم كل ودجتات هذا النوع؛ يعيد true إن وُجد منها شيء على الشاشة */
    static boolean refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        boolean any = false;
        for (int k = 0; k < ALL.length; k++) {
            int[] ids = m.getAppWidgetIds(new ComponentName(c, ALL[k]));
            for (int id : ids) { render(c, m, id, k); any = true; }
        }
        return any;
    }

    /** حالة اليوم: الصلوات الست بوقتها، والحالية (أو -1)، والقادمة */
    static final class State {
        String[] times = new String[6];
        long[] at = new long[6];
        int current = -1, next = -1; // فهارس من 0..5 (1 = الشروق)
        long nextAt; String city, hijri;
    }

    static State state(Context c) throws Exception {
        JSONObject data = PrayerWidgetProvider.load(c);
        if (data == null || data.isNull("city")) return null;
        JSONArray days = data.getJSONArray("days");
        long now = System.currentTimeMillis();
        int[] nx = PrayerWidgetProvider.findNext(days, now);
        if (nx == null) return null;
        // يوم العرض: يوم القادمة؛ وإن كانت القادمة فجرًا فالعشاء (من اليوم السابق) هي «الآن» حتى الفجر
        int d = nx[0];
        int dayIdx = (nx[1] == 0 && d > 0) ? d - 1 : d;
        JSONObject day = days.getJSONObject(dayIdx);
        JSONArray pr = day.getJSONArray("prayers");
        State s = new State();
        s.city = data.optString("city", "");
        s.hijri = day.optString("hijri", "");
        JSONObject sr = day.optJSONObject("sunrise");
        for (int i = 0, j = 0; i < 6; i++) {
            if (i == 1) { s.times[1] = sr != null ? sr.optString("time", "") : ""; s.at[1] = sr != null ? sr.optLong("at", 0) : 0; continue; }
            JSONObject p = pr.getJSONObject(j++);
            s.times[i] = p.getString("time"); s.at[i] = p.getLong("at");
        }
        JSONObject np = days.getJSONObject(nx[0]).getJSONArray("prayers").getJSONObject(nx[1]);
        s.nextAt = np.getLong("at");
        s.next = new int[] { 0, 2, 3, 4, 5 }[nx[1]];
        if (dayIdx == nx[0]) {
            // الحالية = آخر صلاة دخل وقتها في يوم العرض (الشروق ليس صلاة: بعده حتى الظهر لا «الآن»)
            for (int i = 0; i < 6; i++) if (i != 1 && s.at[i] > 0 && s.at[i] <= now) s.current = i;
            if (s.current == 0 && s.at[1] > 0 && s.at[1] <= now) s.current = -1;
        } else {
            s.current = 5; // بعد العشاء وقبل منتصف الليل: العشاء «الآن»، والقادمة فجر الغد
        }
        return s;
    }

    static void render(Context c, AppWidgetManager m, int id, int kind) {
        float dp = c.getResources().getDisplayMetrics().density;
        int[] px = WidgetArt.sizePx(c, id, dp);
        float wdp = px[0] / dp, hdp = px[1] / dp;
        // التصميم بحسب المقاس الفعلي: كبير إن اتسع للقائمة، ومتوسط إن كان عريضًا، وإلا صغير
        int layout = (wdp >= 230 && hdp >= 230) ? 2 : (wdp >= 230 && wdp / Math.max(1, hdp) >= 1.5f) ? 1 : (kind == 2 && hdp >= 180 ? 2 : 0);
        float tw = layout == 0 ? 300 : 600, th = layout == 2 ? 600 : 300;
        Tile t = new Tile(c, id, 0, tw, th);
        background(t, tw, th);
        try {
            State s = state(c);
            if (s == null) throw new Exception("no data");
            if (layout == 0) small(t, s); else if (layout == 1) medium(t, s); else large(t, s);
        } catch (Exception e) {
            t.text(c.getString(R.string.widget_empty), 20, 20, tw - 20, th - 20, 22, CREAM, Tile.CENTER, Tile.BOLD, 4);
        }
        m.updateAppWidget(id, t.done(WidgetKit.route(c, "/prayer", 0)));
    }

    // ———— الخلفية: ليل كحلي بزاوية مستديرة، وهلال وتوهج فانوس خافت، وإطار ذهبي رفيع ————
    static void background(Tile t, float tw, float th) {
        RectF r = t.box(2, 2, tw - 2, th - 2);
        float rad = 26 * t.k * t.bs;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setShader(new LinearGradient(r.left, r.top, r.right, r.bottom, new int[] { 0xFF172650, NAVY, NAVY2 }, new float[] { 0f, 0.55f, 1f }, Shader.TileMode.CLAMP));
        int a = 255;
        p.setAlpha(a);
        t.cv.drawRoundRect(r, rad, rad, p);
        // توهج دافئ في الزاوية اليسرى العليا (ضوء الفانوس)
        RectF g = t.box(0, 0, tw * 0.55f, th * 0.7f);
        Paint gp = new Paint(Paint.ANTI_ALIAS_FLAG);
        gp.setShader(new RadialGradient(g.left + g.width() * 0.25f, g.top + g.height() * 0.3f, Math.max(g.width(), g.height()) * 0.6f, 0x40FFC266, 0x00FFC266, Shader.TileMode.CLAMP));
        t.cv.save(); Path clip = new Path(); clip.addRoundRect(r, rad, rad, Path.Direction.CW); t.cv.clipPath(clip);
        t.cv.drawRect(r, gp);
        // نجوم خافتة
        Paint sp = new Paint(Paint.ANTI_ALIAS_FLAG); sp.setColor(0x66F3E5C0);
        for (int i = 0; i < 14; i++) {
            float x = (float) ((i * 97.3) % tw), y = (float) ((i * 53.7) % (th * 0.5));
            RectF b = t.box(x, y, x + 1, y + 1);
            t.cv.drawCircle(b.left, b.top, (i % 4 == 0 ? 1.6f : 1f) * t.k * t.bs, sp);
        }
        // هلال صغير
        RectF mo = t.box(24, 18, 58, 52);
        Paint mp = new Paint(Paint.ANTI_ALIAS_FLAG); mp.setColor(0xFFE9C779);
        Path cres = new Path();
        cres.addCircle(mo.centerX(), mo.centerY(), mo.width() / 2, Path.Direction.CW);
        Path cut = new Path(); cut.addCircle(mo.centerX() + mo.width() * 0.28f, mo.centerY() - mo.height() * 0.16f, mo.width() * 0.44f, Path.Direction.CW);
        cres.op(cut, Path.Op.DIFFERENCE);
        t.cv.drawPath(cres, mp);
        t.cv.restore();
        Paint bp = new Paint(Paint.ANTI_ALIAS_FLAG); bp.setStyle(Paint.Style.STROKE); bp.setStrokeWidth(1.4f * t.k * t.bs); bp.setColor(0x66D6B46A);
        t.cv.drawRoundRect(r, rad, rad, bp);
    }

    static String label(int i) { return SHORT[i]; }
    static String hm(String s) { return s == null ? "" : s.replaceAll("\\s*[^0-9:٠-٩\\s]+$", "").trim(); }
    static String suffix(String s) { if (s == null) return ""; java.util.regex.Matcher mm = java.util.regex.Pattern.compile("([^0-9:٠-٩\\s]+)$").matcher(s.trim()); return mm.find() ? mm.group(1) : ""; }

    // ———— صغير (300×300): الصلاة القادمة ووقتها والوقت المتبقي ————
    static void small(Tile t, State s) {
        t.text("الصلاة القادمة", 70, 22, 280, 52, 20, MUTED, Tile.RIGHT, Tile.BOLD, 1);
        t.text(label(s.next), 30, 56, 280, 110, 40, GOLD, Tile.RIGHT, Tile.BOLD, 1);
        t.text(Tile.ltr(hm(s.times[s.next]) + " " + suffix(s.times[s.next])), 20, 112, 280, 182, 54, CREAM, Tile.RIGHT, Tile.BOLD, 1);
        t.rrect(20, 196, 280, 198, 1, 0x33D6B46A);
        t.text("متبقي", 160, 210, 280, 240, 18, MUTED, Tile.RIGHT, Tile.BOLD, 1);
        t.countdown(s.nextAt - System.currentTimeMillis(), 20, 236, 280, 280, 30, GOLD);
    }

    // ———— متوسط (600×300): الحالية/القادمة + المتبقي + المواقيت الست ————
    static void medium(Tile t, State s) {
        int shown = s.current >= 0 ? s.current : s.next;
        t.rrect(470, 26, 574, 58, 16, s.current >= 0 ? GREEN : 0x33D6B46A);
        t.text(s.current >= 0 ? "الآن" : "القادمة", 470, 26, 574, 58, 18, s.current >= 0 ? 0xFFFFFFFF : GOLD, Tile.CENTER, Tile.BOLD, 1);
        t.text(label(shown), 300, 22, 460, 62, 30, GOLD, Tile.RIGHT, Tile.BOLD, 1);
        t.text(Tile.ltr(hm(s.times[shown]) + " " + suffix(s.times[shown])), 300, 66, 574, 132, 52, CREAM, Tile.RIGHT, Tile.BOLD, 1);
        t.text("متبقي على " + label(s.next), 30, 40, 290, 72, 19, MUTED, Tile.CENTER, Tile.BOLD, 1);
        t.countdown(s.nextAt - System.currentTimeMillis(), 50, 76, 270, 126, 38, GOLD);
        t.rrect(26, 150, 574, 151.5f, 1, 0x33D6B46A);
        float cw = 548f / 6f;
        for (int i = 0; i < 6; i++) {
            float r = 574 - i * cw, l = r - cw;
            boolean on = i == shown;
            if (on) { t.rrect(l + 6, 160, r - 6, 270, 16, 0x26E3C27F); t.stroke(l + 6, 160, r - 6, 270, 16, 0x88E3C27F, 1.2f); }
            t.text(label(i), l + 4, 176, r - 4, 210, 20, on ? GOLD : CREAM, Tile.CENTER, Tile.BOLD, 1);
            t.text(Tile.ltr(hm(s.times[i])), l + 4, 214, r - 4, 252, 22, on ? GOLD : MUTED, Tile.CENTER, Tile.BOLD, 1);
        }
    }

    // ———— كبير (600×600): كل المواقيت، والحالية مميزة، والعدّ، والمدينة ————
    static void large(Tile t, State s) {
        int shown = s.current >= 0 ? s.current : s.next;
        t.text("مواقيت الصلاة", 260, 22, 574, 62, 26, CREAM, Tile.RIGHT, Tile.BOLD, 1);
        t.text(s.hijri, 70, 26, 300, 60, 17, MUTED, Tile.LEFT, Tile.BOLD, 1);
        t.rrect(26, 74, 574, 75.5f, 1, 0x33D6B46A);
        // الكتلة العليا: الصلاة المعروضة ووقتها، والمتبقي للقادمة
        t.rrect(470, 96, 574, 128, 16, s.current >= 0 ? GREEN : 0x33D6B46A);
        t.text(s.current >= 0 ? "الآن" : "القادمة", 470, 96, 574, 128, 18, s.current >= 0 ? 0xFFFFFFFF : GOLD, Tile.CENTER, Tile.BOLD, 1);
        t.text(label(shown), 300, 92, 460, 132, 32, GOLD, Tile.RIGHT, Tile.BOLD, 1);
        t.text(Tile.ltr(hm(s.times[shown]) + " " + suffix(s.times[shown])), 290, 136, 574, 202, 54, CREAM, Tile.RIGHT, Tile.BOLD, 1);
        t.text("متبقي على " + label(s.next), 30, 104, 280, 136, 19, MUTED, Tile.CENTER, Tile.BOLD, 1);
        t.countdown(s.nextAt - System.currentTimeMillis(), 40, 140, 270, 196, 40, GOLD);
        // قائمة المواقيت الست
        float top = 222, rowH = 54;
        for (int i = 0; i < 6; i++) {
            float y = top + i * rowH;
            boolean on = i == shown;
            if (on) { t.rrect(26, y + 3, 574, y + rowH - 3, 14, 0x26E3C27F); t.stroke(26, y + 3, 574, y + rowH - 3, 14, 0x88E3C27F, 1.2f); }
            else if (i > 0) t.rrect(46, y, 554, y + 1, 1, 0x1FD6B46A);
            t.text(label(i), 300, y + 6, 550, y + rowH - 6, 23, on ? GOLD : CREAM, Tile.RIGHT, Tile.BOLD, 1);
            t.text(Tile.ltr(s.times[i]), 50, y + 6, 300, y + rowH - 6, 23, on ? GOLD : MUTED, Tile.LEFT, Tile.BOLD, 1);
        }
        t.rrect(26, 552, 574, 553.5f, 1, 0x33D6B46A);
        t.text("📍 " + s.city, 40, 556, 560, 590, 19, CREAM, Tile.CENTER, Tile.BOLD, 1);
    }
}
