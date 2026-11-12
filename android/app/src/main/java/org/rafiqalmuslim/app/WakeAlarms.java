package org.rafiqalmuslim.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * منبّه الصحوة: منبهات يحددها المستخدم في التطبيق (الوقت والأيام والصوت)، تُجدول بمنبه النظام الدقيق
 * (setAlarmClock، يظهر رمزه في شريط الحالة ويعمل والجوال في وضع السكون)، ويرنّ حتى يوقفه المستخدم أو يؤجله.
 * الصوت: «أصبحنا وأصبح الملك لله» أو «اللهم صلِّ وسلم على نبينا محمد» بتسجيل حصن المسلم، مع نغمة قبله إن اختيرت.
 * يُعاد الجدول بعد إعادة تشغيل الجوال أو تحديث التطبيق.
 */
public class WakeAlarms extends BroadcastReceiver {
    static final String PREFS = "rafiq_alarms";
    static final String KEY = "list";
    static final String ACTION_FIRE = "org.rafiqalmuslim.app.ALARM_FIRE";
    static final String EXTRA_ID = "alarm_id";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static JSONArray list(Context c) {
        try { return new JSONArray(prefs(c).getString(KEY, "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    static JSONObject find(Context c, int id) {
        JSONArray a = list(c);
        for (int i = 0; i < a.length(); i++) { JSONObject o = a.optJSONObject(i); if (o != null && o.optInt("id") == id) return o; }
        return null;
    }

    static void save(Context c, String json) {
        prefs(c).edit().putString(KEY, json).apply();
        scheduleAll(c);
    }

    /** يسمح النظام بالمنبه الدقيق؟ (Android 12+ قد يتطلب إذن «المنبهات والتذكيرات») */
    static boolean canExact(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    /** الموعد التالي للمنبه بعد الآن (أيام الأسبوع 0=الأحد … 6=السبت) أو -1 */
    static long nextAt(JSONObject a, long now) {
        int h = a.optInt("h", 6), m = a.optInt("m", 0);
        JSONArray days = a.optJSONArray("days");
        boolean[] allowed = new boolean[7];
        boolean any = false;
        for (int i = 0; days != null && i < days.length(); i++) { int d = days.optInt(i, -1); if (d >= 0 && d < 7) { allowed[d] = true; any = true; } }
        if (!any) for (int d = 0; d < 7; d++) allowed[d] = true;
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
        cal.set(Calendar.HOUR_OF_DAY, h); cal.set(Calendar.MINUTE, m);
        for (int k = 0; k < 8; k++) {
            if (cal.getTimeInMillis() > now + 1000 && allowed[cal.get(Calendar.DAY_OF_WEEK) - 1]) return cal.getTimeInMillis();
            cal.add(Calendar.DAY_OF_MONTH, 1);
            cal.set(Calendar.HOUR_OF_DAY, h); cal.set(Calendar.MINUTE, m);
        }
        return -1;
    }

    private static PendingIntent fireIntent(Context c, int id, boolean snooze) {
        Intent i = new Intent(c, WakeAlarms.class).setAction(ACTION_FIRE).putExtra(EXTRA_ID, id);
        return PendingIntent.getBroadcast(c, 7000 + id + (snooze ? 500 : 0), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void setAt(Context c, long at, PendingIntent pi) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent open = new Intent(c, MainActivity.class).putExtra(MainActivity.EXTRA_ROUTE, "/alarm").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent show = PendingIntent.getActivity(c, 6999, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            if (canExact(c)) am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    /** يجدول الموعد التالي لكل منبه مفعّل، ويلغي المتوقفة */
    static void scheduleAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        JSONArray a = list(c);
        long now = System.currentTimeMillis();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            int id = o.optInt("id");
            PendingIntent pi = fireIntent(c, id, false);
            if (am != null) am.cancel(pi);
            if (!o.optBoolean("on", true)) continue;
            long at = nextAt(o, now);
            if (at > 0) setAt(c, at, pi);
        }
    }

    /** غفوة: يرنّ المنبه نفسه بعد دقائق */
    static void snooze(Context c, int id, int minutes) {
        setAt(c, System.currentTimeMillis() + Math.max(1, minutes) * 60_000L, fireIntent(c, id, true));
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String a = intent.getAction();
        if (ACTION_FIRE.equals(a)) {
            int id = intent.getIntExtra(EXTRA_ID, -1);
            JSONObject o = find(c, id);
            if (o != null) AlarmService.start(c, o);
            scheduleAll(c);
            return;
        }
        // بعد إعادة تشغيل الجوال أو تحديث التطبيق أو تغيير الوقت
        scheduleAll(c);
        // بعد تحديث التطبيق: إعادة رسم كل الودجتات الموضوعة بالتصاميم الجديدة فورًا (لا تبقى بصورتها القديمة)
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(a) || Intent.ACTION_BOOT_COMPLETED.equals(a)) refreshWidgets(c);
    }

    static void refreshWidgets(Context c) {
        Class<?>[] providers = { PrayerWidgetProvider.class, PrayerCardWidgetProvider.class, DailyWidgetProvider.class, TasbihWidgetProvider.class,
            AdhkarWidgetProvider.class, DuaWidgetProvider.class, AllInOneWidgetProvider.class, GreetWidgetProvider.class, DailyAdhkarWidgetProvider.class,
            NightPrayerSmall.class, NightPrayerMedium.class, NightPrayerLarge.class };
        android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(c);
        for (Class<?> p : providers) {
            try {
                int[] ids = m.getAppWidgetIds(new android.content.ComponentName(c, p));
                if (ids == null || ids.length == 0) continue;
                c.sendBroadcast(new Intent(c, p).setAction(android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, ids));
            } catch (Exception ignored) {}
        }
    }
}
