package org.rafiqalmuslim.tv;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * «التحكم من الجوال» — منطق الربط والتحقق والإعدادات (Java نقي بلا Android حتى يُختبر: RemoteCoreTest).
 *
 * الربط: يعرض التلفاز رمزًا من 6 أرقام. الرمز لا يُرسل في الشبكة أبدًا:
 *   1) الهاتف ← /pair/start {name, pn}      التلفاز → {tn}
 *   2) المفتاح K = SHA-256(code|pn|tn) عند الطرفين
 *   3) الهاتف ← /pair/finish {pn, tn, proof=HMAC(K,"pair|"+name)}   التلفاز → AES-GCM(K, {token, deviceId, tvId, tvName})
 * كل طلب بعدها موقّع: HMAC(token, METHOD\nPATH\nTIME\nSHA256(body)) مع وقت لا يتكرر ولا يتأخر أكثر من دقيقتين.
 */
final class RemoteCore {
    static final long PAIR_WINDOW_MS = 3 * 60_000L;
    static final int MAX_ATTEMPTS = 5;
    static final long MAX_SKEW_MS = 120_000L;
    static final int MAX_DEVICES = 8;

    /** تخزين دائم (SharedPreferences في التطبيق، وذاكرة في الاختبار) */
    interface Store {
        String get(String key);
        void put(String key, String value);
    }

    /** ما يطبّقه التلفاز فعليًا (في التطبيق: إعدادات الخدمة + طابور لإعدادات الشاشة) */
    /** هوية تطبيق الشاشة: النسخة الجديدة لا تُربط بجوال النسخة الأصلية والعكس */
    static final String EDITION_APP = "rafiq-tv-new";
    /** اسم ملف تحديث الشاشة في إصدارات النسخة الجديدة */
    static final String UPDATE_ASSET = "RafiqAlMuslimTVNew.apk";

    interface Applier {
        /** إعدادات الشاشة الحالية (JSON) */
        JSONObject snapshot();
        void applyScreen(JSONObject patch);
        void applyNative(JSONObject patch);
        boolean action(String name);
        /** خلفيات المستخدم: القائمة، والإضافة (المعرّف أو «!رمز الخطأ»)، والحذف */
        JSONArray backgrounds();
        String addBackground(byte[] image);
        boolean removeBackground(String id);
        /** رقم إصدار تطبيق الشاشة وحالة التحديث */
        JSONObject version();
        /** يبدأ تنزيل التحديث وتثبيته: "started" أو "!رمز الخطأ" */
        String startUpdate(String url);
    }

    /** روابط التحديث المسموحة: ملف تطبيق الشاشة من إصدارات المشروع على GitHub فقط */
    static boolean validUpdateUrl(String u) {
        return u != null && u.matches("https://github\\.com/HAMADAKHM/rafiq-almuslim/releases/download/[A-Za-z0-9][A-Za-z0-9._-]{0,79}/RafiqAlMuslimTVNew\\.apk");
    }

    private final Store store;
    private final SecureRandom random;
    private final String tvName;
    private String code;
    private long codeUntil;
    private int attempts;
    private final Map<String, String> pending = new HashMap<>();

    RemoteCore(Store store, SecureRandom random, String tvName) {
        this.store = store;
        this.random = random;
        this.tvName = tvName;
    }

    // ---------- الربط ----------
    /** يبدأ نافذة الربط ويعيد الرمز الظاهر على الشاشة */
    synchronized String startPairing(long now) {
        code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        codeUntil = now + PAIR_WINDOW_MS;
        attempts = 0;
        pending.clear();
        return code;
    }

    synchronized void stopPairing() { code = null; codeUntil = 0; pending.clear(); }

    synchronized boolean pairingOpen(long now) { return code != null && now < codeUntil; }

    synchronized String currentCode(long now) { return pairingOpen(now) ? code : null; }

    synchronized long pairingUntil() { return codeUntil; }

