package org.rafiqalmuslim.tv;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

/**
 * تحديث تطبيق الشاشة بطلب من الجوال المربوط: يُنزَّل ملف التطبيق من إصدارات المشروع على GitHub فقط
 * (يتحقق RemoteCore من الرابط)، ثم يُتحقق أنه للتطبيق نفسه وبرقم إصدار أحدث، ثم يُعرض طلب التثبيت على التلفاز
 * ليوافق المستخدم بجهاز التحكم (Android لا يسمح بالتثبيت الصامت). التوقيع نفسه يفرضه النظام.
 */
final class Updater {
    static final String ACTION_DONE = "org.rafiqalmuslim.tv.UPDATE_DONE";
    private static final long MAX_BYTES = 150L * 1024 * 1024;
    /** idle | downloading:نسبة | installing | done | error:رمز */
    private static volatile String state = "idle";

    static String state() { return state; }

    static long versionCode(Context c) {
        try {
            PackageInfo pi = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception e) { return 0; }
    }

    static JSONObject version(Context c) {
        JSONObject o = new JSONObject();
        try {
            PackageInfo pi = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            o.put("code", versionCode(c)).put("name", pi.versionName).put("update", state);
        } catch (Exception ignored) { /* لا شيء */ }
        return o;
    }

    /** يبدأ التحديث في الخلفية؛ يعيد "started" أو "!رمز الخطأ" */
    static synchronized String start(Context ctx, String url) {
        if (state.startsWith("downloading") || state.equals("installing")) return "!busy";
        if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
            // أول مرة: يفتح التلفاز إعداد «السماح بالتثبيت من هذا التطبيق»
            try {
                Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Exception ignored) { /* بعض الأجهزة بلا هذه الشاشة */ }
            return "!needs_permission";
        }
        state = "downloading:0";
        final Context app = ctx.getApplicationContext();
        new Thread(() -> run(app, url), "rafiq-tv-update").start();
        return "started";
    }

    private static void run(Context ctx, String url) {
        File f = new File(ctx.getCacheDir(), "update.apk");
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(20000);
            c.setReadTimeout(30000);
            if (c.getResponseCode() != 200) { state = "error:http_" + c.getResponseCode(); return; }
            long total = c.getContentLengthLong();
            if (total > MAX_BYTES) { state = "error:too_large"; return; }
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(f)) {
                byte[] buf = new byte[64 * 1024];
                long got = 0;
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    got += n;
                    if (got > MAX_BYTES) { state = "error:too_large"; return; }
                    if (total > 0) state = "downloading:" + (int) (got * 100 / total);
                }
            }
            PackageInfo pi = ctx.getPackageManager().getPackageArchiveInfo(f.getAbsolutePath(), 0);
            if (pi == null || !ctx.getPackageName().equals(pi.packageName)) { state = "error:not_our_app"; return; }
            long vc = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
            if (vc <= versionCode(ctx)) { state = "error:not_newer"; return; }
            install(ctx, f);
        } catch (Exception e) {
            state = "error:download";
        }
    }

    private static void install(Context ctx, File f) throws Exception {
        PackageInstaller pi = ctx.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams p = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        p.setAppPackageName(ctx.getPackageName());
        int id = pi.createSession(p);
        try (PackageInstaller.Session s = pi.openSession(id)) {
            try (InputStream in = new FileInputStream(f); OutputStream out = s.openWrite("tv.apk", 0, f.length())) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                s.fsync(out);
            }
            Intent done = new Intent(ctx, Done.class).setAction(ACTION_DONE);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
            state = "installing";
            s.commit(PendingIntent.getBroadcast(ctx, id, done, flags).getIntentSender());
        }
    }

    /** نتيجة التثبيت: يطلب النظام موافقة المستخدم، فنعرض شاشة التأكيد على التلفاز */
    public static class Done extends BroadcastReceiver {
        @Override
        public void onReceive(Context c, Intent i) {
            int st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
            if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                Intent confirm = i.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm != null) { confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(confirm); }
                return;
            }
            state = st == PackageInstaller.STATUS_SUCCESS ? "done" : st == PackageInstaller.STATUS_FAILURE_CONFLICT ? "error:signature" : st == PackageInstaller.STATUS_FAILURE_ABORTED ? "error:cancelled" : "error:install";
        }
    }
}
