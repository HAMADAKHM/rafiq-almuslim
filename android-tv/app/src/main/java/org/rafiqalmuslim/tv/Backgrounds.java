package org.rafiqalmuslim.tv;

import android.content.Context;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Locale;

/** خلفيات الشاشة من صور المستخدم (تصل من الجوال): ملفات داخل مساحة التطبيق فقط، ولا تخرج من التلفاز */
final class Backgrounds {
    private Backgrounds() {}

    static File dir(Context c) {
        File d = new File(c.getFilesDir(), "backgrounds");
        if (!d.isDirectory()) d.mkdirs();
        return d;
    }

    private static File[] files(Context c) {
        File[] f = dir(c).listFiles((d, n) -> n.endsWith(".jpg") || n.endsWith(".png"));
        if (f == null) return new File[0];
        Arrays.sort(f, new Comparator<File>() { public int compare(File a, File b) { return Long.compare(a.lastModified(), b.lastModified()); } });
        return f;
    }

    private static String idOf(File f) { String n = f.getName(); return n.substring(0, n.lastIndexOf('.')); }

    static JSONArray list(Context c) {
        JSONArray out = new JSONArray();
        try { for (File f : files(c)) out.put(new JSONObject().put("id", idOf(f)).put("at", f.lastModified()).put("size", f.length())); } catch (Exception ignored) { /* لا شيء */ }
        return out;
    }

    /** يعيد معرّف الصورة، أو رمز الخطأ يبدأ بـ «!» */
    static synchronized String add(Context c, byte[] data) {
        String kind = RemoteCore.imageKind(data);
        if (kind == null) return "!bad_image";
        if (files(c).length >= RemoteCore.MAX_BACKGROUNDS) return "!too_many";
        byte[] r = new byte[3];
        new SecureRandom().nextBytes(r);
        String id = Long.toString(System.currentTimeMillis(), 36) + RemoteCore.hex(r);
        try (OutputStream o = new FileOutputStream(new File(dir(c), id + "." + kind))) { o.write(data); }
        catch (Exception e) { return "!write_failed"; }
        return id;
    }

    static boolean remove(Context c, String id) {
        if (!RemoteCore.validBackgroundId(id)) return false;
        boolean ok = false;
        for (String ext : new String[] { ".jpg", ".png" }) ok |= new File(dir(c), id + ext).delete();
        return ok;
    }

    /** الصورة كرابط data للشاشة */
    static String dataUrl(Context c, String id) {
        if (!RemoteCore.validBackgroundId(id)) return "";
        for (String ext : new String[] { "jpg", "png" }) {
            File f = new File(dir(c), id + "." + ext);
            if (!f.isFile()) continue;
            try (InputStream in = new FileInputStream(f)) {
                ByteArrayOutputStream b = new ByteArrayOutputStream((int) f.length());
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) != -1) b.write(buf, 0, n);
                return "data:image/" + (ext.equals("png") ? "png" : "jpeg") + ";base64," + Base64.encodeToString(b.toByteArray(), Base64.NO_WRAP);
            } catch (Exception e) { return ""; }
        }
        return "";
    }

    static String idsJson(Context c) {
        JSONArray a = new JSONArray();
        for (File f : files(c)) a.put(idOf(f).toLowerCase(Locale.ROOT));
        return a.toString();
    }
}
