package org.rafiqalmuslim.app;

import android.app.PendingIntent;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextDirectionHeuristics;
import android.text.TextPaint;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

/**
 * ودجت بتصميم لوحة صاحب التطبيق «كما هو»: صورة التصميم نفسها (مقصوصة من اللوحة، ومُحي منها النص المتغير فقط)
 * تُرسم بمقاس الودجت دون تمطيط، ثم تُكتب النصوص الحية في أماكنها من التصميم بإحداثيات اللوحة نفسها.
 * فوقها: العدّ التنازلي الحي (Chronometer) ومناطق ضغط في أماكن الأزرار المرسومة.
 */
final class Tile {
    static final int RIGHT = 1, CENTER = 0, LEFT = -1;
    static final Typeface BOLD = Typeface.create("sans-serif", Typeface.BOLD);
    static final Typeface MEDIUM = Typeface.create("sans-serif-medium", Typeface.NORMAL);
    /** نسخ عربي (Noto Naskh) للآيات والأذكار والأدعية */
    static final Typeface NASKH = Typeface.create(Typeface.SERIF, Typeface.BOLD);
    private static final int[] ZW = { R.id.z0w, R.id.z1w, R.id.z2w, R.id.z3w, R.id.z4w, R.id.z5w };
    private static final int[] Z = { R.id.z0, R.id.z1, R.id.z2, R.id.z3, R.id.z4, R.id.z5 };

    final Context c;
    final RemoteViews v;
    final float tw, th;
    /** مقاس الودجت الحقيقي، والإزاحة ومقياس اللوحة → بكسل الودجت */
    final int rw, rh;
    final float k, ox, oy;
    /** مقياس الصورة المرسومة (قد تُصغَّر الصورة للذاكرة) */
    final float bs;
    final Bitmap out;
    final Canvas cv;
    private int zones = 0;

    /** res: صورة التصميم (بضعف مقاس اللوحة)، tw×th: مقاس التصميم في اللوحة */
    Tile(Context c, int widgetId, int res, float tw, float th) {
        this.c = c; this.tw = tw; this.th = th;
        v = new RemoteViews(c.getPackageName(), R.layout.widget_tile);
        float dp = c.getResources().getDisplayMetrics().density;
        int[] s = WidgetArt.sizePx(c, widgetId, dp);
        rw = Math.max(60, s[0]); rh = Math.max(40, s[1]);
        k = Math.min(rw / tw, rh / th);
        ox = (rw - tw * k) / 2f; oy = (rh - th * k) / 2f;
        bs = Math.min(1f, 1100f / Math.max(rw, rh));
        out = Bitmap.createBitmap(Math.round(rw * bs), Math.round(rh * bs), Bitmap.Config.ARGB_8888);
        cv = new Canvas(out);
        int alpha = WidgetStyle.alphaFor(c, widgetId);
        if (alpha > 0) {
            BitmapFactory.Options o = new BitmapFactory.Options(); o.inScaled = false;
            Bitmap bg = BitmapFactory.decodeResource(c.getResources(), res, o);
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            p.setAlpha(Math.round(alpha * 2.55f));
            cv.drawBitmap(bg, null, box(0, 0, tw, th), p);
            bg.recycle();
        }
    }

    /** مستطيل بإحداثيات اللوحة → بكسل الصورة */
    RectF box(float l, float t, float r, float b) {
        return new RectF((ox + l * k) * bs, (oy + t * k) * bs, (ox + r * k) * bs, (oy + b * k) * bs);
    }

