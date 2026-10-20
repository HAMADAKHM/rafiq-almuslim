package org.rafiqalmuslim.app;

import android.content.Context;
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
}
