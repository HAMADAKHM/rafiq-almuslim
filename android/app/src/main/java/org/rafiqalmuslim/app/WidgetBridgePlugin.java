package org.rafiqalmuslim.app;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** يستقبل من التطبيق مواقيت الأيام القادمة (JSON) ويحفظها للودجت ثم يحدّثه. */
@CapacitorPlugin(name = "PrayerWidget")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        Context ctx = getContext();
        ctx.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit().putString(PrayerWidgetProvider.KEY, data).apply();
        PrayerWidgetProvider.refreshAll(ctx);
        call.resolve();
    }

    /** بيانات ودجت «آية اليوم والورد» */
    @PluginMethod
    public void updateDaily(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        Context ctx = getContext();
        ctx.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit().putString(DailyWidgetProvider.KEY, data).apply();
        DailyWidgetProvider.refreshAll(ctx);
        call.resolve();
    }

    /** بيانات ودجتات رفيق بلس (الطقس والتقدّم) وحالة الاشتراك */
    @PluginMethod
    public void updatePlus(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        Context ctx = getContext();
        ctx.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit().putString(PlusWidgets.KEY, data).apply();
        PlusWidgets.refreshAll(ctx);
        call.resolve();
    }

    /** بيانات ودجت «أكمل من حيث وصلت» */
    @PluginMethod
    public void updateResume(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        Context ctx = getContext();
        ctx.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit().putString(ResumeWidgetProvider.KEY, data).apply();
        ResumeWidgetProvider.refreshAll(ctx);
        call.resolve();
    }

    /** المسار الذي طلبه الضغط على ودجت (يُقرأ مرة واحدة ثم يُمسح) */
    /** «تصميم الودجت»: خلفية كل الودجتات (يُستدعى بعد التحقق من اشتراك بلس، وبـ emerald عند انتهائه) */
    @PluginMethod
    public void setStyle(PluginCall call) {
        String style = call.getString("style", WidgetStyle.DEFAULT);
        if (style == null || !style.matches("[a-z][a-z-]{0,15}")) { call.reject("invalid"); return; }
        WidgetStyle.set(getContext(), style);
        call.resolve();
    }

    /** حالة اشتراك بلس (تتحقق منها الواجهة): لتفتح شاشة «إعداد الودجت» التصاميم الملوّنة */
    @PluginMethod
    public void setPlus(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).edit().putBoolean(WidgetStyle.KEY_PLUS, on).apply();
        WidgetStyle.refreshEverything(getContext());
        LockNotif.update(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getStyle(PluginCall call) {
        JSObject r = new JSObject();
        r.put("style", getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).getString(WidgetStyle.KEY, WidgetStyle.DEFAULT));
        r.put("shape", getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).getString(WidgetStyle.KEY_SHAPE, "round"));
        r.put("alpha", getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).getInt("alpha", 100));
        r.put("lock", getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).getBoolean(LockNotif.KEY, false));
        call.resolve(r);
    }

    /** شكل كل الودجتات: مستطيل، قبة، إطار مزخرف */
    @PluginMethod
    public void setShape(PluginCall call) {
        String shape = call.getString("shape", "round");
        if (!"round".equals(shape) && !"dome".equals(shape) && !"frame".equals(shape)) { call.reject("invalid"); return; }
        android.content.SharedPreferences p = getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor e = p.edit().putString(WidgetStyle.KEY_SHAPE, shape);
        for (String k : p.getAll().keySet()) if (k.startsWith("s_")) e.remove(k);
        e.apply();
        WidgetStyle.refreshEverything(getContext());
        call.resolve();
    }

    /** بيانات ودجتات الأذكار والدعاء و«الكل في واحد» (نصوص موثقة من التطبيق) */
    @PluginMethod
    public void updateExtra(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("missing data"); return; }
        getContext().getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE).edit().putString(WidgetKit.KEY_EXTRA, data).apply();
        AdhkarWidgetProvider.refreshAll(getContext());
        DuaWidgetProvider.refreshAll(getContext());
        AllInOneWidgetProvider.refreshAll(getContext());
        call.resolve();
    }

    /** إعدادات «استوديو الودجت»: العناصر الظاهرة وحجم الخط ونوع الأذكار والاهتزاز وذكر المسبحة */
    @PluginMethod
    public void setPrefs(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("missing data"); return; }
        getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE).edit().putString(WidgetKit.KEY_PREFS, data).apply();
        WidgetStyle.refreshEverything(getContext());
        call.resolve();
    }

    /** شفافية خلفية كل الودجتات (رفيق بلس) */
    @PluginMethod
    public void setAlpha(PluginCall call) {
        int a = Math.max(0, Math.min(100, call.getInt("alpha", 100)));
        android.content.SharedPreferences p = getContext().getSharedPreferences(WidgetStyle.PREFS, Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor e = p.edit().putInt("alpha", a);
        for (String k : p.getAll().keySet()) if (k.startsWith("a_")) e.remove(k);
        e.apply();
        WidgetStyle.refreshEverything(getContext());
        call.resolve();
    }

    /** المواقيت على شاشة القفل (رفيق بلس) */
    @PluginMethod
    public void setLockScreen(PluginCall call) {
        LockNotif.set(getContext(), Boolean.TRUE.equals(call.getBoolean("on", false)));
        call.resolve();
    }

    @PluginMethod
    public void consumeRoute(PluginCall call) {
        String r = MainActivity.takeRoute();
        JSObject o = new JSObject();
        o.put("route", r);
        call.resolve(o);
    }
}
