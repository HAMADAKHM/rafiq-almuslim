package org.rafiqalmuslim.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * أيقونة التطبيق في الشاشة الرئيسية (رفيق بلس): لكل أيقونة مكوّن activity-alias في AndroidManifest،
 * يُفعَّل واحد فقط ويُعطَّل الباقي. الاشتراك يُتحقق منه في الواجهة قبل الاستدعاء، وعند انتهائه تعود الأصلية.
 * بعض الشاشات الرئيسية تحدّث الأيقونة بعد ثوانٍ، أو تنقلها من مكانها.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    static final String[] IDS = { "default", "royal", "night", "turquoise", "dawn", "nature", "violet", "rose", "evening" };

    private ComponentName comp(String id) {
        String n = id.equals("default") ? "LauncherDefault" : "Launcher" + Character.toUpperCase(id.charAt(0)) + id.substring(1);
        return new ComponentName(getContext(), getContext().getPackageName() + "." + n);
    }

    private boolean enabled(PackageManager pm, String id) {
        int st = pm.getComponentEnabledSetting(comp(id));
        // الحالة الافتراضية من الملف: الأصلية مفعّلة والباقي معطّل
        return st == PackageManager.COMPONENT_ENABLED_STATE_ENABLED || (st == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && id.equals("default"));
    }

    @PluginMethod
    public void get(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        String cur = "default";
        for (String id : IDS) if (!id.equals("default") && enabled(pm, id)) { cur = id; break; }
        JSObject r = new JSObject();
        r.put("id", cur);
        call.resolve(r);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String want = call.getString("id", "default");
        boolean known = false;
        for (String id : IDS) if (id.equals(want)) known = true;
        if (!known) { call.reject("unknown icon"); return; }
        try {
            Context ctx = getContext();
            PackageManager pm = ctx.getPackageManager();
            // تفعيل الجديدة أولًا ثم تعطيل الباقي: لا تبقى الشاشة الرئيسية بلا أيقونة للتطبيق
            pm.setComponentEnabledSetting(comp(want), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            for (String id : IDS) {
                if (id.equals(want)) continue;
                pm.setComponentEnabledSetting(comp(id), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
            JSObject r = new JSObject();
            r.put("id", want);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("failed: " + e.getMessage());
        }
    }
}
