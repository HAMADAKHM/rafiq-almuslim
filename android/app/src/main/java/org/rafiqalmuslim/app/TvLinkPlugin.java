package org.rafiqalmuslim.app;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * «التحكم بالتلفاز»: يجد تطبيق شاشة رفيق المسلم على الشبكة المنزلية (NSD: _rafiqtv._tcp) ويرسل إليه الطلبات.
 * الطلبات عبر Socket مباشر لعناوين الشبكة المحلية فقط (لا تحتاج السماح بـ HTTP غير المشفّر للتطبيق كله)،
 * والتوقيع والتشفير يحدثان في الواجهة (src/services/tvRemote.ts).
 */
@CapacitorPlugin(name = "TvLink")
public class TvLinkPlugin extends Plugin {
    private static final String TYPE = "_rafiqtvnew._tcp."; // النسخة الجديدة: تجد تلفاز النسخة الجديدة فقط

    @PluginMethod
    public void discover(PluginCall call) {
        final int timeout = Math.max(1500, Math.min(10000, call.getInt("timeoutMs", 4000)));
        final Context ctx = getContext();
        final NsdManager nsd = (NsdManager) ctx.getSystemService(Context.NSD_SERVICE);
        final Map<String, JSObject> found = new LinkedHashMap<>();
        final List<NsdServiceInfo> queue = new ArrayList<>();
        final boolean[] resolving = { false };
        WifiManager.MulticastLock lock = null;
        try {
            lock = ((WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE)).createMulticastLock("rafiq-tvlink");
            lock.setReferenceCounted(false);
            lock.acquire();
        } catch (Exception ignored) { /* بعض الأجهزة لا تحتاجه */ }
        final WifiManager.MulticastLock heldLock = lock;
        final Runnable[] resolveNext = new Runnable[1];
        resolveNext[0] = () -> {
            synchronized (queue) {
                if (resolving[0] || queue.isEmpty()) return;
                resolving[0] = true;
                NsdServiceInfo next = queue.remove(0);
                try {
                    nsd.resolveService(next, new NsdManager.ResolveListener() {
                        public void onResolveFailed(NsdServiceInfo s, int e) { synchronized (queue) { resolving[0] = false; } resolveNext[0].run(); }
                        public void onServiceResolved(NsdServiceInfo s) {
                            InetAddress h = s.getHost();
                            if (h != null) {
                                JSObject o = new JSObject();
                                o.put("name", s.getServiceName());
                                o.put("host", h.getHostAddress());
                                o.put("port", s.getPort());
                                synchronized (found) { found.put(h.getHostAddress() + ":" + s.getPort(), o); }
                            }
                            synchronized (queue) { resolving[0] = false; }
                            resolveNext[0].run();
                        }
                    });
                } catch (Exception e) { resolving[0] = false; }
            }
        };
        final NsdManager.DiscoveryListener listener = new NsdManager.DiscoveryListener() {
            public void onStartDiscoveryFailed(String t, int e) { }
            public void onStopDiscoveryFailed(String t, int e) { }
            public void onDiscoveryStarted(String t) { }
            public void onDiscoveryStopped(String t) { }
            public void onServiceFound(NsdServiceInfo s) { synchronized (queue) { queue.add(s); } resolveNext[0].run(); }
            public void onServiceLost(NsdServiceInfo s) { }
        };
        try { nsd.discoverServices(TYPE, NsdManager.PROTOCOL_DNS_SD, listener); } catch (Exception e) { call.reject("discovery_failed"); return; }
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try { nsd.stopServiceDiscovery(listener); } catch (Exception ignored) { /* لا شيء */ }
            if (heldLock != null) try { heldLock.release(); } catch (Exception ignored) { /* لا شيء */ }
            JSArray arr = new JSArray();
            synchronized (found) { for (JSObject o : found.values()) arr.put(o); }
            JSObject r = new JSObject();
            r.put("devices", arr);
            call.resolve(r);
        }, timeout);
    }

    /** طلب HTTP بسيط إلى التلفاز (عناوين الشبكة المحلية فقط) */
    @PluginMethod
    public void request(final PluginCall call) {
        final String host = call.getString("host", "");
        final int port = call.getInt("port", 8765);
        final String method = call.getString("method", "GET");
        final String path = call.getString("path", "/");
        final String body = call.getString("body", "");
        final int timeout = Math.max(1000, Math.min(15000, call.getInt("timeoutMs", 6000)));
        final JSObject headers = call.getObject("headers", new JSObject());
        new Thread(() -> {
            try {
                InetAddress addr = InetAddress.getByName(host);
                if (!(addr.isSiteLocalAddress() || addr.isLinkLocalAddress() || addr.isLoopbackAddress())) { call.reject("not_local"); return; }
                if (!path.startsWith("/") || path.contains("\r") || path.contains("\n") || port < 1 || port > 65535) { call.reject("bad_request"); return; }
                try (Socket s = new Socket()) {
                    s.connect(new InetSocketAddress(addr, port), timeout);
                    s.setSoTimeout(timeout);
                    byte[] b = body.getBytes(StandardCharsets.UTF_8);
                    StringBuilder head = new StringBuilder(method + " " + path + " HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: " + b.length + "\r\n");
                    for (Iterator<String> it = headers.keys(); it.hasNext(); ) {
                        String k = it.next();
                        String v = headers.getString(k, "");
                        if (k.contains("\r") || k.contains("\n") || v.contains("\r") || v.contains("\n")) continue;
                        head.append(k).append(": ").append(v).append("\r\n");
                    }
                    head.append("\r\n");
                    OutputStream out = s.getOutputStream();
                    out.write(head.toString().getBytes(StandardCharsets.UTF_8));
                    out.write(b);
                    out.flush();
                    InputStream in = s.getInputStream();
                    ByteArrayOutputStream all = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) != -1) { all.write(buf, 0, n); if (all.size() > 256 * 1024) break; }
                    String resp = new String(all.toByteArray(), StandardCharsets.UTF_8);
                    int sp = resp.indexOf(' ');
                    int status = sp > 0 ? Integer.parseInt(resp.substring(sp + 1, Math.min(resp.length(), sp + 4))) : 0;
                    int sep = resp.indexOf("\r\n\r\n");
                    JSObject r = new JSObject();
                    r.put("status", status);
                    r.put("body", sep >= 0 ? resp.substring(sep + 4) : "");
                    call.resolve(r);
                }
            } catch (Exception e) {
                call.reject("unreachable");
            }
        }, "rafiq-tvlink").start();
    }
}
