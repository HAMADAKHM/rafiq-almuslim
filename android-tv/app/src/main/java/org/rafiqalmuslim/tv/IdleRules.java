package org.rafiqalmuslim.tv;

/**
 * قرار فتح شاشة المواقيت بعد عدم الاستخدام — منطق نقي بلا Android حتى يُختبر (IdleRulesTest).
 * يعيد null إذا حان الفتح، وإلا سبب عدم الفتح (يُسجَّل في سجل التشخيص).
 */
final class IdleRules {
    private IdleRules() {}

    static final class Input {
        long now;
        /** آخر ضغطة زر (من خدمة الإتاحة)، أو 0 */
        long lastKeyAt;
        /** آخر نشاط معروف: ترك الشاشة، أو صوت يعمل، أو استيقاظ التلفاز */
        long lastActiveAt;
        boolean accessibility;
        /** وضع «عدم الاستخدام = لا صوت ولا فيديو» حين لا توجد خدمة الإتاحة */
        boolean quietMode;
        /** يُسمح بفتح شاشة من الخلفية (Android < 10، أو إذن الظهور فوق التطبيقات، أو خدمة الإتاحة) */
        boolean canOpen;
        boolean screenVisible;
        boolean adhanActive;
        boolean takeoverEnabled;
        long snoozeUntil;
        int minutes;
        /** صوت أو فيديو يعمل الآن (يوتيوب، قناة…) */
        boolean mediaActive;
        /** التطبيق الظاهر هو مدخل HDMI/القنوات (معروف فقط مع خدمة الإتاحة) */
        boolean externalForeground;
    }

    static String decide(Input in) {
        if (!in.takeoverEnabled) return "disabled";
        if (in.minutes <= 0) return "disabled";
        if (in.screenVisible) return "screen_visible";
        if (in.adhanActive) return "adhan";
        if (in.mediaActive) return "media_active";
        if (in.externalForeground) return "hdmi_foreground";
        if (in.now < in.snoozeUntil) return "snoozed";
        long since;
        if (in.accessibility) since = Math.max(in.lastKeyAt, in.lastActiveAt);
        else if (!in.quietMode) return "needs_accessibility";
        else if (!in.canOpen) return "needs_overlay_permission";
        else since = in.lastActiveAt;
        if (in.now - since < in.minutes * 60_000L) return "waiting";
        return null;
    }

    /** أسماء حزم تطبيقات القنوات ومداخل HDMI الشائعة في أجهزة Android TV / Google TV */
    static boolean isTvInputPackage(String pkg) {
        if (pkg == null) return false;
        String p = pkg.toLowerCase(java.util.Locale.ROOT);
        return p.equals("com.android.tv") || p.equals("com.google.android.tv") || p.startsWith("com.google.android.tv.")
            || p.contains("tvinput") || p.contains("livetv") || p.contains("tvcenter") || p.contains("tvplayer")
            || p.contains(".hdmi") || p.contains("inputsource") || p.equals("com.tcl.tv") || p.startsWith("com.mediatek.wwtv")
            || p.startsWith("com.sony.dtv.tvx") || p.startsWith("com.xiaomi.mitv.tvplayer") || p.startsWith("com.hisense.tv");
    }
}
