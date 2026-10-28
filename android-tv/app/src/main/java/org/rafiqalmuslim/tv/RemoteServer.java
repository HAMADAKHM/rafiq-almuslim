package org.rafiqalmuslim.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Build;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.Iterator;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * «التحكم من الجوال»: خادم صغير على الشبكة المنزلية فقط، يعلن نفسه (_rafiqtv._tcp) ليجده تطبيق
 * رفيق المسلم بلس. كل الأوامر موقّعة بعد الربط برمز يظهر على الشاشة (RemoteCore). يعمل داخل TvService.
 */
final class RemoteServer {
    static final String NSD_TYPE = "_rafiqtv._tcp.";
    static final int BASE_PORT = 8765;
    static final String KEY_SNAPSHOT = "remote_snapshot";
    static final String KEY_PATCH = "remote_patch";

    private static RemoteServer instance;
    private final Context ctx;
    final RemoteCore core;
    private ServerSocket server;
    private Thread thread;
    private NsdManager.RegistrationListener nsdListener;
    private int port;

    /** شاشة المواقيت تسجّل هنا لتطبيق الإعدادات فورًا إن كانت ظاهرة */
    interface ScreenHook { void applyNow(); boolean nextScene(); void backgroundsChanged(); }
    static volatile ScreenHook screen;

    private RemoteServer(Context c) {
        ctx = c.getApplicationContext();
        final SharedPreferences p = TvService.prefs(ctx);
        core = new RemoteCore(new RemoteCore.Store() {
            public String get(String k) { return p.getString(k, null); }
            public void put(String k, String v) { p.edit().putString(k, v).apply(); }
        }, new SecureRandom(), Build.MODEL == null ? "Android TV" : Build.MODEL);
    }

    static synchronized RemoteServer get(Context c) {
        if (instance == null) instance = new RemoteServer(c);
        return instance;
    }

    synchronized void start() {
        if (thread != null) return;
        for (int p = BASE_PORT; p < BASE_PORT + 6 && server == null; p++) {
            try { server = new ServerSocket(p); port = p; } catch (Exception ignored) { /* المنفذ مشغول */ }
        }
        if (server == null) { TvService.log(ctx, "remote_no_port"); return; }
        thread = new Thread(this::loop, "rafiq-remote");
        thread.setDaemon(true);
        thread.start();
        register();
        TvService.log(ctx, "remote_on");
    }

    synchronized void stop() {
        try { if (server != null) server.close(); } catch (Exception ignored) { /* أُغلق */ }
        server = null;
        thread = null;
        try { if (nsdListener != null) ((NsdManager) ctx.getSystemService(Context.NSD_SERVICE)).unregisterService(nsdListener); } catch (Exception ignored) { /* لا شيء */ }
        nsdListener = null;
    }

    int port() { return port; }

    private void register() {
        try {
            NsdServiceInfo info = new NsdServiceInfo();
            info.setServiceName("رفيق المسلم — " + (Build.MODEL == null ? "TV" : Build.MODEL));
            info.setServiceType(NSD_TYPE);
            info.setPort(port);
            nsdListener = new NsdManager.RegistrationListener() {
                public void onRegistrationFailed(NsdServiceInfo s, int e) { TvService.log(ctx, "remote_nsd_failed"); }
                public void onUnregistrationFailed(NsdServiceInfo s, int e) { }
                public void onServiceRegistered(NsdServiceInfo s) { TvService.log(ctx, "remote_nsd_on"); }
                public void onServiceUnregistered(NsdServiceInfo s) { }
            };
            ((NsdManager) ctx.getSystemService(Context.NSD_SERVICE)).registerService(info, NsdManager.PROTOCOL_DNS_SD, nsdListener);
        } catch (Exception e) { TvService.log(ctx, "remote_nsd_failed"); }
    }

    private void loop() {
        ServerSocket s;
        while ((s = server) != null) {
            try {
                final Socket client = s.accept();
                // الشبكة المحلية فقط: يُرفض أي اتصال من عنوان عام
                InetAddress a = client.getInetAddress();
                if (!(a.isSiteLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress())) { client.close(); continue; }
                new Thread(() -> serve(client), "rafiq-remote-client").start();
            } catch (Exception e) {
                if (server == null) return;
            }
        }
    }

