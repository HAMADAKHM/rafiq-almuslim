package org.rafiqalmuslim.tv;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

/** الربط والتوقيع والتحقق من الإعدادات — ومطابقة التشفير لما يحسبه الهاتف (قيم مرجعية من WebCrypto/Node) */
public class RemoteCoreTest {
    private static final long NOW = 1_800_000_000_000L;

    static final class MemStore implements RemoteCore.Store {
        final Map<String, String> m = new HashMap<>();
        public String get(String k) { return m.get(k); }
        public void put(String k, String v) { m.put(k, v); }
    }

    static final class FakeApplier implements RemoteCore.Applier {
        JSONObject screen = new JSONObject(), nat = new JSONObject();
        String lastAction;
        public JSONObject snapshot() { return screen; }
        public void applyScreen(JSONObject p) { try { for (java.util.Iterator<String> it = p.keys(); it.hasNext(); ) { String k = it.next(); screen.put(k, p.get(k)); } } catch (Exception ignored) { } }
        public void applyNative(JSONObject p) { nat = p; }
        public boolean action(String a) { lastAction = a; return true; }
        final java.util.List<byte[]> images = new java.util.ArrayList<>();
        public org.json.JSONArray backgrounds() { org.json.JSONArray a = new org.json.JSONArray(); for (int i = 0; i < images.size(); i++) a.put("b" + i); return a; }
        public String addBackground(byte[] img) { if (images.size() >= RemoteCore.MAX_BACKGROUNDS) return "!too_many"; images.add(img); return "b" + (images.size() - 1); }
        public boolean removeBackground(String id) { return id.equals("b0") && !images.isEmpty() && images.remove(0) != null; }
        String updateUrl;
        public JSONObject version() { try { return new JSONObject().put("code", 120).put("update", "idle"); } catch (Exception e) { return new JSONObject(); } }
        public String startUpdate(String url) { updateUrl = url; return "started"; }
    }

    @Test public void updateOnlyFromProjectReleasesAndOnlyWhenPaired() throws Exception {
        RemoteCore core = new RemoteCore(new MemStore(), new SecureRandom(), "TV");
        FakeApplier ap = new FakeApplier();
        assertEquals(120, core.handle("GET", "/info", new HashMap<>(), new byte[0], ap, NOW).getJSONObject("body").getJSONObject("version").getInt("code"));
        String good = "https://github.com/HAMADAKHM/rafiq-almuslim/releases/download/beta-v1.0.0-beta.5-build.130/RafiqAlMuslimTVNew.apk";
        assertTrue(RemoteCore.validUpdateUrl(good));
        assertFalse(RemoteCore.validUpdateUrl("https://evil.example/RafiqAlMuslimTVNew.apk"));
        // ملف النسخة الأصلية لا يُثبَّت فوق النسخة الجديدة
        assertFalse(RemoteCore.validUpdateUrl("https://github.com/HAMADAKHM/rafiq-almuslim/releases/download/beta-v1.0.0-beta.5-build.130/RafiqAlMuslim-TV.apk"));
        assertFalse(RemoteCore.validUpdateUrl("http://github.com/HAMADAKHM/rafiq-almuslim/releases/download/x/RafiqAlMuslimTVNew.apk"));
        assertFalse(RemoteCore.validUpdateUrl("https://github.com/someone/else/releases/download/x/RafiqAlMuslimTVNew.apk"));
        assertFalse(RemoteCore.validUpdateUrl("https://github.com/HAMADAKHM/rafiq-almuslim/releases/download/../RafiqAlMuslimTVNew.apk"));
        byte[] body = b(new JSONObject().put("url", good).toString());
        // دون ربط: مرفوض
        assertEquals(401, core.handle("POST", "/update", new HashMap<>(), body, ap, NOW).getInt("status"));
        String code = core.startPairing(NOW);
        String[] dev = pair(core, code, NOW + 1000);
        long t = NOW + 3000;
        assertEquals(200, core.handle("POST", "/update", h(dev[0], t, sign(dev[1], "POST", "/update", t, body)), body, ap, t).getInt("status"));
        assertEquals(good, ap.updateUrl);
        byte[] bad = b(new JSONObject().put("url", "https://evil.example/RafiqAlMuslimTVNew.apk").toString());
        long t2 = t + 1000;
        assertEquals(400, core.handle("POST", "/update", h(dev[0], t2, sign(dev[1], "POST", "/update", t2, bad)), bad, ap, t2).getInt("status"));
    }