    synchronized JSONObject pairStart(JSONObject req, long now) throws Exception {
        if (!pairingOpen(now)) return error(403, "pairing_closed");
        String pn = req.optString("pn", "");
        if (b64(pn).length != 16) return error(400, "bad_nonce");
        byte[] tn = new byte[16];
        random.nextBytes(tn);
        String tns = enc(tn);
        pending.put(pn, tns);
        return new JSONObject().put("tn", tns).put("tvName", tvName);
    }

    synchronized JSONObject pairFinish(JSONObject req, long now) throws Exception {
        if (!pairingOpen(now)) return error(403, "pairing_closed");
        String pn = req.optString("pn", ""), tn = req.optString("tn", ""), name = cleanName(req.optString("name", "جوال"));
        if (!tn.equals(pending.get(pn))) return error(400, "unknown_session");
        byte[] key = pairKey(code, pn, tn);
        byte[] expect = hmac(key, ("pair|" + name).getBytes(StandardCharsets.UTF_8));
        if (!MessageDigest.isEqual(expect, b64(req.optString("proof", "")))) {
            attempts++;
            // محاولات خاطئة كثيرة: يُغلق الربط ويلزم رمز جديد من التلفاز
            if (attempts >= MAX_ATTEMPTS) stopPairing();
            return error(401, "wrong_code");
        }
        byte[] token = new byte[32];
        random.nextBytes(token);
        String deviceId = Long.toHexString(random.nextLong() & Long.MAX_VALUE);
        JSONObject devices = devices();
        // أقدم جهاز يُزال إن امتلأت القائمة
        while (devices.length() >= MAX_DEVICES) devices.remove(oldest(devices));
        devices.put(deviceId, new JSONObject().put("name", name).put("token", enc(token)).put("at", now).put("last", 0));
        store.put("remote_devices", devices.toString());
        stopPairing();
        JSONObject secret = new JSONObject().put("token", enc(token)).put("deviceId", deviceId).put("tvId", tvId()).put("tvName", tvName);
        byte[] iv = new byte[12];
        random.nextBytes(iv);
        return new JSONObject().put("iv", enc(iv)).put("ct", enc(aesGcm(key, iv, secret.toString().getBytes(StandardCharsets.UTF_8))));
    }

    // ---------- الطلبات الموقّعة ----------
    /** يعيد معرّف الجهاز إن صح التوقيع، وإلا null */
    synchronized String verify(String method, String path, String device, String time, String sig, byte[] body, long now) throws Exception {
        if (device == null || time == null || sig == null) return null;
        JSONObject devices = devices();
        JSONObject d = devices.optJSONObject(device);
        if (d == null) return null;
        long t;
        try { t = Long.parseLong(time); } catch (NumberFormatException e) { return null; }
        if (Math.abs(now - t) > MAX_SKEW_MS) return null;
        if (t <= d.optLong("last", 0)) return null; // إعادة إرسال طلب قديم
        byte[] expect = hmac(b64(d.getString("token")), signingString(method, path, time, body));
        if (!MessageDigest.isEqual(expect, b64(sig))) return null;
        d.put("last", t);
        d.put("seen", now);
        store.put("remote_devices", devices.toString());
        return device;
    }

    static byte[] signingString(String method, String path, String time, byte[] body) throws Exception {
        return (method.toUpperCase(Locale.ROOT) + "\n" + path + "\n" + time + "\n" + hex(sha256(body == null ? new byte[0] : body))).getBytes(StandardCharsets.UTF_8);
    }

    synchronized JSONArray deviceList() throws Exception {
        JSONArray out = new JSONArray();
        JSONObject devices = devices();
        for (Iterator<String> it = devices.keys(); it.hasNext(); ) {
            String id = it.next();
            JSONObject d = devices.getJSONObject(id);
            out.put(new JSONObject().put("id", id).put("name", d.optString("name")).put("at", d.optLong("at")).put("seen", d.optLong("seen")));
        }
        return out;
    }

    synchronized void removeDevice(String id) {
        JSONObject devices = devices();
        devices.remove(id);
        store.put("remote_devices", devices.toString());
    }

    // ---------- الإعدادات: قائمة بيضاء بالقيم المسموحة فقط ----------
    static final String[] SCENES = { "rotate", "classic", "photos", "night-mosque", "ocean-sunset", "desert", "aurora", "rain-window", "galaxy", "geometry", "forest" };