    private void serve(Socket client) {
        try (Socket c = client) {
            c.setSoTimeout(20000);
            InputStream in = c.getInputStream();
            OutputStream out = c.getOutputStream();
            RemoteHttp.Request r = RemoteHttp.read(in);
            if (r == null) { RemoteHttp.write(out, 400, "{}"); return; }
            JSONObject res = core.handle(r.method, r.path, r.headers, r.body, applier, System.currentTimeMillis());
            RemoteHttp.write(out, res.optInt("status", 500), res.optJSONObject("body") == null ? "{}" : res.getJSONObject("body").toString());
        } catch (Exception ignored) { /* اتصال مقطوع */ }
    }

    private final RemoteCore.Applier applier = new RemoteCore.Applier() {
        public JSONObject snapshot() {
            SharedPreferences p = TvService.prefs(ctx);
            JSONObject o;
            try { o = new JSONObject(p.getString(KEY_SNAPSHOT, "{}")); } catch (Exception e) { o = new JSONObject(); }
            try {
                // التعديلات التي لم تطبقها الشاشة بعد تظهر للهاتف أيضًا
                JSONObject pending = new JSONObject(p.getString(KEY_PATCH, "{}"));
                for (Iterator<String> it = pending.keys(); it.hasNext(); ) { String k = it.next(); o.put(k, pending.get(k)); }
                o.put("idleMinutes", p.getInt(TvService.KEY_IDLE_MIN, 5));
                o.put("idleTakeover", p.getBoolean(TvService.KEY_IDLE, true));
                o.put("autostart", TvWeb.autostart(ctx));
            } catch (Exception ignored) { /* لا شيء */ }
            return o;
        }

        public void applyScreen(JSONObject patch) {
            SharedPreferences p = TvService.prefs(ctx);
            try {
                JSONObject cur = new JSONObject(p.getString(KEY_PATCH, "{}"));
                for (Iterator<String> it = patch.keys(); it.hasNext(); ) { String k = it.next(); cur.put(k, patch.get(k)); }
                p.edit().putString(KEY_PATCH, cur.toString()).apply();
            } catch (Exception ignored) { /* لا شيء */ }
            ScreenHook h = screen;
            if (h != null) h.applyNow();
            TvService.log(ctx, "remote_settings");
        }

        public void applyNative(JSONObject patch) {
            SharedPreferences.Editor e = TvService.prefs(ctx).edit();
            if (patch.has("idleMinutes")) e.putInt(TvService.KEY_IDLE_MIN, patch.optInt("idleMinutes", 5));
            if (patch.has("idleTakeover")) e.putBoolean(TvService.KEY_IDLE, patch.optBoolean("idleTakeover", true));
            e.apply();
            if (patch.has("autostart")) new TvWeb.Bridge(ctx).setAutostart(patch.optBoolean("autostart"));
            TvService.markActive(ctx, null);
        }

        public JSONArray backgrounds() { return Backgrounds.list(ctx); }

        public String addBackground(byte[] image) {
            String id = Backgrounds.add(ctx, image);
            if (!id.startsWith("!")) { notifyScreen(); TvService.log(ctx, "remote_background"); }
            return id;
        }

        public boolean removeBackground(String id) {
            boolean ok = Backgrounds.remove(ctx, id);
            if (ok) notifyScreen();
            return ok;
        }

        private void notifyScreen() { ScreenHook h = screen; if (h != null) h.backgroundsChanged(); }

        public boolean action(String name) {
            switch (name) {
                case "stop_adhan": TvService.requestStopAdhan(ctx); return true;
                case "open_screen": return TvService.openScreen(ctx);
                case "next_scene": { ScreenHook h = screen; return h != null && h.nextScene(); }
                default: return false;
            }
        }
    };

    /** عنوان التلفاز في الشبكة المنزلية (للربط اليدوي) */
    static String localIp() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) if (a instanceof Inet4Address && a.isSiteLocalAddress()) return a.getHostAddress();
            }
        } catch (Exception ignored) { /* لا شيء */ }
        return "";
    }
}
