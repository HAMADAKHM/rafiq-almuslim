package org.rafiqalmuslim.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.widget.FrameLayout;
import android.widget.TextView;

/**
 * شريط الأذان فوق يوتيوب أو أي تطبيق آخر، بلا أي إذن: نافذة شفافة لا تغطي إلا شريطًا أعلى الشاشة،
 * تأخذ ضغطات جهاز التحكم أثناء الأذان، فأي زر يوقفه ويعود التطبيق السابق كما كان.
 */
public class AdhanActivity extends Activity {
    private static AdhanActivity current;

    static void show(Context c, String prayer) {
        try {
            c.startActivity(new Intent(c, AdhanActivity.class).putExtra("prayer", prayer)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS));
        } catch (Exception ignored) { /* النظام منع الفتح من الخلفية */ }
    }

    /** يُغلق الشريط عند انتهاء الأذان أو إيقافه */
    static void close() {
        AdhanActivity a = current;
        if (a != null) a.runOnUiThread(a::finish);
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (!TvService.adhanActive) { finish(); return; }
        current = this;
        String prayer = getIntent().getStringExtra("prayer");
        FrameLayout root = new FrameLayout(this);
        TextView tv = new TextView(this);
        tv.setText((prayer == null || prayer.isEmpty() ? "حان الآن وقت الصلاة" : "حان الآن وقت صلاة " + prayer) + "  —  اضغط أي زر لإيقاف الأذان");
        tv.setTextColor(Color.parseColor("#F5E7BF"));
        tv.setBackgroundColor(Color.parseColor("#E6073B32"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        tv.setGravity(Gravity.CENTER);
        int pad = (int) (getResources().getDisplayMetrics().density * 14);
        tv.setPadding(pad, pad, pad, pad);
        root.addView(tv, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP));
        setContentView(root);
    }

    private void stop() {
        TvService.requestStopAdhan(this);
        finish();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        // أي زر (حتى الرجوع والصوت) يوقف الأذان
        if (e.getAction() == KeyEvent.ACTION_UP) stop();
        return true;
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent e) {
        if (e.getAction() == MotionEvent.ACTION_UP) stop();
        return true;
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        super.onDestroy();
    }
}
