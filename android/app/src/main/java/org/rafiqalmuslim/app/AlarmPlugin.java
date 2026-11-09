package org.rafiqalmuslim.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

/** منبّه الصحوة من الواجهة: حفظ المنبهات وجدولتها، وحالة إذن المنبه الدقيق، وتجربة الرنين */
@CapacitorPlugin(name = "WakeAlarm")
public class AlarmPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        String data = call.getString("data", "[]");
        try { new JSONArray(data); } catch (Exception e) { call.reject("bad data"); return; }
        WakeAlarms.save(getContext(), data);
        status(call);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("exact", WakeAlarms.canExact(getContext()));
        long now = System.currentTimeMillis(), next = -1;
        JSONArray a = WakeAlarms.list(getContext());
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null || !o.optBoolean("on", true)) continue;
            long t = WakeAlarms.nextAt(o, now);
            if (t > 0 && (next < 0 || t < next)) next = t;
        }
        r.put("next", next);
        call.resolve(r);
    }

    @PluginMethod
    public void openExactSettings(PluginCall call) {
        try {
            Intent i;
            if (Build.VERSION.SDK_INT >= 31) i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
            else i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    /** يرنّ المنبه الآن للتجربة */
    @PluginMethod
    public void test(PluginCall call) {
        try {
            JSONObject o = new JSONObject(call.getString("alarm", "{}"));
            o.remove("id");
            AlarmService.start(getContext(), o);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        AlarmService.stop(getContext());
        call.resolve();
    }
}
