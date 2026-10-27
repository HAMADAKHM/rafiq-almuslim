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
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;
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
 * - عند دخول وقت الصلاة والتلفاز على تطبيق آخر (يوتيوب…) لا تُفتح الشاشة: يُرفع الأذان فقط،
 *   ويتوقف صوت التطبيق الآخر مؤقتًا، وأي زر في جهاز التحكم يوقف الأذان.
 * فتح الشاشة من الخلفية يحتاج إذن «الظهور فوق التطبيقات الأخرى» على Android 10 وما بعده.
 */
public class TvService extends Service {
    static final String KEY_SCHEDULE = "schedule";
    static final String KEY_IDLE = "idle_takeover";
    static final String KEY_IDLE_MIN = "idle_minutes";
    static final String KEY_EVENTS = "events";
    /** بلا «إمكانية الوصول»: عدم الاستخدام = مرور المدة منذ ترك الشاشة دون أي صوت أو فيديو يعمل */
    static final String KEY_IDLE_QUIET = "idle_quiet";
    /** آخر نشاط معروف: ترك شاشة المواقيت، أو صوت/فيديو يعمل، أو استيقاظ الشاشة */
    static volatile long lastActiveAt = System.currentTimeMillis();
    /** وقت آخر فتح تلقائي بسبب عدم الاستخدام (للرجوع بزر Back، ولمعرفة أن المستخدم رفضه) */
    static volatile long autoOpenAt = 0;
    static final long AUTO_GRACE_MS = 3 * 60_000L;
    /** خرج المستخدم من الشاشة فور فتحها تلقائيًا (يلعب أو يشاهد من جهاز HDMI): لا تُفتح ثانية حتى هذا الوقت */
    static final String KEY_SNOOZE = "idle_snooze_until";
    private static final long SNOOZE_MS = 60 * 60_000L;
    /** آخر نشاط محفوظ (حتى لا يبدأ العدّ من الصفر إذا أغلق النظام العملية وأعادها) */
    static final String KEY_LAST_ACTIVE = "last_active_at";
    private static long savedActiveAt = 0;
    /** آخر سبب لعدم الفتح (يُسجَّل عند تغيّره فقط) */
    static volatile String lastIdleReason = null;

    /** نشاط معروف (صوت يعمل، ترك الشاشة، استيقاظ التلفاز): يعيد عدّ عدم الاستخدام ويحفظه */
    static void markActive(Context c, String why) {
        long now = System.currentTimeMillis();
        lastActiveAt = now;
        if (now - savedActiveAt > 60_000L) {
            savedActiveAt = now;
            prefs(c).edit().putLong(KEY_LAST_ACTIVE, now).apply();
        }
        if (why != null) log(c, "active_" + why);
    }

    /** المستخدم ترك الشاشة بعد فتحها تلقائيًا بقليل: إيقاف الفتح التلقائي مؤقتًا */
    static void onScreenLeft(Context c) {
        long now = System.currentTimeMillis();
        if (autoOpenAt > 0 && now - autoOpenAt < AUTO_GRACE_MS) {
            prefs(c).edit().putLong(KEY_SNOOZE, now + SNOOZE_MS).apply();
            log(c, "idle_snoozed_60min");
        }
        autoOpenAt = 0;
    }

    static void clearSnooze(Context c) { prefs(c).edit().remove(KEY_SNOOZE).apply(); }