    /** يقسم الطلب إلى إعدادات الشاشة وإعدادات الخدمة بعد التحقق؛ أي قيمة غير صالحة ترفض الطلب كله */
    static JSONObject[] validate(JSONObject in) throws Exception {
        JSONObject screen = new JSONObject(), nat = new JSONObject();
        for (Iterator<String> it = in.keys(); it.hasNext(); ) {
            String k = it.next();
            Object v = in.get(k);
            switch (k) {
                case "scene":
                    if (!(v instanceof String) || !oneOf((String) v, SCENES)) throw new IllegalArgumentException(k);
                    screen.put(k, v); break;
                case "playlist": {
                    if (!(v instanceof JSONArray)) throw new IllegalArgumentException(k);
                    JSONArray a = (JSONArray) v, ok = new JSONArray();
                    if (a.length() > SCENES.length) throw new IllegalArgumentException(k);
                    for (int i = 0; i < a.length(); i++) {
                        String s = a.optString(i, "");
                        if (!oneOf(s, SCENES) || s.equals("rotate") || s.equals("classic") || s.equals("photos")) throw new IllegalArgumentException(k);
                        ok.put(s);
                    }
                    screen.put(k, ok); break;
                }
                case "rotateMin": screen.put(k, intIn(v, k, 5, 60, new int[] { 5, 10, 20, 30, 60 })); break;
                case "quality":
                    if (!(v instanceof String) || !oneOf((String) v, new String[] { "auto", "eco", "high" })) throw new IllegalArgumentException(k);
                    screen.put(k, v); break;
                case "shuffle": case "animate": case "adhan": case "hour12": case "reciteOn":
                    if (!(v instanceof Boolean)) throw new IllegalArgumentException(k);
                    screen.put(k, v); break;
                case "reciteVolume": {
                    if (!(v instanceof Number)) throw new IllegalArgumentException(k);
                    double d = ((Number) v).doubleValue();
                    if (d < 0 || d > 1) throw new IllegalArgumentException(k);
                    screen.put(k, d); break;
                }
                case "clockShift": screen.put(k, intIn(v, k, -60, 60, new int[] { -60, 0, 60 })); break;
                case "idleMinutes": nat.put(k, intIn(v, k, 0, 30, new int[] { 0, 5, 10, 15, 30 })); break;
                case "idleTakeover": case "autostart":
                    if (!(v instanceof Boolean)) throw new IllegalArgumentException(k);
                    nat.put(k, v); break;
                default: throw new IllegalArgumentException(k);
            }
        }
        return new JSONObject[] { screen, nat };
    }

    private static int intIn(Object v, String k, int min, int max, int[] allowed) {
        if (!(v instanceof Number)) throw new IllegalArgumentException(k);
        double d = ((Number) v).doubleValue();
        int i = (int) d;
        if (i != d || i < min || i > max) throw new IllegalArgumentException(k);
        for (int a : allowed) if (a == i) return i;
        throw new IllegalArgumentException(k);
    }

    private static boolean oneOf(String s, String[] list) {
        for (String x : list) if (x.equals(s)) return true;
        return false;
    }

    // ---------- خلفيات المستخدم ----------
    static final int MAX_BACKGROUNDS = 12;
    /** حد الصورة بعد فك Base64 (الجوال يصغّرها إلى 1920 بكسل قبل الإرسال) */
    static final int MAX_IMAGE_BYTES = 2_500_000;

