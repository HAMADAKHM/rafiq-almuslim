package org.rafiqalmuslim.tv;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * منبهات النظام: تبقى تعمل ولو أغلق نظام التلفاز التطبيق لقلة الذاكرة.
 * - منبه دقيق عند دخول كل صلاة: يعيد تشغيل الخدمة فيُرفع الأذان (ولو كان التلفاز على يوتيوب).
 * - منبه حارس كل بضع دقائق: يعيد الخدمة إن أُغلقت، وإن وصل متأخرًا فالتلفاز كان في الاستعداد
 *   واستيقظ الآن → تُفتح شاشة المواقيت (إن كان «فتح المواقيت عند تشغيل التلفاز» مفعّلًا).
 */
public class Alarms extends BroadcastReceiver {
    private static final String ACTION_PRAYER = "org.rafiqalmuslim.tv.PRAYER";
    private static final String ACTION_WATCH = "org.rafiqalmuslim.tv.WATCH";
    private static final long WATCH_MS = 5 * 60_000L;
    private static final long LATE_MS = 90_000L;

    /** يُستدعى بعد كل تغيير للجدول، وعند تشغيل التلفاز، وعند بدء الخدمة */
    static void schedule(Context c) {
        scheduleNextPrayer(c);
        scheduleWatch(c);
    }

    private static PendingIntent pi(Context c, String action, int code, long at) {
        Intent i = new Intent(c, Alarms.class).setAction(action).putExtra("at", at);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(c, code, i, flags);
    }

    private static void scheduleNextPrayer(Context c) {
        try {
            String raw = TvService.prefs(c).getString(TvService.KEY_SCHEDULE, null);
            if (raw == null) return;
            JSONArray times = new JSONObject(raw).getJSONArray("times");
            long now = System.currentTimeMillis();
            long next = 0;
            for (int i = 0; i < times.length(); i++) {
                long t = times.getLong(i);
                if (t > now && (next == 0 || t < next)) next = t;
            }
            if (next == 0) return;
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            PendingIntent p = pi(c, ACTION_PRAYER, 1, next);
            long at = next + 1000;
            // RTC (لا يوقظ الجهاز): التلفاز المطفأ (الاستعداد) لا يرفع الأذان، ولا يُرفع متأخرًا بعد فتحه
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC, at, p);
            else if (Build.VERSION.SDK_INT >= 23) am.setExactAndAllowWhileIdle(AlarmManager.RTC, at, p);
            else am.setExact(AlarmManager.RTC, at, p);
        } catch (Exception ignored) { /* جدول غير صالح */ }
    }

    private static void scheduleWatch(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            long at = System.currentTimeMillis() + WATCH_MS;
            // RTC (لا يوقظ الجهاز): في الاستعداد يتأخر حتى يستيقظ التلفاز، وهذا ما نكتشف به الاستيقاظ
            PendingIntent p = pi(c, ACTION_WATCH, 2, at);
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.set(AlarmManager.RTC, at, p);
            else am.setExact(AlarmManager.RTC, at, p);
        } catch (Exception ignored) { /* لا شيء */ }
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        Context c = ctx.getApplicationContext();
        if (ACTION_PRAYER.equals(a)) {
            TvService.log(c, "prayer_alarm");
            TvService.start(c); // الخدمة تتحقق من الوقت فور بدئها وترفع الأذان
            scheduleNextPrayer(c);
        } else if (ACTION_WATCH.equals(a)) {
            long late = System.currentTimeMillis() - intent.getLongExtra("at", System.currentTimeMillis());
            if (!TvService.running) TvService.log(c, "service_restart");
            TvService.start(c);
            scheduleWatch(c);
            scheduleNextPrayer(c);
            if (late > LATE_MS && interactive(c)) {
                // كان التلفاز في الاستعداد وفُتح الآن
                TvService.log(c, "wake_detected");
                TvService.lastActiveAt = System.currentTimeMillis();
                if (TvWeb.autostart(c)) TvService.openScreen(c);
            }
        }
    }

    private static boolean interactive(Context c) {
        try {
            PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
            return Build.VERSION.SDK_INT >= 20 ? pm.isInteractive() : pm.isScreenOn();
        } catch (Exception e) { return true; }
    }
}
