package org.rafiqalmuslim.tv;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** خادم HTTP صغير جدًا للشبكة المنزلية (طلب واحد لكل اتصال، جسم حتى 64 ك.ب) — Java نقي قابل للاختبار */
final class RemoteHttp {
    static final int MAX_BODY = 64 * 1024;
    private static final int MAX_LINE = 4096;

    static final class Request {
        String method;
        String path;
        final Map<String, String> headers = new HashMap<>();
        byte[] body = new byte[0];
    }

    private static String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            if (c != '\r') b.write(c);
            if (b.size() > MAX_LINE) throw new IOException("line too long");
        }
        if (c == -1 && b.size() == 0) return null;
        return new String(b.toByteArray(), StandardCharsets.UTF_8);
    }

    /** يقرأ الطلب أو يعيد null إن كان غير صالح */
    static Request read(InputStream in) throws IOException {
        String first = readLine(in);
        if (first == null) return null;
        String[] parts = first.split(" ");
        if (parts.length < 2) return null;
        Request r = new Request();
        r.method = parts[0].toUpperCase(Locale.ROOT);
        String p = parts[1];
        int q = p.indexOf('?');
        r.path = q >= 0 ? p.substring(0, q) : p;
        String line;
        int count = 0;
        while ((line = readLine(in)) != null && !line.isEmpty()) {
            if (++count > 50) return null;
            int i = line.indexOf(':');
            if (i > 0) r.headers.put(line.substring(0, i).trim().toLowerCase(Locale.ROOT), line.substring(i + 1).trim());
        }
        int len = 0;
        String cl = r.headers.get("content-length");
        try { len = cl == null ? 0 : Integer.parseInt(cl); } catch (NumberFormatException e) { return null; }
        if (len < 0 || len > MAX_BODY) return null;
        byte[] body = new byte[len];
        int got = 0;
        while (got < len) {
            int n = in.read(body, got, len - got);
            if (n < 0) return null;
            got += n;
        }
        r.body = body;
        return r;
    }

    static void write(OutputStream out, int status, String json) throws IOException {
        byte[] b = json.getBytes(StandardCharsets.UTF_8);
        String reason = status == 200 ? "OK" : status == 400 ? "Bad Request" : status == 401 ? "Unauthorized" : status == 403 ? "Forbidden" : status == 404 ? "Not Found" : "Error";
        String head = "HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: " + b.length + "\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.UTF_8));
        out.write(b);
        out.flush();
    }
}
