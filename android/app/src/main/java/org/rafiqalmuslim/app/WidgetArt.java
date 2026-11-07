package org.rafiqalmuslim.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Bundle;

/**
 * خلفيات الودجت بالتصميم الذهبي للتطبيق: صور صاحب التطبيق (أو نقش إطاره الأخضر) مقصوصة على مقاس الودجت
 * بلا تمطيط، بشكل يختاره المستخدم (مستطيل، قبة، إطار مزخرف)، وإطار ذهبي مزدوج متدرّج. تُرسم صورة بمقاس الودجت.
 */
final class WidgetArt {
    private WidgetArt() {}

    static final String[] SHAPES = { "round", "dome", "frame" };
    static final String[] SHAPE_NAMES = { "مستطيل بإطار ذهبي", "قبة", "إطار مزخرف" };

    static boolean isArt(String style) { return style != null && style.startsWith("g-"); }

    static int photoOf(String style) {
        switch (style) {
            case "g-mosque": return R.drawable.widget_ph_mosque;
            case "g-quran": return R.drawable.widget_ph_quran;
            case "g-kaaba": return R.drawable.widget_ph_kaaba;
            case "g-madinah": return R.drawable.widget_ph_madinah;
            case "g-pattern": return R.drawable.widget_ph_pattern;
            case "g-app": return R.drawable.widget_ph_night;
            case "g-light": return R.drawable.widget_ph_pattern;
            default: return R.drawable.widget_ph_night;
        }
    }

