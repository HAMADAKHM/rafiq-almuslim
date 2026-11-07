package org.rafiqalmuslim.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.RectF;
import android.graphics.Shader;
import android.widget.RemoteViews;

/**
 * خلفيات الودجتات بالتصاميم الجديدة المعتمدة (لوحة تصاميم صاحب التطبيق): صور حقيقية مقصوصة على مقاس الودجت
 * بلا تمطيط، وأخضر زمردي داكن، وإطار ذهبي مزدوج، والقرآن على ورق عاجي بإطار مزخرف. الكتابة فوقها حية (RemoteViews).
 */
final class WidgetDesign {
    private WidgetDesign() {}

    enum Kind { PRAYER_S, PRAYER_L, QURAN, ADHKAR, TASBIH, DUA, ALL, GREET, DAILY }

    static final int GOLD = Color.parseColor("#E3C98F"), GOLD_D = Color.parseColor("#B88A2E"), GREEN = Color.parseColor("#0F3A2B"), GREEN_D = Color.parseColor("#06201A");

    /** يرسم الخلفية ويضعها خلف المحتوى مع الشفافية المختارة (بلس) */
    static void apply(Context c, RemoteViews v, int rootId, int id, Kind k) {
        int alpha = WidgetStyle.alphaFor(c, id);
        v.setInt(rootId, "setBackgroundColor", 0);
        if (alpha <= 0) { v.setViewVisibility(R.id.wbg, android.view.View.GONE); return; }
        try {
            v.setImageViewBitmap(R.id.wbg, render(c, id, k));
            v.setViewVisibility(R.id.wbg, android.view.View.VISIBLE);
            v.setInt(R.id.wbg, "setImageAlpha", Math.round(alpha * 2.55f));
        } catch (Throwable t) {
            WidgetStyle.applyStyle(c, v, rootId, id, "g-app");
        }
    }

    static Bitmap photo(Context c, int res) {
        BitmapFactory.Options o = new BitmapFactory.Options(); o.inScaled = false;
        return BitmapFactory.decodeResource(c.getResources(), res, o);
    }

    /** قص وسطي بلا تمطيط داخل مستطيل (أفقيًا بحسب موضع fx) */
    static void cover(Canvas cv, Bitmap b, RectF dst, float fx, float fy, Paint p) {
        float sc = Math.max(dst.width() / b.getWidth(), dst.height() / b.getHeight());
        float dw = b.getWidth() * sc, dh = b.getHeight() * sc;
        float l = dst.left + (dst.width() - dw) * fx, t = dst.top + (dst.height() - dh) * fy;
        cv.save(); cv.clipRect(dst);
        cv.drawBitmap(b, null, new RectF(l, t, l + dw, t + dh), p);
        cv.restore();
    }

    static int greetPhoto(int day) {
        int[] a = { R.drawable.wd_greet_1, R.drawable.wd_greet_2, R.drawable.wd_greet_3 };
        return a[Math.floorMod(day, a.length)];
    }

