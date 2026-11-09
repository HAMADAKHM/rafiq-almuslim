package org.rafiqalmuslim.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/** شاشة المنبه فوق شاشة القفل: الوقت والذكر، و«إيقاف» و«غفوة» */
public class AlarmActivity extends Activity {
    static final String ACTION_CLOSE = "org.rafiqalmuslim.app.ALARM_CLOSE";

    private final BroadcastReceiver closer = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { finish(); }
    };

    private float dp(float v) { return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()); }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        JSONObject o = AlarmService.current;
        // فُتحت الشاشة من الإشعار والخدمة لم تعمل (منعها النظام في الخلفية): التشغيل الآن من الواجهة مسموح
        if (o != null && !isServiceRunning()) AlarmService.start(this, o);
        if (o == null) { finish(); return; }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding((int) dp(28), (int) dp(40), (int) dp(28), (int) dp(40));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[] { 0xFF0E2A2A, 0xFF07393A, 0xFF0B1F1F });
        root.setBackground(bg);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        TextView time = new TextView(this);
        time.setText(new SimpleDateFormat("h:mm", new Locale("ar")).format(new Date()));
        time.setTextColor(Color.WHITE);
        time.setTextSize(TypedValue.COMPLEX_UNIT_SP, 72);
        time.setTypeface(Typeface.DEFAULT_BOLD);
        time.setGravity(Gravity.CENTER);
        root.addView(time);

        TextView title = new TextView(this);
        title.setText("منبّه الصحوة");
        title.setTextColor(0xFFD9B66A);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, (int) dp(6), 0, (int) dp(18));
        root.addView(title);

        TextView text = new TextView(this);
        text.setText(AlarmService.label(o));
        text.setTextColor(0xFFF3EBD6);
        text.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        text.setGravity(Gravity.CENTER);
        text.setLineSpacing(0, 1.3f);
        text.setPadding(0, 0, 0, (int) dp(48));
        root.addView(text);

        int snooze = Math.max(1, o.optInt("snooze", 10));
        root.addView(button("إيقاف", 0xFFD9B66A, 0xFF10302F, v -> { AlarmActions.handle(this, AlarmService.ACTION_STOP); finish(); }));
        View sp = new View(this);
        root.addView(sp, new LinearLayout.LayoutParams(1, (int) dp(14)));
        root.addView(button("غفوة " + snooze + " دقائق", 0x33FFFFFF, Color.WHITE, v -> { AlarmActions.handle(this, AlarmService.ACTION_SNOOZE); finish(); }));

        setContentView(root);
        IntentFilter f = new IntentFilter(ACTION_CLOSE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(closer, f, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(closer, f);
    }

    private boolean isServiceRunning() {
        // الخدمة تضع current عند بدئها وتمسحه عند توقفها؛ وجود الإشعار الأمامي يكفي هنا تقريبًا
        android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || Build.VERSION.SDK_INT < 23) return true;
        for (android.service.notification.StatusBarNotification s : nm.getActiveNotifications()) {
            if (s.getId() == AlarmService.NOTIF_ID && (s.getNotification().flags & android.app.Notification.FLAG_FOREGROUND_SERVICE) != 0) return true;
        }
        return false;
    }

    private Button button(String label, int bg, int fg, View.OnClickListener l) {
        Button btn = new Button(this);
        btn.setText(label);
        btn.setAllCaps(false);
        btn.setTextColor(fg);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        GradientDrawable d = new GradientDrawable();
        d.setColor(bg);
        d.setCornerRadius(dp(30));
        btn.setBackground(d);
        btn.setOnClickListener(l);
        btn.setLayoutParams(new LinearLayout.LayoutParams((int) dp(260), (int) dp(60)));
        return btn;
    }

    @Override
    public void onBackPressed() { /* لا يُغلق المنبه بزر الرجوع: «إيقاف» أو «غفوة» */ }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(closer); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