    /** جهاز موصول بمنفذ HDMI يعمل الآن (بلايستيشن، رسيفر…) حسب نظام مداخل التلفاز */
    static boolean externalInputActive(Context c) {
        if (Build.VERSION.SDK_INT < 24) return false;
        try {
            android.media.tv.TvInputManager tim = (android.media.tv.TvInputManager) c.getSystemService(Context.TV_INPUT_SERVICE);
            if (tim == null) return false;
            for (android.media.tv.TvInputInfo info : tim.getTvInputList()) {
                if (info.getType() == android.media.tv.TvInputInfo.TYPE_HDMI && tim.getInputState(info.getId()) == android.media.tv.TvInputManager.INPUT_STATE_CONNECTED) return true;
            }
        } catch (Exception ignored) { /* التلفاز لا يدعم نظام المداخل */ }
        return false;
    }
    /** الأذان يُرفع الآن من الخلفية (تستخدمه خدمة الإتاحة لإيقافه بأي زر) */
    static volatile boolean adhanActive = false;
    static volatile boolean running = false;
    private static TvService instance;
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
        return Build.VERSION.SDK_INT < 29 || Settings.canDrawOverlays(c) || IdleWatcher.connected;
    }

    /** سجل مختصر لآخر الأحداث (للتشخيص في الإعدادات) */
    static void log(Context c, String event) {
        try {
            SharedPreferences p = prefs(c);
            JSONObject o = new JSONObject(p.getString(KEY_EVENTS, "{}"));
            o.put(event, System.currentTimeMillis());
            p.edit().putString(KEY_EVENTS, o.toString()).apply();
        } catch (Exception ignored) { /* لا شيء */ }
    }

    static void requestStopAdhan(Context c) {
        TvService s = instance;
        if (s != null) s.handler.post(s::stopAdhan);
    }

    /** يفتح الشاشة فوق أي تطبيق؛ يعيد false إن لم يكن ذلك مسموحًا */
    static boolean openScreen(Context c) {
        if (MainActivity.visible) return true;
        if (!canOpenFromBackground(c)) { log(c, "open_blocked"); return false; }
        log(c, "open_screen");
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
        instance = this;
        running = true;
        startAsForeground();
        log(this, "service_start");
        // بعد إعادة النظام تشغيل العملية: نكمل العدّ من آخر نشاط محفوظ بدل البدء من الصفر
        long saved = prefs(this).getLong(KEY_LAST_ACTIVE, 0);
        if (saved > 0 && saved < System.currentTimeMillis()) { lastActiveAt = saved; savedActiveAt = saved; }
        dreamRx = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                String a = intent.getAction();
                if (Intent.ACTION_DREAMING_STARTED.equals(a)) {
                    log(ctx, "dream");
                    if (prefs(ctx).getBoolean(KEY_IDLE, true)) wakeAndOpen(ctx);
                } else if (Intent.ACTION_SCREEN_ON.equals(a) || Intent.ACTION_USER_PRESENT.equals(a)) {
                    // التلفاز يستيقظ من وضع الاستعداد (أغلب التلفزيونات لا تُعيد التشغيل كاملًا عند فتحها)
                    log(ctx, "screen_on");
                    clearSnooze(ctx);
                    IdleWatcher.lastKeyAt = System.currentTimeMillis();
                    markActive(ctx, "screen_on");
                    if (TvWeb.autostart(ctx)) handler.postDelayed(() -> openScreen(ctx), 2500);
                }
            }
        };
        IntentFilter f = new IntentFilter(Intent.ACTION_DREAMING_STARTED);
        f.addAction(Intent.ACTION_SCREEN_ON);
        f.addAction(Intent.ACTION_USER_PRESENT);
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
            try { checkIdle(); } catch (Exception ignored) { /* لا شيء */ }
            handler.postDelayed(this, TICK_MS);
        }
    };

    /** الجدول تحفظه الواجهة: {"adhan":true,"url":"…","times":[ms,…],"names":["الفجر",…]} */
    private void checkPrayer() throws Exception {
        String raw = prefs(this).getString(KEY_SCHEDULE, null);
        if (raw == null) return;
        JSONObject o = new JSONObject(raw);
        JSONArray times = o.getJSONArray("times");
        JSONArray names = o.optJSONArray("names");
        long now = System.currentTimeMillis();
        long fired = prefs(this).getLong("fired", 0);
        for (int i = 0; i < times.length(); i++) {
            long at = times.getLong(i);
            if (now >= at && now < at + WINDOW_MS && at != fired) {
                prefs(this).edit().putLong("fired", at).apply();
                // الشاشة مفتوحة: الأذان يُرفع فيها
                if (MainActivity.visible) return;
                // على يوتيوب أو أي تطبيق آخر: لا تُفتح الشاشة، يُرفع الأذان فقط ويُوقف بأي زر
                if (o.optBoolean("adhan", true)) playAdhan(o.optString("url", null), names != null ? names.optString(i, "") : "");
                return;
            }
        }
    }

    /**
     * عدم الاستخدام → تُفتح شاشة المواقيت. لا يقاطع أبدًا صوتًا أو فيديو يعمل.
     * القرار في IdleRules (مختبر)، وكل سبب لعدم الفتح يُسجَّل عند تغيّره في سجل التشخيص.
     */
    private void checkIdle() {
        long now = System.currentTimeMillis();
        AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
        IdleRules.Input in = new IdleRules.Input();
        in.now = now;
        in.mediaActive = am != null && am.isMusicActive();
        if (in.mediaActive) markActive(this, null);
        // جهاز HDMI (بلايستيشن…) يُعدّ نشاطًا فقط إذا كان مدخله هو الظاهر الآن (يُعرف مع خدمة الإتاحة).
        // سابقًا كان أي جهاز موصول — ولو مطفأ أو على مدخل آخر — يمنع الفتح دائمًا.
        in.externalForeground = IdleWatcher.connected && IdleRules.isTvInputPackage(IdleWatcher.foregroundPkg) && externalInputActive(this);
        if (in.externalForeground) markActive(this, null);
        in.lastKeyAt = IdleWatcher.lastKeyAt;
        in.lastActiveAt = lastActiveAt;
        in.accessibility = IdleWatcher.connected;
        in.quietMode = prefs(this).getBoolean(KEY_IDLE_QUIET, true);
        in.canOpen = canOpenFromBackground(this);
        in.screenVisible = MainActivity.visible;
        in.adhanActive = adhanActive;
        in.takeoverEnabled = prefs(this).getBoolean(KEY_IDLE, true);
        in.snoozeUntil = prefs(this).getLong(KEY_SNOOZE, 0);
        in.minutes = prefs(this).getInt(KEY_IDLE_MIN, 5);
        String reason = IdleRules.decide(in);
        if (reason != null) {
            if (!reason.equals(lastIdleReason) && !"waiting".equals(reason)) log(this, "idle_skip_" + reason);
            lastIdleReason = reason;
            return;
        }
        lastIdleReason = null;
        log(this, IdleWatcher.connected ? "idle" : "idle_quiet");
        IdleWatcher.lastKeyAt = now;
        markActive(this, null);
        autoOpenAt = now;
        if (!openScreen(this)) log(this, "idle_open_failed");
    }

    /** شاشة توقف التلفاز بدأت: نوقظ الشاشة (ينهي شاشة التوقف) ثم نفتح المواقيت مكانها */
    @SuppressWarnings("deprecation")
    private void wakeAndOpen(Context ctx) {
        try {
            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(POWER_SERVICE);
            android.os.PowerManager.WakeLock wl = pm.newWakeLock(android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK | android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP, "rafiq:dream");
            wl.acquire(3000);
        } catch (Exception ignored) { /* بعض الأنظمة تمنعه؛ نحاول الفتح على أي حال */ }
        handler.postDelayed(() -> openScreen(ctx), 600);
    }

    // ---------- الأذان من الخلفية ----------
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private View overlay;
    private MediaSession session;

    private void playAdhan(String url, String prayer) {
        if (url == null || url.isEmpty()) return;
        stopAdhan();
        try {
            requestFocus();
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            player.setDataSource(url);
            player.setOnPreparedListener(MediaPlayer::start);
            player.setOnCompletionListener(mp -> stopAdhan());
            player.setOnErrorListener((mp, what, extra) -> { stopAdhan(); return true; });
            player.prepareAsync();
            adhanActive = true;
            log(this, "adhan_background");
            // لا تُفتح أي شاشة (Activity) فوق التطبيق الحالي: فتحها من الخلفية كان يجعل النظام يعود إلى
            // الشاشة الرئيسية عند إغلاقها (يخرج من يوتيوب أو القناة). بدلًا من ذلك:
            // - خدمة الإتاحة: أي زر يوقف الأذان دون أن يصل للتطبيق.
            // - إذن الظهور فوق التطبيقات: شريط علوي يلتقط أي زر.
            // - بدونهما: زر التشغيل/الإيقاف في جهاز التحكم (جلسة الوسائط)، ويتوقف الأذان وحده عند انتهائه.
            boolean bar = showOverlay(prayer);
            if (!bar && !IdleWatcher.connected) log(this, "adhan_media_keys_only");
            startMediaSession();
        } catch (Exception e) {
            stopAdhan();
        }
    }

    /** يوقف الأذان ويعيد الصوت للتطبيق السابق (يوتيوب وغيره يستأنف) */
    void stopAdhan() {
        adhanActive = false;
        if (player != null) { try { player.stop(); } catch (Exception ignored) { /* لم يبدأ بعد */ } player.release(); player = null; }
        if (overlay != null) {
            try { ((WindowManager) getSystemService(WINDOW_SERVICE)).removeView(overlay); } catch (Exception ignored) { /* أُزيل */ }
            overlay = null;
        }
        if (session != null) { session.setActive(false); session.release(); session = null; }
        AdhanActivity.close();
        abandonFocus();
    }

    /** يوقف صوت التطبيق الآخر (يوتيوب) مؤقتًا طوال الأذان */
    private void requestFocus() {
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                .build();
            audioManager.requestAudioFocus(focusRequest);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
        }
    }

    private void abandonFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
        else audioManager.abandonAudioFocus(null);
        focusRequest = null;
    }

    /** أزرار الوسائط (تشغيل/إيقاف) تصل إلى هذه الجلسة أثناء الأذان، فتوقفه */
    private void startMediaSession() {
        session = new MediaSession(this, "adhan");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPause() { stopAdhan(); }
            @Override public void onStop() { stopAdhan(); }
            @Override public void onPlay() { stopAdhan(); }
            @Override public boolean onMediaButtonEvent(Intent i) { stopAdhan(); return true; }
        });
        session.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_STOP | PlaybackState.ACTION_PLAY_PAUSE)
            .setState(PlaybackState.STATE_PLAYING, 0, 1f).build());
        session.setActive(true);
    }

    /**
     * شريط صغير أعلى الشاشة فوق التطبيق الحالي: «حان وقت الصلاة — اضغط أي زر لإيقاف الأذان».
     * يأخذ ضغطات جهاز التحكم أثناء الأذان، فأي زر يوقفه ويُزال الشريط (يحتاج إذن الظهور فوق التطبيقات).
     */
    private boolean showOverlay(String prayer) {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) return false;
        FrameLayout box = new FrameLayout(this) {
            @Override
            public boolean dispatchKeyEvent(KeyEvent e) {
                if (e.getAction() == KeyEvent.ACTION_UP) stopAdhan();
                return true;
            }
        };
        box.setFocusable(true);
        box.setFocusableInTouchMode(true);
        box.setBackgroundColor(Color.parseColor("#E6073B32"));
        box.setOnClickListener(v -> stopAdhan());
        TextView tv = new TextView(this);
        tv.setText((prayer.isEmpty() ? "حان الآن وقت الصلاة" : "حان الآن وقت صلاة " + prayer) + "  —  اضغط أي زر لإيقاف الأذان");
        tv.setTextColor(Color.parseColor("#F5E7BF"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        tv.setGravity(Gravity.CENTER);
        int pad = (int) (getResources().getDisplayMetrics().density * 14);
        tv.setPadding(pad, pad, pad, pad);
        box.addView(tv);
        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
            // مع خدمة الإتاحة تُلتقط الأزرار هناك، فلا يأخذ الشريط التركيز من التطبيق الحالي
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | (IdleWatcher.connected ? WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE : 0),
            PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP;
        try {
            ((WindowManager) getSystemService(WINDOW_SERVICE)).addView(box, lp);
            overlay = box;
            box.requestFocus();
            return true;
        } catch (Exception ignored) {
            overlay = null;
            return false;
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // بُدئت بمنبه الصلاة أو الحارس أو بعد إغلاق النظام لها: تحقق فوري من الوقت
        handler.post(() -> { try { checkPrayer(); } catch (Exception ignored) { /* لا شيء */ } });
        Alarms.schedule(this);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        instance = null;
        handler.removeCallbacks(tick);
        if (dreamRx != null) unregisterReceiver(dreamRx);
        stopAdhan();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
