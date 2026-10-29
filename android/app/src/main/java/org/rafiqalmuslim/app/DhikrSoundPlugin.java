package org.rafiqalmuslim.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

/**
 * صوت إشعار الذكر من ملف على الجهاز: نطق الذكر بمحرك الكلام العربي في الهاتف، أو تسجيل المستخدم بصوته.
 * يُحفظ الملف داخل التطبيق وتُنشأ له قناة إشعار بصوته، فيُسمع الذكر نفسه عند وصول التذكير والتطبيق مغلق.
 * يتبع صوت الإشعارات في الجهاز (الصامت وعدم الإزعاج يُحترمان). صوت القناة لا يتغير بعد إنشائها،
 * لذلك لكل محتوى قناة جديدة بمعرّف من بصمته، وتُحذف قنوات الموضع نفسه السابقة.
 */
@CapacitorPlugin(name = "DhikrSound")
public class DhikrSoundPlugin extends Plugin {
    static final String PREFIX = "rafiq-dsound-";

    @PluginMethod
    public void install(PluginCall call) {
        String slot = call.getString("slot");
        String sig = call.getString("sig");
        String data = call.getString("base64");
        String ext = call.getString("ext", "wav");
        String name = call.getString("name", "ذكر مسموع");
        String text = call.getString("text", "");
        if (slot == null || sig == null || data == null || !slot.matches("[a-z]{1,16}") || !sig.matches("[a-z0-9]{1,16}") || !ext.matches("[a-z0-9]{1,5}")) {
            call.reject("invalid arguments");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) { call.reject("unsupported"); return; }
        try {
            Context ctx = getContext();
            String channelId = PREFIX + slot + "-" + sig;
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            File dir = new File(ctx.getFilesDir(), "dhikr");
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("mkdir failed");
            // قنوات وملفات الموضع نفسه السابقة
            for (NotificationChannel c : nm.getNotificationChannels()) {
                if (c.getId().startsWith(PREFIX + slot + "-") && !c.getId().equals(channelId)) nm.deleteNotificationChannel(c.getId());
            }
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) if (f.getName().startsWith(slot + "_") && !f.getName().startsWith(slot + "_" + sig + ".")) f.delete();
            File out = new File(dir, slot + "_" + sig + "." + ext);
            try (FileOutputStream fos = new FileOutputStream(out)) { fos.write(Base64.decode(data, Base64.DEFAULT)); }
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", out);
            // واجهة النظام هي التي تشغّل صوت الإشعار، فتحتاج إذن قراءة الملف
            ctx.grantUriPermission("com.android.systemui", uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            ctx.grantUriPermission("android", uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            NotificationChannel ch = new NotificationChannel(channelId, name, NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription(text.isEmpty() ? "يُقرأ الذكر عند وصول التذكير" : "يُقرأ «" + text + "» عند وصول التذكير");
            ch.setSound(uri, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
            ch.enableVibration(true);
            ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
            JSObject r = new JSObject();
            r.put("channelId", channelId);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("install failed: " + e.getMessage());
        }
    }

    /** القناة موجودة وملفها باقٍ (لا حاجة لإعادة التثبيت عند كل جدولة) */
    @PluginMethod
    public void exists(PluginCall call) {
        String channelId = call.getString("channelId", "");
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && channelId.startsWith(PREFIX)) {
            NotificationManager nm = getContext().getSystemService(NotificationManager.class);
            NotificationChannel c = nm.getNotificationChannel(channelId);
            String rest = channelId.substring(PREFIX.length());
            int dash = rest.indexOf('-');
            if (c != null && dash > 0) {
                String prefix = rest.substring(0, dash) + "_" + rest.substring(dash + 1) + ".";
                File[] files = new File(getContext().getFilesDir(), "dhikr").listFiles();
                if (files != null) for (File f : files) if (f.getName().startsWith(prefix) && f.length() > 0) ok = true;
            }
        }
        JSObject r = new JSObject();
        r.put("exists", ok);
        call.resolve(r);
    }

    /** إزالة قناة الموضع (عند العودة إلى تسجيل حصن المسلم) */
    @PluginMethod
    public void remove(PluginCall call) {
        String slot = call.getString("slot", "");
        if (!slot.matches("[a-z]{1,16}")) { call.reject("invalid"); return; }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getContext().getSystemService(NotificationManager.class);
            for (NotificationChannel c : nm.getNotificationChannels()) if (c.getId().startsWith(PREFIX + slot + "-")) nm.deleteNotificationChannel(c.getId());
        }
        File[] old = new File(getContext().getFilesDir(), "dhikr").listFiles();
        if (old != null) for (File f : old) if (f.getName().startsWith(slot + "_")) f.delete();
        call.resolve();
    }
}