    private static Map<String, String> h(String dev, long t, String sig) {
        Map<String, String> m = new HashMap<>();
        if (dev != null) m.put("x-rafiq-device", dev);
        m.put("x-rafiq-time", String.valueOf(t));
        if (sig != null) m.put("x-rafiq-sig", sig);
        return m;
    }

    private static byte[] b(String s) { return s.getBytes(StandardCharsets.UTF_8); }

    /** يحاكي الهاتف: يربط بالرمز ويعيد {deviceId, token} */
    private static String[] pair(RemoteCore core, String code, long now) throws Exception {
        byte[] pnb = new byte[16];
        new SecureRandom().nextBytes(pnb);
        String pn = RemoteCore.enc(pnb);
        JSONObject r1 = core.handle("POST", "/pair/start", new HashMap<>(), b(new JSONObject().put("pn", pn).put("name", "جوال").toString()), new FakeApplier(), now);
        assertEquals(200, r1.getInt("status"));
        String tn = r1.getJSONObject("body").getString("tn");
        byte[] key = RemoteCore.pairKey(code, pn, tn);
        String proof = RemoteCore.enc(RemoteCore.hmac(key, b("pair|جوال")));
        JSONObject r2 = core.handle("POST", "/pair/finish", new HashMap<>(), b(new JSONObject().put("pn", pn).put("tn", tn).put("name", "جوال").put("proof", proof).toString()), new FakeApplier(), now);
        if (r2.getInt("status") != 200) return null;
        JSONObject body = r2.getJSONObject("body");
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, RemoteCore.b64(body.getString("iv"))));
        JSONObject secret = new JSONObject(new String(c.doFinal(RemoteCore.b64(body.getString("ct"))), StandardCharsets.UTF_8));
        return new String[] { secret.getString("deviceId"), secret.getString("token") };
    }

    private static String sign(String token, String method, String path, long t, byte[] body) throws Exception {
        return RemoteCore.enc(RemoteCore.hmac(RemoteCore.b64(token), RemoteCore.signingString(method, path, String.valueOf(t), body)));
    }

    @Test public void interopWithPhoneCrypto() throws Exception {
        String pn = "AQEBAQEBAQEBAQEBAQEBAQ==", tn = "AgICAgICAgICAgICAgICAg==";
        byte[] k = RemoteCore.pairKey("123456", pn, tn);
        assertEquals("M9HUOG9XUCVIMqRfA/nRcXbzalUV71Tik81SrN5O6t8=", RemoteCore.enc(k));
        assertEquals("pyfJ7uOk93Tev/fv8nf64MrGupiJNfpf6fRvUB+PCko=", RemoteCore.enc(RemoteCore.hmac(k, b("pair|جوال أحمد"))));
        byte[] iv = new byte[12];
        java.util.Arrays.fill(iv, (byte) 3);
        assertEquals("JcImyhT7fRqvvKTzaybuUEXPo5CVpqg=", RemoteCore.enc(RemoteCore.aesGcm(k, iv, b("{\"a\":1}"))));
        byte[] token = new byte[32];
        java.util.Arrays.fill(token, (byte) 4);
        assertEquals("a0tjemxrvC6OftbagatrX1/u0+APThYJYetba1jUsCU=", sign(RemoteCore.enc(token), "POST", "/settings", NOW, b("{\"scene\":\"aurora\"}")));
    }

    @Test public void base64RoundTrip() {
        for (int n = 0; n < 40; n++) {
            byte[] x = new byte[n];
            new SecureRandom().nextBytes(x);
            assertArrayEquals(x, RemoteCore.b64(RemoteCore.enc(x)));
        }
        assertEquals(0, RemoteCore.b64("@@@@").length);
    }

    @Test public void pairingWithCorrectCodeThenSignedRequests() throws Exception {
        MemStore st = new MemStore();
        RemoteCore core = new RemoteCore(st, new SecureRandom(), "تلفاز الصالة");
        String code = core.startPairing(NOW);
        String[] dev = pair(core, code, NOW + 1000);
        assertNotNull(dev);
        assertFalse("الربط يُغلق بعد نجاحه", core.pairingOpen(NOW + 2000));
        FakeApplier ap = new FakeApplier();
        byte[] body = b("{\"scene\":\"aurora\",\"rotateMin\":20,\"idleMinutes\":5}");
        long t = NOW + 5000;
        JSONObject r = core.handle("POST", "/settings", h(dev[0], t, sign(dev[1], "POST", "/settings", t, body)), body, ap, t);
        assertEquals(200, r.getInt("status"));
        assertEquals("aurora", ap.screen.getString("scene"));
        assertEquals(5, ap.nat.getInt("idleMinutes"));
        // إعادة الطلب نفسه (التقاطه من الشبكة) مرفوضة
        assertEquals(401, core.handle("POST", "/settings", h(dev[0], t, sign(dev[1], "POST", "/settings", t, body)), body, ap, t + 10).getInt("status"));
        // توقيع بمفتاح آخر أو جهاز غير معروف أو وقت قديم
        long t2 = t + 1000;
        assertEquals(401, core.handle("POST", "/settings", h(dev[0], t2, sign(RemoteCore.enc(new byte[32]), "POST", "/settings", t2, body)), body, ap, t2).getInt("status"));
        assertEquals(401, core.handle("POST", "/settings", h("nope", t2, sign(dev[1], "POST", "/settings", t2, body)), body, ap, t2).getInt("status"));
        long old = t2 - RemoteCore.MAX_SKEW_MS - 1000;
        assertEquals(401, core.handle("GET", "/settings", h(dev[0], old, sign(dev[1], "GET", "/settings", old, new byte[0])), new byte[0], ap, t2).getInt("status"));
        // تعديل الجسم بعد التوقيع
        long t3 = t2 + 1000;
        String sg = sign(dev[1], "POST", "/action", t3, b("{\"action\":\"next_scene\"}"));
        assertEquals(401, core.handle("POST", "/action", h(dev[0], t3, sg), b("{\"action\":\"stop_adhan\"}"), ap, t3).getInt("status"));
        assertEquals(200, core.handle("POST", "/action", h(dev[0], t3, sg), b("{\"action\":\"next_scene\"}"), ap, t3).getInt("status"));
        assertEquals("next_scene", ap.lastAction);
        // الحالة تبقى بعد إعادة تشغيل التلفاز (من التخزين)
        RemoteCore again = new RemoteCore(st, new SecureRandom(), "تلفاز الصالة");
        long t4 = t3 + 1000;
        assertEquals(200, again.handle("GET", "/settings", h(dev[0], t4, sign(dev[1], "GET", "/settings", t4, new byte[0])), new byte[0], ap, t4).getInt("status"));
        assertEquals(1, again.deviceList().length());
        // إلغاء الربط من الهاتف
        long t5 = t4 + 1000;
        assertEquals(200, again.handle("POST", "/unpair", h(dev[0], t5, sign(dev[1], "POST", "/unpair", t5, new byte[0])), new byte[0], ap, t5).getInt("status"));
        long t6 = t5 + 1000;
        assertEquals(401, again.handle("GET", "/settings", h(dev[0], t6, sign(dev[1], "GET", "/settings", t6, new byte[0])), new byte[0], ap, t6).getInt("status"));
    }

    @Test public void backgroundsUploadListDeleteAndLimits() throws Exception {
        RemoteCore core = new RemoteCore(new MemStore(), new SecureRandom(), "TV");
        String[] dev = pair(core, core.startPairing(NOW), NOW + 1000);
        FakeApplier ap = new FakeApplier();
        long[] t = { NOW + 2000 };
        java.util.function.BiFunction<String, byte[], JSONObject> call = (path, body) -> {
            t[0] += 1000;
            try { return core.handle("POST", path, h(dev[0], t[0], sign(dev[1], "POST", path, t[0], body)), body, ap, t[0]); } catch (Exception e) { throw new RuntimeException(e); }
        };
        byte[] jpg = new byte[2000];
        jpg[0] = (byte) 0xFF; jpg[1] = (byte) 0xD8; jpg[2] = (byte) 0xFF;
        JSONObject r = call.apply("/backgrounds", b(new JSONObject().put("data", RemoteCore.enc(jpg)).toString()));
        assertEquals(200, r.getInt("status"));
        assertEquals(1, ap.images.size());
        // ملف ليس صورة، أو Base64 تالف، أو صورة أكبر من الحد
        assertEquals("bad_image", call.apply("/backgrounds", b(new JSONObject().put("data", RemoteCore.enc(b("<html>not an image</html>"))).toString())).getJSONObject("body").getString("error"));
        assertEquals("bad_image", call.apply("/backgrounds", b("{\"data\":\"@@@\"}")).getJSONObject("body").getString("error"));
        byte[] big = new byte[RemoteCore.MAX_IMAGE_BYTES + 3];
        big[0] = (byte) 0xFF; big[1] = (byte) 0xD8; big[2] = (byte) 0xFF;
        assertEquals("too_large", call.apply("/backgrounds", b(new JSONObject().put("data", RemoteCore.enc(big)).toString())).getJSONObject("body").getString("error"));
        // الحد الأقصى لعدد الصور
        for (int i = 1; i < RemoteCore.MAX_BACKGROUNDS; i++) call.apply("/backgrounds", b(new JSONObject().put("data", RemoteCore.enc(jpg)).toString()));
        assertEquals("too_many", call.apply("/backgrounds", b(new JSONObject().put("data", RemoteCore.enc(jpg)).toString())).getJSONObject("body").getString("error"));
        // الحذف بمعرّف صالح فقط
        assertEquals(400, call.apply("/backgrounds/delete", b("{\"id\":\"../x\"}")).getInt("status"));
        assertTrue(call.apply("/backgrounds/delete", b("{\"id\":\"b0\"}")).getJSONObject("body").getBoolean("ok"));
        // دون توقيع: مرفوض
        assertEquals(401, core.handle("POST", "/backgrounds", new HashMap<>(), b("{}"), ap, t[0] + 5000).getInt("status"));
        // المشهد «صوري» مقبول، ولا يدخل قائمة التنقل
        assertEquals(200, call.apply("/settings", b("{\"scene\":\"photos\"}")).getInt("status"));
        assertEquals(400, call.apply("/settings", b("{\"playlist\":[\"photos\"]}")).getInt("status"));
    }

    @Test public void uploadBodyLimitOnlyForBackgrounds() throws Exception {
        String big = "x".repeat(200_000);
        String up = "POST /backgrounds HTTP/1.1\r\nContent-Length: " + big.length() + "\r\n\r\n" + big;
        assertNotNull(RemoteHttp.read(new ByteArrayInputStream(b(up))));
        String other = "POST /settings HTTP/1.1\r\nContent-Length: " + big.length() + "\r\n\r\n" + big;
        assertNull(RemoteHttp.read(new ByteArrayInputStream(b(other))));
    }

    @Test public void wrongCodeAndClosedWindow() throws Exception {
        RemoteCore core = new RemoteCore(new MemStore(), new SecureRandom(), "TV");
        assertNull("بلا نافذة ربط", pairOrNull(core, "000000", NOW));
        String code = core.startPairing(NOW);
        String wrong = code.equals("111111") ? "222222" : "111111";
        for (int i = 0; i < RemoteCore.MAX_ATTEMPTS; i++) assertNull(pairOrNull(core, wrong, NOW + 1));
        assertFalse("خمس محاولات خاطئة تغلق الربط", core.pairingOpen(NOW + 2));
        assertNull("حتى الرمز الصحيح بعد الإغلاق", pairOrNull(core, code, NOW + 3));
        String code2 = core.startPairing(NOW);
        assertNull("انتهت المدة", pairOrNull(core, code2, NOW + RemoteCore.PAIR_WINDOW_MS + 1));
    }

    private static String[] pairOrNull(RemoteCore core, String code, long now) throws Exception {
        try { return pair(core, code, now); } catch (AssertionError e) { return null; }
    }

    @Test public void protectedRoutesNeedSignatureAndInfoIsOpen() throws Exception {
        RemoteCore core = new RemoteCore(new MemStore(), new SecureRandom(), "TV");
        assertEquals(200, core.handle("GET", "/info", new HashMap<>(), new byte[0], new FakeApplier(), NOW).getInt("status"));
        assertEquals("rafiq-tv-new", core.handle("GET", "/info", new HashMap<>(), new byte[0], new FakeApplier(), NOW).getJSONObject("body").getString("app"));
        assertEquals(401, core.handle("GET", "/settings", new HashMap<>(), new byte[0], new FakeApplier(), NOW).getInt("status"));
        assertEquals(401, core.handle("POST", "/action", new HashMap<>(), b("{\"action\":\"stop_adhan\"}"), new FakeApplier(), NOW).getInt("status"));
    }

    @Test public void validationIsAWhitelist() throws Exception {
        JSONObject[] ok = RemoteCore.validate(new JSONObject("{\"scene\":\"galaxy\",\"playlist\":[\"aurora\",\"forest\"],\"quality\":\"eco\",\"shuffle\":false,\"reciteVolume\":0.4,\"autostart\":true}"));
        assertEquals("galaxy", ok[0].getString("scene"));
        assertEquals(2, ok[0].getJSONArray("playlist").length());
        assertTrue(ok[1].getBoolean("autostart"));
        String[] bad = { "{\"scene\":\"x\"}", "{\"rotateMin\":7}", "{\"rotateMin\":\"10\"}", "{\"idleMinutes\":2}", "{\"reciteVolume\":3}", "{\"playlist\":[\"rotate\"]}", "{\"unknown\":1}", "{\"adhan\":\"yes\"}", "{\"clockShift\":30}" };
        for (String s : bad) {
            try { RemoteCore.validate(new JSONObject(s)); throw new AssertionError("قُبل: " + s); } catch (IllegalArgumentException expected) { /* مرفوض */ }
        }
        JSONObject[] rec = RemoteCore.validate(new JSONObject("{\"reciteMode\":\"adhkar\",\"reciterId\":\"minshawi-mujawwad\",\"adhkarVoice\":\"human\"}"));
        assertEquals("minshawi-mujawwad", rec[0].getString("reciterId"));
        for (String s : new String[] { "{\"reciteMode\":\"song\"}", "{\"reciterId\":\"../x\"}", "{\"adhkarVoice\":\"robot\"}" }) {
            try { RemoteCore.validate(new JSONObject(s)); throw new AssertionError("قُبل: " + s); } catch (IllegalArgumentException expected) { /* مرفوض */ }
        }
        // أزرار جهاز التحكم من الجوال ضمن الأوامر المسموحة فقط
        java.util.List<String> acts = java.util.Arrays.asList(RemoteCore.ACTIONS);
        assertTrue(acts.contains("key_ok") && acts.contains("key_back") && acts.contains("vol_up"));
        assertFalse(acts.contains("key_home"));
        assertEquals("جوال", RemoteCore.cleanName("  <\u0001>  "));
        assertEquals(40, RemoteCore.cleanName(new String(new char[60]).replace('\0', 'a')).length());
        assertNotNull(new JSONArray());
    }

    @Test public void httpParsing() throws Exception {
        String raw = "POST /settings?x=1 HTTP/1.1\r\nHost: tv\r\nX-Rafiq-Device: abc\r\nContent-Length: 5\r\n\r\nhello";
        RemoteHttp.Request r = RemoteHttp.read(new ByteArrayInputStream(b(raw)));
        assertEquals("POST", r.method);
        assertEquals("/settings", r.path);
        assertEquals("abc", r.headers.get("x-rafiq-device"));
        assertEquals("hello", new String(r.body, StandardCharsets.UTF_8));
        assertNull(RemoteHttp.read(new ByteArrayInputStream(b("GET / HTTP/1.1\r\nContent-Length: 999999\r\n\r\n"))));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        RemoteHttp.write(out, 200, "{\"ok\":true}");
        assertTrue(out.toString("UTF-8").startsWith("HTTP/1.1 200 OK"));
        assertTrue(out.toString("UTF-8").endsWith("{\"ok\":true}"));
    }
}