    static Bitmap render(Context c, int id, Kind k) {
        float dp = c.getResources().getDisplayMetrics().density;
        int[] s = WidgetArt.sizePx(c, id, dp);
        float sc = Math.min(1f, 900f / Math.max(s[0], s[1]));
        int w = Math.max(80, Math.round(s[0] * sc)), h = Math.max(60, Math.round(s[1] * sc));
        float u = dp * sc, r = 22 * u;
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(out);
        Path clip = new Path(); clip.addRoundRect(new RectF(1.5f * u, 1.5f * u, w - 1.5f * u, h - 1.5f * u), r, r, Path.Direction.CW);
        cv.save(); cv.clipPath(clip);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        RectF all = new RectF(0, 0, w, h);
        boolean light = false;
        switch (k) {
            case PRAYER_S: case PRAYER_L: {
                green(cv, w, h);
                float pw = w * (k == Kind.PRAYER_S ? 0.48f : 0.55f);
                fadedPhoto(cv, photo(c, R.drawable.wd_night), new RectF(0, 0, pw, h), true, p);
                break;
            }
            case QURAN: {
                light = true;
                cover(cv, photo(c, R.drawable.wd_quran), all, 0f, 0.5f, p);
                Paint veil = new Paint();
                veil.setShader(new LinearGradient(w * 0.32f, 0, w, 0, new int[] { Color.argb(0, 251, 245, 230), Color.argb(215, 251, 245, 230) }, null, Shader.TileMode.CLAMP));
                cv.drawRect(all, veil);
                break;
            }
            case ADHKAR: case TASBIH: {
                green(cv, w, h);
                Bitmap pat = photo(c, R.drawable.widget_ph_pattern);
                Paint pp = new Paint(); pp.setShader(new BitmapShader(pat, Shader.TileMode.MIRROR, Shader.TileMode.MIRROR)); pp.setAlpha(55);
                cv.drawRect(all, pp);
                break;
            }
            case DUA: {
                cover(cv, photo(c, R.drawable.wd_dua), all, 0.5f, 0.55f, p);
                band(cv, w, h, 0.72f);
                break;
            }
            case ALL: {
                cover(cv, photo(c, R.drawable.wd_all), all, 0.3f, 0.5f, p);
                Paint veil = new Paint();
                veil.setShader(new LinearGradient(0, 0, w, 0, new int[] { Color.argb(150, 6, 32, 26), Color.argb(70, 6, 32, 26), Color.argb(215, 6, 32, 26) }, new float[] { 0f, 0.45f, 1f }, Shader.TileMode.CLAMP));
                cv.drawRect(all, veil);
                band(cv, w, h, 0.62f);
                break;
            }
            case GREET: {
                cover(cv, photo(c, greetPhoto(DuaWidgetProvider.dayIndex())), all, 0.5f, 0.5f, p);
                band(cv, w, h, 0.78f);
                break;
            }
            case DAILY: {
                // صباحًا على اليمين، ومساءً على اليسار (الواجهة من اليمين)
                cover(cv, photo(c, R.drawable.wd_evening), new RectF(0, 0, w / 2f, h), 0.5f, 0.5f, p);
                cover(cv, photo(c, R.drawable.wd_morning), new RectF(w / 2f, 0, w, h), 0.5f, 0.5f, p);
                Paint veil = new Paint();
                veil.setShader(new LinearGradient(0, 0, 0, h, new int[] { Color.argb(40, 0, 0, 0), Color.argb(150, 6, 20, 16), Color.argb(235, 6, 32, 26) }, new float[] { 0f, 0.6f, 1f }, Shader.TileMode.CLAMP));
                cv.drawRect(all, veil);
                Paint div = new Paint(Paint.ANTI_ALIAS_FLAG); div.setColor(GOLD); div.setStrokeWidth(1.2f * u);
                cv.drawLine(w / 2f, 0, w / 2f, h * 0.76f, div);
                break;
            }
        }
        cv.restore();
        // الإطار الذهبي المزدوج (المزخرف للقرآن و«الكل في واحد»)
        Paint g = new Paint(Paint.ANTI_ALIAS_FLAG); g.setStyle(Paint.Style.STROKE);
        g.setShader(new LinearGradient(0, 0, w, h, new int[] { Color.parseColor("#FFF1C1"), GOLD, GOLD_D, Color.parseColor("#F6DC93") }, null, Shader.TileMode.CLAMP));
        g.setStrokeWidth((light ? 2.2f : 1.8f) * u);
        cv.drawPath(clip, g);
        if (k == Kind.QURAN || k == Kind.ALL) {
            g.setStrokeWidth(0.9f * u); g.setAlpha(200);
            float in = 7 * u;
            cv.drawRoundRect(new RectF(in, in, w - in, h - in), r * 0.7f, r * 0.7f, g);
            corners(cv, w, h, in + 2 * u, u, g);
        }
        return out;
    }

    static void green(Canvas cv, int w, int h) {
        Paint b = new Paint();
        b.setShader(new LinearGradient(0, 0, w, h, new int[] { Color.parseColor("#14473A"), GREEN, GREEN_D }, null, Shader.TileMode.CLAMP));
        cv.drawRect(0, 0, w, h, b);
    }

    /** صورة تتلاشى في الأخضر نحو الداخل */
    static void fadedPhoto(Canvas cv, Bitmap b, RectF dst, boolean leftSide, Paint p) {
        Bitmap layer = Bitmap.createBitmap((int) dst.width(), (int) dst.height(), Bitmap.Config.ARGB_8888);
        Canvas lc = new Canvas(layer);
        cover(lc, b, new RectF(0, 0, dst.width(), dst.height()), 0.5f, 0.5f, p);
        Paint m = new Paint(); m.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
        m.setShader(new LinearGradient(0, 0, dst.width(), 0, leftSide ? new int[] { 0xFF000000, 0xFF000000, 0x00000000 } : new int[] { 0x00000000, 0xFF000000, 0xFF000000 }, new float[] { 0f, 0.55f, 1f }, Shader.TileMode.CLAMP));
        lc.drawRect(0, 0, dst.width(), dst.height(), m);
        cv.drawBitmap(layer, dst.left, dst.top, null);
        layer.recycle();
    }

    /** شريط داكن أسفل الصورة لوضوح الكتابة */
    static void band(Canvas cv, int w, int h, float from) {
        Paint veil = new Paint();
        veil.setShader(new LinearGradient(0, h * from - h * 0.25f, 0, h, new int[] { Color.argb(0, 6, 32, 26), Color.argb(225, 6, 32, 26) }, new float[] { 0f, 1f }, Shader.TileMode.CLAMP));
        cv.drawRect(0, 0, w, h, veil);
    }

    /** زخارف أركان ذهبية بسيطة (أقواس متداخلة) */
    static void corners(Canvas cv, int w, int h, float in, float u, Paint g) {
        float s = 16 * u;
        float[][] cs = { { in, in, 1, 1 }, { w - in, in, -1, 1 }, { in, h - in, 1, -1 }, { w - in, h - in, -1, -1 } };
        for (float[] q : cs) {
            Path path = new Path();
            path.moveTo(q[0], q[1] + q[3] * s);
            path.quadTo(q[0], q[1], q[0] + q[2] * s, q[1]);
            path.moveTo(q[0] + q[2] * s * 0.45f, q[1] + q[3] * s * 0.45f);
            path.quadTo(q[0] + q[2] * s * 0.15f, q[1] + q[3] * s * 0.15f, q[0] + q[2] * s * 0.45f, q[1] + q[3] * s * 0.12f);
            cv.drawPath(path, g);
            cv.drawCircle(q[0] + q[2] * s * 0.32f, q[1] + q[3] * s * 0.32f, 1.6f * u, g);
        }
    }
}
