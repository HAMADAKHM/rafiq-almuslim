package org.rafiqalmuslim.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import org.json.JSONObject;

/**
 * يشغّل المنبه الذي حان وقته: خدمة أمامية تعزف (النغمة المختارة ثم الذكر) بتكرار وبصوت يرتفع تدريجيًا
 * على قناة المنبهات، مع اهتزاز، وإشعار بأولوية عالية يفتح شاشة المنبه فوق شاشة القفل، فيه «إيقاف» و«غفوة».
 * يتوقف تلقائيًا بعد ٥ دقائق إن لم يُلمس.
 */
public class AlarmService extends Service {
    static final String CHANNEL = "rafiq-wake-alarm-v1";
    static final int NOTIF_ID = 7401;
    static final String ACTION_STOP = "org.rafiqalmuslim.app.ALARM_STOP";
    static final String ACTION_SNOOZE = "org.rafiqalmuslim.app.ALARM_SNOOZE";
    static final String EXTRA_JSON = "alarm_json";
    static final long AUTO_STOP_MS = 5 * 60_000L;

    /** المنبه الذي يرنّ الآن (لشاشة المنبه) */
    static volatile JSONObject current;

    private final Handler h = new Handler(Looper.getMainLooper());
    private MediaPlayer mp;
    private Vibrator vib;
    private PowerManager.WakeLock wl;
    private JSONObject alarm;
    private int cycle;
    private boolean stopped;