    /** مقاس الودجت بالبكسل من خيارات النظام (أو مقاس افتراضي) */
    static int[] sizePx(Context c, int widgetId, float dp) {
        int w = 320, h = 160;
        try {
            Bundle o = AppWidgetManager.getInstance(c).getAppWidgetOptions(widgetId);
            int mw = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0), mh = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
            if (mw > 0) w = mw;
            if (mh > 0) h = mh;
        } catch (Exception ignored) {}
        return new int[] { Math.round(w * dp), Math.round(h * dp) };
    }

    static Path shapePath(String shape, float w, float h, float inset, float r) {
        Path p = new Path();
        float l = inset, t = inset, rt = w - inset, b = h - inset;
        if ("dome".equals(shape)) {
            float peak = Math.min(h * 0.16f, 34 * (r / 22f)), base = t + peak, cx = w / 2f, half = Math.min(w * 0.2f, 90 * (r / 22f));
            p.moveTo(l + r, base);
            p.lineTo(cx - half, base);
            p.cubicTo(cx - half * 0.45f, base, cx - half * 0.3f, t + peak * 0.35f, cx, t);
            p.cubicTo(cx + half * 0.3f, t + peak * 0.35f, cx + half * 0.45f, base, cx + half, base);
            p.lineTo(rt - r, base);
            p.quadTo(rt, base, rt, base + r);
            p.lineTo(rt, b - r);
            p.quadTo(rt, b, rt - r, b);
            p.lineTo(l + r, b);
            p.quadTo(l, b, l, b - r);
            p.lineTo(l, base + r);
            p.quadTo(l, base, l + r, base);
            p.close();
        } else if ("frame".equals(shape)) {
            // كإطار بطاقة الصلاة في التصميم: قبة علوية، وزوايا مقطوعة للداخل، ورأس سفلي مدبّب
            float peak = Math.min(h * 0.12f, 26 * (r / 22f)), base = t + peak, cx = w / 2f, half = Math.min(w * 0.18f, 80 * (r / 22f));
            float point = Math.min(h * 0.09f, 18 * (r / 22f)), bot = b - point, n = r * 0.8f;
            p.moveTo(l + n, base);
            p.lineTo(cx - half, base);
            p.cubicTo(cx - half * 0.45f, base, cx - half * 0.3f, t + peak * 0.35f, cx, t);
            p.cubicTo(cx + half * 0.3f, t + peak * 0.35f, cx + half * 0.45f, base, cx + half, base);
            p.lineTo(rt - n, base);
            p.quadTo(rt - n, base + n, rt, base + n);
            p.lineTo(rt, bot - n);
            p.quadTo(rt - n, bot - n, rt - n, bot);
            p.lineTo(cx + half * 0.6f, bot);
            p.quadTo(cx + half * 0.2f, bot, cx, b);
            p.quadTo(cx - half * 0.2f, bot, cx - half * 0.6f, bot);
            p.lineTo(l + n, bot);
            p.quadTo(l + n, bot - n, l, bot - n);
            p.lineTo(l, base + n);
            p.quadTo(l + n, base + n, l + n, base);
            p.close();
        } else {
            p.addRoundRect(new RectF(l, t, rt, b), r, r, Path.Direction.CW);
        }
        return p;
    }

    static Bitmap render(Context c, String style, String shape, int widgetId) {
        float dp = c.getResources().getDisplayMetrics().density;
        return renderSized(c, style, shape, sizePx(c, widgetId, dp));
    }

    static Bitmap renderSized(Context c, String style, String shape, int[] s) {
        float dp = c.getResources().getDisplayMetrics().density;
        // حد للحجم حتى لا تتجاوز ذاكرة الودجت
        float k = Math.min(1f, 900f / Math.max(s[0], s[1]));
        int w = Math.max(60, Math.round(s[0] * k)), h = Math.max(40, Math.round(s[1] * k));
        float u = dp * k, r = 22 * u;
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(out);
        Path outer = shapePath(shape, w, h, 1.5f * u, r);
        cv.save();
        cv.clipPath(outer);
        BitmapFactory.Options op = new BitmapFactory.Options();
        op.inScaled = false;
        Bitmap ph = BitmapFactory.decodeResource(c.getResources(), photoOf(style), op);
        Paint pp = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        if ("g-light".equals(style)) {
            // الفاتح العاجي: كريمي دافئ بنقش خفيف وإطار ذهبي (للوضع الفاتح؛ الكتابة داكنة)
            Paint lg = new Paint();
            lg.setShader(new LinearGradient(0, 0, 0, h, new int[] { Color.parseColor("#FBF5E6"), Color.parseColor("#F1E4C4") }, null, Shader.TileMode.CLAMP));
            cv.drawRect(0, 0, w, h, lg);
            if (ph != null) {
                BitmapShader sh = new BitmapShader(ph, Shader.TileMode.MIRROR, Shader.TileMode.MIRROR);
                pp.setShader(sh); pp.setAlpha(28); cv.drawRect(0, 0, w, h, pp); pp.setShader(null); pp.setAlpha(255);
                ph.recycle();
            }
            cv.restore();
            Paint gl = new Paint(Paint.ANTI_ALIAS_FLAG);
            gl.setStyle(Paint.Style.STROKE); gl.setStrokeWidth(1.6f * u); gl.setColor(Color.parseColor("#C9A24A"));
            cv.drawPath(outer, gl);
            return out;
        }
        if ("g-pattern".equals(style)) {
            cv.drawColor(Color.parseColor("#0B4A2C"));
            BitmapShader sh = new BitmapShader(ph, Shader.TileMode.MIRROR, Shader.TileMode.MIRROR);
            Matrix m = new Matrix(); float sc = Math.max(1f, h / (float) ph.getHeight() * 0.9f); m.setScale(sc, sc); sh.setLocalMatrix(m);
            pp.setShader(sh);
            cv.drawRect(0, 0, w, h, pp);
            pp.setShader(null);
        } else if ("g-app".equals(style) && ph != null) {
            // كتصميم التطبيق: المشهد الليلي أهدأ وأغمق، تحت زجاج أخضر مزرق داكن
            float sc = Math.max(w / (float) ph.getWidth(), h / (float) ph.getHeight());
            float dw = ph.getWidth() * sc, dh = ph.getHeight() * sc, top = (h - dh) * 0.4f;
            android.graphics.ColorMatrix cm = new android.graphics.ColorMatrix(); cm.setSaturation(0.45f);
            android.graphics.ColorMatrix dim = new android.graphics.ColorMatrix(); dim.setScale(0.6f, 0.64f, 0.64f, 1f); cm.postConcat(dim);
            pp.setColorFilter(new android.graphics.ColorMatrixColorFilter(cm));
            cv.drawBitmap(ph, null, new RectF((w - dw) / 2f, top, (w + dw) / 2f, top + dh), pp);
            pp.setColorFilter(null);
        } else if (ph != null) {
            // قص وسطي بلا تمطيط (مع ميل للأعلى حيث الهلال والمآذن)
            float sc = Math.max(w / (float) ph.getWidth(), h / (float) ph.getHeight());
            float dw = ph.getWidth() * sc, dh = ph.getHeight() * sc;
            float top = (h - dh) * ("g-night".equals(style) ? 0.45f : 0.5f);
            cv.drawBitmap(ph, null, new RectF((w - dw) / 2f, top, (w + dw) / 2f, top + dh), pp);
        }
        if (ph != null) ph.recycle();
        // تظليل أخضر داكن يضمن وضوح الكتابة كما في بطاقات التطبيق
        Paint veil = new Paint();
        boolean pat = "g-pattern".equals(style);
        if ("g-app".equals(style)) {
            veil.setShader(new LinearGradient(0, 0, w, h, new int[] { Color.argb(200, 30, 52, 49), Color.argb(225, 12, 29, 28) }, null, Shader.TileMode.CLAMP));
            cv.drawRect(0, 0, w, h, veil);
            cv.restore();
            Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
            line.setStyle(Paint.Style.STROKE);
            line.setStrokeWidth(1.3f * u);
            line.setColor(Color.argb(150, 227, 201, 143));
            cv.drawPath(outer, line);
            return out;
        }
        veil.setShader(new LinearGradient(0, 0, 0, h,
            new int[] { Color.argb(pat ? 40 : 120, 4, 32, 22), Color.argb(pat ? 20 : 95, 4, 32, 22), Color.argb(pat ? 70 : 175, 4, 32, 22) },
            new float[] { 0f, 0.45f, 1f }, Shader.TileMode.CLAMP));
        cv.drawRect(0, 0, w, h, veil);
        cv.restore();
        // الإطار الذهبي المزدوج المتدرّج
        Paint gold = new Paint(Paint.ANTI_ALIAS_FLAG);
        gold.setStyle(Paint.Style.STROKE);
        gold.setShader(new LinearGradient(0, 0, w, h,
            new int[] { Color.parseColor("#FFF1C1"), Color.parseColor("#E7C46E"), Color.parseColor("#B88A2E"), Color.parseColor("#F6DC93") },
            null, Shader.TileMode.CLAMP));
        gold.setStrokeWidth(2.6f * u);
        cv.drawPath(outer, gold);
        Path inner = shapePath(shape, w, h, 6f * u, r * 0.82f);
        gold.setStrokeWidth(1f * u);
        gold.setAlpha(190);
        cv.drawPath(inner, gold);
        return out;
    }
}
