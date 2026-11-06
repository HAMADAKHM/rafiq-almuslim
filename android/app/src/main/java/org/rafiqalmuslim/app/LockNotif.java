package org.rafiqalmuslim.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * «المواقيت على شاشة القفل» (رفيق بلس): إشعار ثابت هادئ يظهر على شاشة القفل وفي الشريط العلوي،
 * فيه الصلاة القادمة ووقتها وعدّ تنازلي حي، ويتحدث تلقائيًا عند دخول كل صلاة. بلا صوت ولا اهتزاز.
 * (Android لا يسمح بودجتات التطبيقات على شاشة قفل الجوال، إلا في أجهزة قليلة تدعم فئة keyguard.)
 */
final class LockNotif {
    static final String KEY = "lock_on";
    static final String CHANNEL = "rafiq-lockscreen-v1";
    static final int ID = 7301;
    private LockNotif() {}

    static boolean enabled(Context c) {
        return c.getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).getBoolean(KEY, false) && WidgetStyle.plus(c);
    }

    static void set(Context c, boolean on) {
        c.getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY, on).apply();
        update(c);
    }

    static void update(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (!enabled(c)) { nm.cancel(ID); return; }
        try {
            JSONObject data = PrayerWidgetProvider.load(c);
            JSONArray days = data == null ? null : data.getJSONArray("days");
            int[] next = days == null ? null : PrayerWidgetProvider.findNext(days, System.currentTimeMillis());
            if (next == null) { nm.cancel(ID); return; }
            JSONObject day = days.getJSONObject(next[0]);
            JSONArray prayers = day.getJSONArray("prayers");
            JSONObject np = prayers.getJSONObject(next[1]);
            StringBuilder all = new StringBuilder();
            for (int i = 0; i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                if (all.length() > 0) all.append("  •  ");
                all.append(p.getString("label")).append(' ').append(p.getString("time"));
            }
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "المواقيت على شاشة القفل", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("الصلاة القادمة وعدّ تنازلي على شاشة القفل (بلا صوت)");
                ch.setSound(null, null);
                ch.enableVibration(false);
                ch.setShowBadge(false);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(ch);
            }
            Intent open = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 7301, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
            b.setSmallIcon(R.drawable.ic_stat_rafiq)
                .setContentTitle("الصلاة القادمة: " + np.getString("label") + " " + np.getString("time"))
                .setContentText(data.optString("city", "") + (day.optString("hijri", "").isEmpty() ? "" : " — " + day.optString("hijri", "")))
                .setStyle(new Notification.BigTextStyle().bigText(all.toString()))
                .setOngoing(true)
                .setShowWhen(true)
                .setWhen(np.getLong("at"))
                .setUsesChronometer(true)
                .setOnlyAlertOnce(true)
                .setColor(0xFFC9A85C)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(pi);
            if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
            if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_LOW);
            nm.notify(ID, b.build());
            // تحديث عند دخول الصلاة القادمة (يعمل حتى دون ودجتات)
            Intent tick = new Intent(c, PrayerWidgetProvider.class).setAction(PrayerWidgetProvider.ACTION_TICK);
            PendingIntent tp = PendingIntent.getBroadcast(c, 1, tick, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.setWindow(AlarmManager.RTC, np.getLong("at") + 1000, 60_000, tp);
        } catch (Exception e) {
            nm.cancel(ID);
        }
    }
}
