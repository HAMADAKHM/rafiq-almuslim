package org.rafiqalmuslim.app;

import android.app.Activity;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * ملء الشاشة لصفحة المصحف: يخفي شريط الحالة وشريط التنقل في الجوال أثناء القراءة،
 * ويظهران مؤقتًا بالسحب من حافة الشاشة، ويعودان عند الخروج من المصحف.
 */
@CapacitorPlugin(name = "Immersive")
public class ImmersivePlugin extends Plugin {
    private WindowInsetsControllerCompat ctl(Activity a) {
        Window w = a.getWindow();
        View d = w.getDecorView();
        return WindowCompat.getInsetsController(w, d);
    }

    @PluginMethod
    public void enter(PluginCall call) {
        Activity a = getActivity();
        if (a == null) { call.resolve(); return; }
        a.runOnUiThread(() -> {
            try {
                WindowInsetsControllerCompat c = ctl(a);
                c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                c.hide(WindowInsetsCompat.Type.systemBars());
            } catch (Exception ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void exit(PluginCall call) {
        Activity a = getActivity();
        if (a == null) { call.resolve(); return; }
        a.runOnUiThread(() -> {
            try { ctl(a).show(WindowInsetsCompat.Type.systemBars()); } catch (Exception ignored) {}
            call.resolve();
        });
    }
}
