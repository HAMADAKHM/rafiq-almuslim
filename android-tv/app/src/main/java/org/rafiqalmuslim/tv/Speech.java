package org.rafiqalmuslim.tv;

import android.content.Context;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.util.Locale;

/**
 * قراءة نصوص الأذكار بصوت عربي من محرك «تحويل النص إلى كلام» في التلفاز (قراءة آلية للنص الموثق كما هو).
 * الآيات لا تُقرأ هنا: تُتلى بأصوات القرّاء. تُختار أوضح الأصوات العربية المتاحة، بسرعة هادئة.
 */
final class Speech {
    private final WebView web;
    private TextToSpeech tts;
    /** init | ok | missing */
    private volatile String state = "init";

    Speech(Context ctx, WebView web) {
        this.web = web;
        try {
            tts = new TextToSpeech(ctx, status -> {
                if (status != TextToSpeech.SUCCESS) { state = "missing"; return; }
                int r = tts.setLanguage(new Locale("ar"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) { state = "missing"; return; }
                pickVoice();
                tts.setSpeechRate(0.82f);
                tts.setPitch(0.95f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { done(id, true); }
                    @Override @SuppressWarnings("deprecation") public void onError(String id) { done(id, false); }
                });
                state = "ok";
            });
        } catch (Exception e) { state = "missing"; }
    }

    /** أفضل صوت عربي: جودة أعلى ويعمل دون إنترنت إن أمكن */
    private void pickVoice() {
        if (android.os.Build.VERSION.SDK_INT < 21) return;
        try {
            Voice best = null;
            for (Voice v : tts.getVoices()) {
                if (!"ar".equals(v.getLocale().getLanguage())) continue;
                if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                if (best == null || v.getQuality() > best.getQuality() || (v.getQuality() == best.getQuality() && best.isNetworkConnectionRequired() && !v.isNetworkConnectionRequired())) best = v;
            }
            if (best != null) tts.setVoice(best);
        } catch (Exception ignored) { /* الصوت الافتراضي */ }
    }

    private void done(String id, boolean ok) {
        final String js = "window.__rafiqVoiceDone&&window.__rafiqVoiceDone(" + JSONQuote(id) + "," + ok + ")";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    private static String JSONQuote(String s) { return org.json.JSONObject.quote(s); }

    @JavascriptInterface
    public String status() { return state; }

    @JavascriptInterface
    public boolean speak(String text, String id, float volume) {
        if (!"ok".equals(state)) return false;
        Bundle p = new Bundle();
        p.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, Math.max(0.1f, Math.min(1f, volume)));
        return tts.speak(text, TextToSpeech.QUEUE_FLUSH, p, id) == TextToSpeech.SUCCESS;
    }

    @JavascriptInterface
    public void stop() { try { if (tts != null) tts.stop(); } catch (Exception ignored) { /* لا شيء */ } }

    void shutdown() { try { if (tts != null) tts.shutdown(); } catch (Exception ignored) { /* لا شيء */ } }
}
