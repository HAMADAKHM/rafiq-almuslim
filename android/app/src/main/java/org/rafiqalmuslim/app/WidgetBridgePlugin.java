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
    @PluginMethod
    public void consumeRoute(PluginCall call) {
        String r = MainActivity.takeRoute();
        JSObject o = new JSObject();
        o.put("route", r);
        call.resolve(o);
    }
}
