package org.rafiqalmuslim.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * يحوّل نص الذكر (من المكتبة الموثقة كما هو) إلى ملف صوتي بمحرك الكلام العربي في الهاتف،
 * ليكون صوت إشعار الذكر حين يختار المستخدم «صوت الهاتف». لا شيء يُرسل خارج الجهاز.
 */
@CapacitorPlugin(name = "Narration")
public class NarrationPlugin extends Plugin {
    private TextToSpeech tts;
    /** 0 تجهيز، 1 جاهز، -1 لا يوجد صوت عربي */
    private volatile int state = 0;
    private final Map<String, PluginCall> pending = new HashMap<>();
    private final Map<String, File> files = new HashMap<>();
    private final Handler main = new Handler(Looper.getMainLooper());
    private int seq = 0;

    @Override
    public void load() {
        try {
            tts = new TextToSpeech(getContext(), status -> {
                if (status != TextToSpeech.SUCCESS) { state = -1; return; }
                int r = tts.setLanguage(new Locale("ar"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) { state = -1; return; }
                try {
                    Voice best = null;
                    for (Voice v : tts.getVoices()) {
                        if (!"ar".equals(v.getLocale().getLanguage())) continue;
                        if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                        if (best == null || v.getQuality() > best.getQuality() || (v.getQuality() == best.getQuality() && best.isNetworkConnectionRequired() && !v.isNetworkConnectionRequired())) best = v;
                    }
                    if (best != null) tts.setVoice(best);
                } catch (Exception ignored) { /* الصوت الافتراضي */ }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { main.post(() -> finish(id, true)); }
                    @Override @SuppressWarnings("deprecation") public void onError(String id) { main.post(() -> finish(id, false)); }
                });
                state = 1;
            });
        } catch (Exception e) { state = -1; }
    }

    private void finish(String id, boolean ok) {
        PluginCall call = pending.remove(id);
        File f = files.remove(id);
        if (call == null) return;
        if (!ok || f == null || !f.exists()) { call.reject("تعذر تحويل النص إلى صوت"); return; }
        try {
            byte[] bytes = new byte[(int) f.length()];
            try (FileInputStream in = new FileInputStream(f)) { int off = 0; while (off < bytes.length) { int n = in.read(bytes, off, bytes.length - off); if (n < 0) break; off += n; } }
            JSObject res = new JSObject();
            res.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(res);
        } catch (Exception e) {
            call.reject("تعذر قراءة الملف الصوتي");
        } finally {
            f.delete();
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("state", state == 1 ? "ok" : state == 0 ? "init" : "missing");
        call.resolve(r);
    }

    /** {text, rate} → {data: base64 WAV} */
    @PluginMethod
    public void synthesize(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.trim().isEmpty()) { call.reject("النص فارغ"); return; }
        if (state == -1) { call.reject("لا يوجد صوت عربي في الهاتف"); return; }
        if (state == 0) { main.postDelayed(() -> synthesize(call), 400); return; }
        float rate = call.getFloat("rate", 0.85f);
        String id = "n" + (++seq);
        File f = new File(getContext().getCacheDir(), id + ".wav");
        pending.put(id, call);
        files.put(id, f);
        tts.setSpeechRate(rate);
        int r = tts.synthesizeToFile(text, new Bundle(), f, id);
        if (r != TextToSpeech.SUCCESS) { pending.remove(id); files.remove(id); call.reject("تعذر تحويل النص إلى صوت"); }
    }

    @Override
    protected void handleOnDestroy() {
        try { if (tts != null) tts.shutdown(); } catch (Exception ignored) { /* لا شيء */ }
    }
}
