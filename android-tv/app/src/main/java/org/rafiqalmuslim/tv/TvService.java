package org.rafiqalmuslim.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * خدمة تعمل في الخلفية على التلفاز:
 * - حين يبدأ التلفاز شاشة التوقف الخاصة به (عدم الاستخدام) تُفتح «شاشة رفيق المسلم» مكانها.
 * - عند دخول وقت الصلاة تُفتح الشاشة (فيُرفع الأذان فيها) حتى لو كان التلفاز على تطبيق آخر؛
 *   وإن تعذر فتحها يُرفع الأذان من الخدمة نفسها.
 * فتح الشاشة من الخلفية يحتاج إذن «الظهور فوق التطبيقات الأخرى» على Android 10 وما بعده.
 */
public class TvService extends Service {
    static final String KEY_SCHEDULE = "schedule";
    static final String KEY_IDLE = "idle_takeover";
    private static final String CHANNEL = "tv_background";
    private static final long TICK_MS = 15_000;
    private static final long WINDOW_MS = 120_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private BroadcastReceiver dreamRx;
    private MediaPlayer player;

    static void start(Context ctx) {
        Intent i = new Intent(ctx, TvService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i); else ctx.startService(i);
        } catch (Exception ignored) {
            // بعض الأنظمة تمنع بدء الخدمة في لحظات معينة؛ تُبدأ عند فتح التطبيق
        }
    }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(TvWeb.PREFS, Context.MODE_PRIVATE); }

    static boolean canOpenFromBackground(Context c) {
        return Build.VERSION.SDK_INT < 29 || Settings.canDrawOverlays(c);
    }

    /** يفتح الشاشة فوق أي تطبيق؛ يعيد false إن لم يكن ذلك مسموحًا */
    static boolean openScreen(Context c) {
        if (MainActivity.visible) return true;
        if (!canOpenFromBackground(c)) return false;
        try {
            c.startActivity(new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startAsForeground();
        dreamRx = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                if (Intent.ACTION_DREAMING_STARTED.equals(intent.getAction()) && prefs(ctx).getBoolean(KEY_IDLE, true)) openScreen(ctx);
            }
        };
        IntentFilter f = new IntentFilter(Intent.ACTION_DREAMING_STARTED);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(dreamRx, f, Context.RECEIVER_EXPORTED); else registerReceiver(dreamRx, f);
        handler.post(tick);
    }

    private void startAsForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, getString(R.string.app_name), NotificationManager.IMPORTANCE_MIN));
            b = new Notification.Builder(this, CHANNEL);
        } else {
            b = new Notification.Builder(this);
        }
        Notification n = b.setSmallIcon(R.drawable.icon).setContentTitle(getString(R.string.app_name)).setContentText("مواقيت الصلاة والأذان").build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
    }

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            try { checkPrayer(); } catch (Exception ignored) { /* جدول غير صالح */ }
            handler.postDelayed(this, TICK_MS);
        }
    };

    /** الجدول تحفظه الواجهة: {"adhan":true,"url":"…","times":[ms,…]} */
    private void checkPrayer() throws Exception {
        String raw = prefs(this).getString(KEY_SCHEDULE, null);
        if (raw == null) return;
        JSONObject o = new JSONObject(raw);
        JSONArray times = o.getJSONArray("times");
        long now = System.currentTimeMillis();
        long fired = prefs(this).getLong("fired", 0);
        for (int i = 0; i < times.length(); i++) {
            long at = times.getLong(i);
            if (now >= at && now < at + WINDOW_MS && at != fired) {
                prefs(this).edit().putLong("fired", at).apply();
                // الشاشة مفتوحة: الأذان يُرفع فيها
                if (MainActivity.visible) return;
                if (openScreen(this)) return;
                if (o.optBoolean("adhan", true)) playAdhan(o.optString("url", null));
                return;
            }
        }
    }

    private void playAdhan(String url) {
        if (url == null || url.isEmpty()) return;
        try {
            if (player != null) player.release();
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            player.setDataSource(url);
            player.setOnPreparedListener(MediaPlayer::start);
            player.setOnCompletionListener(mp -> { mp.release(); player = null; });
            player.prepareAsync();
        } catch (Exception ignored) {
            // لا اتصال
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(tick);
        if (dreamRx != null) unregisterReceiver(dreamRx);
        if (player != null) player.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
