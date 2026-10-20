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
 * صوت أذان يختاره المستخدم من جهازه: يُحفظ داخل التطبيق وتُنشأ له قناة إشعارات بصوته،
 * فيُرفع الأذان عند دخول الوقت حتى والتطبيق مغلق. الصوت بمستوى «المنبّه» في الجهاز.
 */
@CapacitorPlugin(name = "AdhanSound")
public class AdhanSoundPlugin extends Plugin {
    private static final String PREFIX = "adhan_dev_";

    @PluginMethod
    public void install(PluginCall call) {
        String key = call.getString("key");
        String data = call.getString("base64");
        String ext = call.getString("ext", "mp3");
        String name = call.getString("name", "الأذان");
        if (key == null || data == null || !key.matches("[a-z0-9]{1,24}") || !ext.matches("[a-z0-9]{1,5}")) {
            call.reject("invalid arguments");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("unsupported");
            return;
        }
        try {
            Context ctx = getContext();
            File dir = new File(ctx.getFilesDir(), "adhan");
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("mkdir failed");
            // حذف الملفات والقنوات السابقة (قناة Android لا يتغير صوتها بعد إنشائها)
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) f.delete();
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            for (NotificationChannel c : nm.getNotificationChannels()) {
                if (c.getId().startsWith(PREFIX)) nm.deleteNotificationChannel(c.getId());
            }
            File out = new File(dir, "adhan_" + key + "." + ext);
            try (FileOutputStream fos = new FileOutputStream(out)) {
                fos.write(Base64.decode(data, Base64.DEFAULT));
            }
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", out);
            ctx.grantUriPermission("com.android.systemui", uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            String channelId = PREFIX + key;
            NotificationChannel ch = new NotificationChannel(channelId, "الأذان — " + name, NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("إشعار دخول وقت الصلاة بصوت الأذان المختار من جهازك");
            ch.setSound(uri, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            ch.enableVibration(true);
            nm.createNotificationChannel(ch);
            JSObject r = new JSObject();
            r.put("channelId", channelId);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("install failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        Context ctx = getContext();
        File dir = new File(ctx.getFilesDir(), "adhan");
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) f.delete();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            for (NotificationChannel c : nm.getNotificationChannels()) {
                if (c.getId().startsWith(PREFIX)) nm.deleteNotificationChannel(c.getId());
            }
        }
        call.resolve();
    }
}