    /** نص في مربعه من التصميم: يصغر الخط حتى يتسع (حتى النصف)، ثم يُختصر بنقاط */
    void text(CharSequence s, float l, float t, float r, float b, float size, int color, int align, Typeface tf, int maxLines) {
        if (s == null || s.length() == 0) return;
        RectF rc = box(l, t, r, b);
        TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        p.setColor(color); p.setTypeface(tf);
        boolean dark = (0.299 * ((color >> 16) & 255) + 0.587 * ((color >> 8) & 255) + 0.114 * (color & 255)) < 110;
        if (!dark) p.setShadowLayer(2.2f * k * bs, 0, 0.8f * k * bs, 0x99000000);
        Layout.Alignment al = align == RIGHT ? Layout.Alignment.ALIGN_NORMAL : align == LEFT ? Layout.Alignment.ALIGN_OPPOSITE : Layout.Alignment.ALIGN_CENTER;
        int w = Math.max(1, Math.round(rc.width()));
        float px = size * k * bs, min = px * 0.5f;
        StaticLayout lay = null;
        while (true) {
            p.setTextSize(px);
            boolean last = px * 0.92f < min;
            StaticLayout.Builder bld = StaticLayout.Builder.obtain(s, 0, s.length(), p, w)
                .setAlignment(al).setTextDirection(TextDirectionHeuristics.RTL).setIncludePad(false).setLineSpacing(0, 1.05f);
            if (last) bld.setMaxLines(maxLines).setEllipsize(TextUtils.TruncateAt.END);
            lay = bld.build();
            if (last || (lay.getLineCount() <= maxLines && lay.getHeight() <= rc.height() * 1.08f)) break;
            px *= 0.92f;
        }
        cv.save();
        cv.translate(rc.left, rc.top + Math.max(0, (rc.height() - lay.getHeight()) / 2f));
        lay.draw(cv);
        cv.restore();
    }

    void rrect(float l, float t, float r, float b, float rad, int color) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setColor(color);
        cv.drawRoundRect(box(l, t, r, b), rad * k * bs, rad * k * bs, p);
    }

    void stroke(float l, float t, float r, float b, float rad, int color, float width) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setColor(color); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(width * k * bs);
        cv.drawRoundRect(box(l, t, r, b), rad * k * bs, rad * k * bs, p);
    }

    /** يضع عنصرًا ممتدًا (غلافه بعرض الودجت) في مربع من التصميم بالحشو */
    private void place(int wrap, float l, float t, float r, float b) {
        v.setViewPadding(wrap, Math.round(ox + l * k), Math.round(oy + t * k), Math.max(0, Math.round(rw - (ox + r * k))), Math.max(0, Math.round(rh - (oy + b * k))));
    }

    /** منطقة ضغط فوق زر مرسوم في التصميم */
    void zone(float l, float t, float r, float b, PendingIntent pi, String label) {
        if (zones >= Z.length || pi == null) return;
        int i = zones++;
        place(ZW[i], l, t, r, b);
        v.setViewVisibility(Z[i], View.VISIBLE);
        v.setOnClickPendingIntent(Z[i], pi);
        if (label != null) v.setContentDescription(Z[i], label);
    }

    /** العدّ التنازلي الحي (ثوانٍ) في مربعه من التصميم، محاذاته يمينًا */
    void countdown(long leftMs, float l, float t, float r, float b, float size, int color) {
        place(R.id.cd_w, l, t, r, b);
        v.setViewVisibility(R.id.cd_w, View.VISIBLE);
        v.setTextColor(R.id.cd, color);
        v.setTextViewTextSize(R.id.cd, TypedValue.COMPLEX_UNIT_PX, size * k);
        v.setChronometer(R.id.cd, SystemClock.elapsedRealtime() + leftMs, null, true);
        v.setChronometerCountDown(R.id.cd, true);
    }

    /** يُنهي الرسم: الصورة، والضغط على الودجت كله */
    RemoteViews done(PendingIntent all) {
        v.setImageViewBitmap(R.id.wbg, out);
        if (all != null) v.setOnClickPendingIntent(R.id.tile_root, all);
        return v;
    }

    // ———— صيغ النص كما في التصميم ————
    static final int GOLD = 0xFFE9C46A, WHITE = 0xFFFFFFFF, CREAM = 0xFFF3EBD7, INK = 0xFF1E2A22;

    /** «3:35 م» → «03:35» كما في التصميم */
    static String hm(String t) {
        if (t == null) return "";
        String d = t.replaceAll("[^0-9:]", "");
        if (d.indexOf(':') == 1) d = "0" + d;
        return d;
    }

    /** نص أرقام يبقى بترتيبه (12 / 33) داخل سطر عربي */
    static String ltr(String s) { return "\u202A" + s + "\u202C"; }

    /** «سورة الشرح • الآية ٦» → «(الشرح: 6)» كما في التصميم */
    static String refShort(String ref) {
        if (ref == null) return "";
        String r = ref.replace("سورة ", "").replace(" • الآية ", ": ");
        StringBuilder b = new StringBuilder();
        for (char ch : r.toCharArray()) b.append(ch >= '٠' && ch <= '٩' ? (char) ('0' + (ch - '٠')) : ch);
        return "(" + b + ")";
    }
}