    /** نوع الصورة من أول بايتاتها: JPEG أو PNG فقط */
    static String imageKind(byte[] b) {
        if (b == null || b.length < 8) return null;
        if ((b[0] & 255) == 0xFF && (b[1] & 255) == 0xD8 && (b[2] & 255) == 0xFF) return "jpg";
        if ((b[0] & 255) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "png";
        return null;
    }

    static boolean validBackgroundId(String id) { return id != null && id.matches("[a-z0-9]{1,24}"); }

    // ---------- معالجة الطلبات ----------
    /** يعيد {status, body}؛ المسارات غير المحمية: /info و/pair/* */
    JSONObject handle(String method, String path, Map<String, String> headers, byte[] body, Applier applier, long now) {
        try {
            if (method.equals("GET") && path.equals("/info")) {
                return ok(new JSONObject().put("app", EDITION_APP).put("tvId", tvId()).put("name", tvName).put("pairing", pairingOpen(now)).put("v", 1).put("version", applier.version()));
            }
            if (method.equals("POST") && path.equals("/pair/start")) return wrap(pairStart(json(body), now));
            if (method.equals("POST") && path.equals("/pair/finish")) return wrap(pairFinish(json(body), now));
            String dev = verify(method, path, headers.get("x-rafiq-device"), headers.get("x-rafiq-time"), headers.get("x-rafiq-sig"), body, now);
            if (dev == null) return status(401, error(401, "unauthorized"));
            if (method.equals("GET") && path.equals("/settings")) return ok(new JSONObject().put("settings", applier.snapshot()));
            if (method.equals("POST") && path.equals("/settings")) {
                JSONObject[] parts;
                try { parts = validate(json(body)); } catch (IllegalArgumentException e) { return status(400, error(400, "invalid:" + e.getMessage())); }
                if (parts[0].length() > 0) applier.applyScreen(parts[0]);
                if (parts[1].length() > 0) applier.applyNative(parts[1]);
                return ok(new JSONObject().put("ok", true).put("settings", applier.snapshot()));
            }
            if (method.equals("POST") && path.equals("/action")) {
                String a = json(body).optString("action", "");
                if (!oneOf(a, new String[] { "stop_adhan", "open_screen", "next_scene" })) return status(400, error(400, "invalid_action"));
                return ok(new JSONObject().put("ok", applier.action(a)));
            }
            if (method.equals("GET") && path.equals("/backgrounds")) return ok(new JSONObject().put("items", applier.backgrounds()).put("max", MAX_BACKGROUNDS));
            if (method.equals("POST") && path.equals("/backgrounds")) {
                byte[] img = b64(json(body).optString("data", ""));
                if (img.length == 0 || img.length > MAX_IMAGE_BYTES) return status(400, error(400, img.length == 0 ? "bad_image" : "too_large"));
                if (imageKind(img) == null) return status(400, error(400, "bad_image"));
                String id = applier.addBackground(img);
                if (id.startsWith("!")) return status(400, error(400, id.substring(1)));
                return ok(new JSONObject().put("ok", true).put("id", id).put("items", applier.backgrounds()));
            }
            if (method.equals("POST") && path.equals("/backgrounds/delete")) {
                String id = json(body).optString("id", "");
                if (!validBackgroundId(id)) return status(400, error(400, "bad_id"));
                return ok(new JSONObject().put("ok", applier.removeBackground(id)).put("items", applier.backgrounds()));
            }
            if (method.equals("POST") && path.equals("/update")) {
                String url = json(body).optString("url", "");
                if (!validUpdateUrl(url)) return status(400, error(400, "bad_url"));
                String r = applier.startUpdate(url);
                if (r.startsWith("!")) return status(409, error(409, r.substring(1)));
                return ok(new JSONObject().put("ok", true).put("version", applier.version()));
            }
            if (method.equals("POST") && path.equals("/unpair")) { removeDevice(dev); return ok(new JSONObject().put("ok", true)); }
            return status(404, error(404, "not_found"));
        } catch (Exception e) {
            return status(500, new JSONObject());
        }
    }

    private static JSONObject wrap(JSONObject r) throws Exception {
        int st = r.optInt("_status", 200);
        r.remove("_status");
        return status(st, r);
    }

    private static JSONObject ok(JSONObject body) { return status(200, body); }

    private static JSONObject status(int st, JSONObject body) {
        try { return new JSONObject().put("status", st).put("body", body); } catch (Exception e) { return new JSONObject(); }
    }

    private static JSONObject error(int st, String msg) throws Exception { return new JSONObject().put("_status", st).put("error", msg); }

    private static JSONObject json(byte[] body) throws Exception {
        String s = new String(body == null ? new byte[0] : body, StandardCharsets.UTF_8).trim();
        return s.isEmpty() ? new JSONObject() : new JSONObject(s);
    }

    // ---------- مساعدات ----------
    private JSONObject devices() {
        try { String s = store.get("remote_devices"); return s == null ? new JSONObject() : new JSONObject(s); } catch (Exception e) { return new JSONObject(); }
    }

    private static String oldest(JSONObject devices) {
        String best = null;
        long t = Long.MAX_VALUE;
        for (Iterator<String> it = devices.keys(); it.hasNext(); ) {
            String id = it.next();
            long at = devices.optJSONObject(id).optLong("at", 0);
            if (at < t) { t = at; best = id; }
        }
        return best;
    }

    synchronized String tvId() {
        String id = store.get("remote_tv_id");
        if (id == null) { id = Long.toHexString(random.nextLong() & Long.MAX_VALUE); store.put("remote_tv_id", id); }
        return id;
    }

    static String cleanName(String n) {
        String s = n.replaceAll("[\\p{Cntrl}<>]", "").trim();
        if (s.isEmpty()) s = "جوال";
        return s.length() > 40 ? s.substring(0, 40) : s;
    }

    static byte[] pairKey(String code, String pn, String tn) throws Exception {
        return sha256((code + "|" + pn + "|" + tn).getBytes(StandardCharsets.UTF_8));
    }

    static byte[] sha256(byte[] b) throws Exception { return MessageDigest.getInstance("SHA-256").digest(b); }

    static byte[] hmac(byte[] key, byte[] msg) throws Exception {
        Mac m = Mac.getInstance("HmacSHA256");
        m.init(new SecretKeySpec(key, "HmacSHA256"));
        return m.doFinal(msg);
    }

    /** AES-GCM بوسم 128 بت: الناتج نص مشفّر يتبعه الوسم (كما تتوقعه WebCrypto) */
    static byte[] aesGcm(byte[] key, byte[] iv, byte[] plain) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        return c.doFinal(plain);
    }