    static void start(Context c, JSONObject o) {
        Intent i = new Intent(c, AlarmService.class).putExtra(EXTRA_JSON, o.toString());
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
        } catch (Exception e) {
            // النظام منع تشغيل خدمة من الخلفية (منبه غير دقيق): إشعار يفتح شاشة المنبه، وهي تشغّل الصوت
            current = o;
            postNotification(c, o, false);
        }
    }

    static void stop(Context c) {
        c.stopService(new Intent(c, AlarmService.class));
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID);
        current = null;
    }

    static String label(JSONObject o) {
        String v = o == null ? "asbahna" : o.optString("voice", "asbahna");
        if ("salawat".equals(v)) return "اللهم صلِّ وسلم على نبينا محمد";
        if ("tone".equals(v)) return "منبّه الصحوة";
        return "أصبحنا وأصبح الملك لله";
    }

    private static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        // الصوت تعزفه الخدمة نفسها على قناة المنبهات؛ الإشعار صامت
        NotificationChannel ch = new NotificationChannel(CHANNEL, "منبّه الصحوة", NotificationManager.IMPORTANCE_HIGH);
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setBypassDnd(true);
        nm.createNotificationChannel(ch);
    }

    static Notification build(Context c, JSONObject o) {
        ensureChannel(c);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        Intent full = new Intent(c, AlarmActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullPi = PendingIntent.getActivity(c, 7402, full, flags);
        PendingIntent stopPi = PendingIntent.getBroadcast(c, 7403, new Intent(c, AlarmActions.class).setAction(ACTION_STOP), flags);
        PendingIntent snoozePi = PendingIntent.getBroadcast(c, 7404, new Intent(c, AlarmActions.class).setAction(ACTION_SNOOZE), flags);
        int snooze = o == null ? 10 : Math.max(1, o.optInt("snooze", 10));
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_stat_rafiq)
            .setContentTitle("منبّه الصحوة")
            .setContentText(label(o))
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullPi)
            .setFullScreenIntent(fullPi, true)
            .addAction(new Notification.Action.Builder(null, "إيقاف", stopPi).build())
            .addAction(new Notification.Action.Builder(null, "غفوة " + snooze + " د", snoozePi).build());
        if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_MAX);
        return b.build();
    }

    static void postNotification(Context c, JSONObject o, boolean ignored) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { nm.notify(NOTIF_ID, build(c, o)); } catch (Exception e) { /* إذن الإشعارات مرفوض */ }
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        JSONObject o = null;
        try { if (intent != null && intent.hasExtra(EXTRA_JSON)) o = new JSONObject(intent.getStringExtra(EXTRA_JSON)); } catch (Exception ignored) {}
        if (o == null) o = current;
        if (o == null) o = new JSONObject();
        alarm = o;
        current = o;
        Notification n = build(this, o);
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(NOTIF_ID, n);
        } catch (Exception e) {
            postNotification(this, o, false);
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null && wl == null) {
            wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "rafiq:alarm");
            wl.acquire(AUTO_STOP_MS + 30_000L);
        }
        // فتح شاشة المنبه مباشرة إن سمح النظام (وإلا يظهر الإشعار بملء الشاشة أو منبثقًا)
        try {
            startActivity(new Intent(this, AlarmActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION));
        } catch (Exception ignored) {}
        stopped = false;
        cycle = 0;
        releasePlayer();
        h.removeCallbacksAndMessages(null);
        if (o.optBoolean("vibrate", true)) startVibration();
        playCycle();
        h.postDelayed(this::stopSelf, AUTO_STOP_MS);
        return START_NOT_STICKY;
    }

    private int raw(String name) {
        if (name == null || name.isEmpty()) return 0;
        return getResources().getIdentifier(name, "raw", getPackageName());
    }

    private int voiceRes() {
        String v = alarm.optString("voice", "asbahna");
        if ("tone".equals(v)) return 0;
        if ("salawat".equals(v)) return raw("hisn_98");
        int r = raw("hisn_m77s");
        return r != 0 ? r : raw("hisn_77");
    }

    private int toneRes() {
        String t = alarm.optString("tone", "rafiq_chime");
        if ("none".equals(t)) return 0;
        int r = raw(t);
        return r != 0 ? r : raw("rafiq_chime");
    }

    /** دورة: النغمة ثم الذكر، ثم فاصل قصير، والصوت يرتفع تدريجيًا */
    private void playCycle() {
        if (stopped) return;
        float vol = Math.min(1f, 0.35f + cycle * 0.2f);
        cycle++;
        int tone = toneRes(), voice = voiceRes();
        if (tone == 0 && voice == 0) tone = raw("rafiq_chime");
        final int second = voice;
        if (tone != 0) play(tone, vol, () -> {
            if (second != 0) play(second, vol, this::gap); else gap();
        });
        else play(second, vol, this::gap);
    }

    private void gap() {
        if (!stopped) h.postDelayed(this::playCycle, 1800);
    }

    private void play(int res, float vol, Runnable done) {
        releasePlayer();
        try {
            MediaPlayer p = new MediaPlayer();
            p.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            p.setDataSource(this, Uri.parse("android.resource://" + getPackageName() + "/" + res));
            p.setVolume(vol, vol);
            p.setOnCompletionListener(x -> { if (!stopped) done.run(); });
            p.setOnErrorListener((x, w, e) -> { h.postDelayed(() -> { if (!stopped) done.run(); }, 1000); return true; });
            p.prepare();
            p.start();
            mp = p;
        } catch (Exception e) {
            h.postDelayed(() -> { if (!stopped) done.run(); }, 1500);
        }
    }

    private void startVibration() {
        vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vib == null || !vib.hasVibrator()) return;
        long[] pattern = { 0, 700, 900 };
        try {
            if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createWaveform(pattern, 0),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
            else vib.vibrate(pattern, 0);
        } catch (Exception ignored) {}
    }

    private void releasePlayer() {
        if (mp != null) { try { mp.stop(); } catch (Exception ignored) {} try { mp.release(); } catch (Exception ignored) {} mp = null; }
    }

    @Override
    public void onDestroy() {
        stopped = true;
        h.removeCallbacksAndMessages(null);
        releasePlayer();
        if (vib != null) try { vib.cancel(); } catch (Exception ignored) {}
        if (wl != null && wl.isHeld()) try { wl.release(); } catch (Exception ignored) {}
        current = null;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID);
        // إغلاق شاشة المنبه إن كانت مفتوحة
        sendBroadcast(new Intent(AlarmActivity.ACTION_CLOSE).setPackage(getPackageName()));
        super.onDestroy();
    }
}
