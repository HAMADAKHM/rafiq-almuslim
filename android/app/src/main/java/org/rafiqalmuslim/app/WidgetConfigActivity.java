package org.rafiqalmuslim.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * «إعداد الودجت» بعد وضعه: ضغطة مطوّلة على الودجت ← «إعداد» (Android 12+)، أو عند إضافته.
 * يختار المستخدم تصميم هذا الودجت وحده (الأصلي للجميع، والباقي لمشتركي رفيق بلس).
 * تغيير الحجم من الشاشة الرئيسية نفسها: ضغطة مطوّلة ثم سحب المقابض.
 */
public class WidgetConfigActivity extends Activity {
    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Bundle ex = getIntent().getExtras();
        if (ex != null) widgetId = ex.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        // الإلغاء لا يزيل الودجت (الإعداد اختياري)
        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }
        boolean plus = WidgetStyle.plus(this);
        String cur = WidgetStyle.forWidget(this, widgetId);
        float dp = getResources().getDisplayMetrics().density;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setPadding((int) (20 * dp), (int) (24 * dp), (int) (20 * dp), (int) (20 * dp));
        root.setBackgroundColor(Color.parseColor("#F5F0E6"));

        TextView title = new TextView(this);
        title.setText("إعداد الودجت");
        title.setTextSize(22);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextColor(Color.parseColor("#073B32"));
        root.addView(title);
        TextView hint = new TextView(this);
        hint.setText("اختر خلفية هذا الودجت وشكله. لتكبيره أو تصغيره: اضغط عليه مطوّلًا في الشاشة الرئيسية ثم اسحب المقابض." + (plus ? "" : "\nالتصاميم الملوّنة لمشتركي رفيق المسلم بلس."));
        hint.setTextSize(14);
        hint.setTextColor(Color.parseColor("#5E6B64"));
        hint.setPadding(0, (int) (6 * dp), 0, (int) (14 * dp));
        root.addView(hint);

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        for (int i = 0; i < WidgetStyle.IDS.length; i++) {
            final String id = WidgetStyle.IDS[i];
            final boolean locked = !plus && !WidgetStyle.free(id);
            Button bt = new Button(this);
            bt.setAllCaps(false);
            bt.setText(WidgetStyle.NAMES[i] + (locked ? "  🔒" : "") + (id.equals(cur) ? "  ✓" : ""));
            bt.setTextColor(Color.WHITE);
            bt.setTextSize(14);
            if (WidgetArt.isArt(id)) bt.setBackground(new android.graphics.drawable.BitmapDrawable(getResources(), WidgetArt.renderSized(this, id, WidgetStyle.shapeFor(this, widgetId), new int[] { (int) (170 * dp), (int) (64 * dp) })));
            else bt.setBackground(getDrawable(WidgetStyle.resOf(id)));
            bt.setShadowLayer(4, 0, 1, Color.BLACK);
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = 0;
            lp.height = (int) (64 * dp);
            lp.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            lp.setMargins((int) (5 * dp), (int) (5 * dp), (int) (5 * dp), (int) (5 * dp));
            bt.setLayoutParams(lp);
            bt.setOnClickListener((v) -> {
                if (locked) { Toast.makeText(this, "تصاميم الودجت من مزايا رفيق المسلم بلس", Toast.LENGTH_SHORT).show(); return; }
                WidgetStyle.setForWidget(this, widgetId, id);
                finish();
            });
            grid.addView(bt);
        }
        root.addView(grid);

        TextView shT = new TextView(this);
        shT.setText("شكل الودجت");
        shT.setTextSize(17);
        shT.setTypeface(Typeface.DEFAULT_BOLD);
        shT.setTextColor(Color.parseColor("#073B32"));
        shT.setPadding(0, (int) (16 * dp), 0, (int) (6 * dp));
        root.addView(shT);
        String curShape = WidgetStyle.shapeFor(this, widgetId);
        String artNow = cur != null && WidgetArt.isArt(cur) ? cur : WidgetStyle.global(this);
        if (!WidgetArt.isArt(artNow)) artNow = WidgetStyle.DEFAULT;
        LinearLayout shapes = new LinearLayout(this);
        shapes.setOrientation(LinearLayout.HORIZONTAL);
        for (int i = 0; i < WidgetArt.SHAPES.length; i++) {
            final String sh = WidgetArt.SHAPES[i];
            Button b2 = new Button(this);
            b2.setAllCaps(false);
            b2.setText(WidgetArt.SHAPE_NAMES[i] + (sh.equals(curShape) ? " ✓" : ""));
            b2.setTextColor(Color.WHITE);
            b2.setTextSize(13);
            b2.setShadowLayer(4, 0, 1, Color.BLACK);
            b2.setBackground(new android.graphics.drawable.BitmapDrawable(getResources(), WidgetArt.renderSized(this, artNow, sh, new int[] { (int) (110 * dp), (int) (80 * dp) })));
            LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(0, (int) (80 * dp), 1f);
            bl.setMargins((int) (4 * dp), 0, (int) (4 * dp), 0);
            b2.setOnClickListener((v) -> { WidgetStyle.setShapeForWidget(this, widgetId, sh); finish(); });
            shapes.addView(b2, bl);
        }
        root.addView(shapes);

        Button same = new Button(this);
        same.setText("مثل باقي الودجتات (التصميم العام)");
        same.setAllCaps(false);
        GradientDrawable g = new GradientDrawable();
        g.setCornerRadius(14 * dp);
        g.setStroke((int) dp, Color.parseColor("#C6A15B"));
        same.setBackground(g);
        same.setTextColor(Color.parseColor("#073B32"));
        same.setOnClickListener((v) -> {
            getSharedPreferences(WidgetStyle.PREFS, MODE_PRIVATE).edit().remove("w_" + widgetId).apply();
            WidgetStyle.refreshEverything(this);
            finish();
        });
        LinearLayout.LayoutParams sl = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (int) (52 * dp));
        sl.topMargin = (int) (12 * dp);
        root.addView(same, sl);

        ScrollView sv = new ScrollView(this);
        sv.addView(root);
        setContentView(sv);
        title.setGravity(Gravity.START);
    }
}