    // Base64 بلا مكتبات (java.util.Base64 غير موجود قبل Android 8، والتطبيق يدعم Android 5)
    private static final char[] B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".toCharArray();

    static String enc(byte[] b) {
        StringBuilder sb = new StringBuilder((b.length + 2) / 3 * 4);
        for (int i = 0; i < b.length; i += 3) {
            int n = (b[i] & 255) << 16 | (i + 1 < b.length ? (b[i + 1] & 255) << 8 : 0) | (i + 2 < b.length ? b[i + 2] & 255 : 0);
            sb.append(B64[n >> 18 & 63]).append(B64[n >> 12 & 63]).append(i + 1 < b.length ? B64[n >> 6 & 63] : '=').append(i + 2 < b.length ? B64[n & 63] : '=');
        }
        return sb.toString();
    }

    static byte[] b64(String s) {
        if (s == null) return new byte[0];
        String t = s.trim();
        if (t.length() % 4 != 0) return new byte[0];
        int pad = t.endsWith("==") ? 2 : t.endsWith("=") ? 1 : 0;
        byte[] out = new byte[t.length() / 4 * 3 - pad];
        int o = 0;
        for (int i = 0; i < t.length(); i += 4) {
            int n = 0;
            for (int j = 0; j < 4; j++) {
                char c = t.charAt(i + j);
                int v = c == '=' ? 0 : c >= 'A' && c <= 'Z' ? c - 'A' : c >= 'a' && c <= 'z' ? c - 'a' + 26 : c >= '0' && c <= '9' ? c - '0' + 52 : c == '+' ? 62 : c == '/' ? 63 : -1;
                if (v < 0) return new byte[0];
                n = n << 6 | v;
            }
            if (o < out.length) out[o++] = (byte) (n >> 16);
            if (o < out.length) out[o++] = (byte) (n >> 8);
            if (o < out.length) out[o++] = (byte) n;
        }
        return out;
    }

    static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format(Locale.ROOT, "%02x", x));
        return sb.toString();
    }
}
