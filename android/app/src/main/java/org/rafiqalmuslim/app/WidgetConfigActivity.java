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
        hint.setText("اختر ألوان هذا الودجت. لتكبيره أو تصغيره: اضغط عليه مطوّلًا في الشاشة الرئيسية ثم اسحب المقابض." + (plus ? "" : "\nالتصاميم الملوّنة لمشتركي رفيق المسلم بلس."));
        hint.setTextSize(14);
        hint.setTextColor(Color.parseColor("#5E6B64"));
        hint.setPadding(0, (int) (6 * dp), 0, (int) (14 * dp));
        root.addView(hint);

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        for (int i = 0; i < WidgetStyle.IDS.length; i++) {
            final String id = WidgetStyle.IDS[i];
            final boolean locked = !plus && !id.equals("emerald");
            Button bt = new Button(this);
            bt.setAllCaps(false);
            bt.setText(WidgetStyle.NAMES[i] + (locked ? "  🔒" : "") + (id.equals(cur) ? "  ✓" : ""));
            bt.setTextColor(Color.WHITE);
            bt.setTextSize(14);
            bt.setBackground(getDrawable(WidgetStyle.resOf(id)));
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
