package org.rafiqalmuslim.tv;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import java.io.InputStream;
import java.net.URL;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;

/**
 * تحميل ملفات التلاوة والأذكار عبر شبكة Android نفسها بدل WebView:
 * أجهزة التلفاز القديمة (قبل Android 7.1.1) لا تعرف شهادة الجذر الحالية لـ Let's Encrypt (ISRG Root X1)
 * فيفشل تحميل التلاوة من everyayah.com مع أن التلفاز متصل. هنا نثق بجذور النظام + جذري ISRG X1/X2
 * المرفقين بالتطبيق (التحقق من الشهادة واسم الخادم يبقى كاملًا؛ لا يُقبل أي اتصال غير موثق).
 */
final class AudioFetch {
    private AudioFetch() {}
    private static volatile javax.net.ssl.SSLSocketFactory factory;

    static boolean handles(Uri u) {
        String h = u.getHost();
        if (h == null || !"https".equals(u.getScheme())) return false;
        return h.equals("everyayah.com") || h.equals("www.everyayah.com") || h.equals("cdn.islamic.network") || h.endsWith("hisnmuslim.com");
    }

    private static javax.net.ssl.SSLSocketFactory socketFactory(Context c) throws Exception {
        if (factory != null) return factory;
        TrustManagerFactory sys = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        sys.init((KeyStore) null);
        final X509TrustManager system = first(sys.getTrustManagers());
        KeyStore ks = KeyStore.getInstance(KeyStore.getDefaultType());
        ks.load(null, null);
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        int[] roots = { R.raw.isrg_root_x1, R.raw.isrg_root_x2 };
        for (int i = 0; i < roots.length; i++) {
            try (InputStream in = c.getResources().openRawResource(roots[i])) { ks.setCertificateEntry("isrg" + i, cf.generateCertificate(in)); }
        }
        TrustManagerFactory extra = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        extra.init(ks);
        final X509TrustManager bundled = first(extra.getTrustManagers());
        X509TrustManager both = new X509TrustManager() {
            @Override public void checkClientTrusted(X509Certificate[] chain, String auth) throws CertificateException { system.checkClientTrusted(chain, auth); }
            @Override public void checkServerTrusted(X509Certificate[] chain, String auth) throws CertificateException {
                try { system.checkServerTrusted(chain, auth); } catch (CertificateException e) { bundled.checkServerTrusted(chain, auth); }
            }
            @Override public X509Certificate[] getAcceptedIssuers() { return system.getAcceptedIssuers(); }
        };
        SSLContext ctx = SSLContext.getInstance("TLS");
        ctx.init(null, new TrustManager[] { both }, null);
        factory = ctx.getSocketFactory();
        return factory;
    }

    private static X509TrustManager first(TrustManager[] tms) {
        for (TrustManager t : tms) if (t instanceof X509TrustManager) return (X509TrustManager) t;
        throw new IllegalStateException("no X509TrustManager");
    }

    /** يعيد استجابة الملف، أو null فيتولى WebView الطلب كالمعتاد */
    static WebResourceResponse fetch(Context c, Uri u) {
        HttpsURLConnection con = null;
        try {
            con = (HttpsURLConnection) new URL(u.toString()).openConnection();
            con.setSSLSocketFactory(socketFactory(c));
            con.setConnectTimeout(15000);
            con.setReadTimeout(30000);
            con.setInstanceFollowRedirects(true);
            con.setRequestProperty("User-Agent", "RafiqAlMuslimTV");
            int code = con.getResponseCode();
            if (code < 200 || code >= 300) { con.disconnect(); return null; }
            String type = con.getContentType();
            String mime = type != null && type.contains("/") ? type.split(";")[0].trim() : "audio/mpeg";
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "max-age=86400");
            int len = con.getContentLength();
            if (len > 0) headers.put("Content-Length", String.valueOf(len));
            return new WebResourceResponse(mime, null, 200, "OK", headers, con.getInputStream());
        } catch (Exception e) {
            if (con != null) try { con.disconnect(); } catch (Exception ignored) {}
            return null;
        }
    }
}
