package org.rafiqalmuslim.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * موقع الجهاز من خدمة الموقع في Android نفسها (LocationManager) دون خدمات Google:
 * بديل حين يفشل فحص إعدادات Google (رسالة «خطأ في إعدادات الموقع» مع أن الموقع مفعّل)،
 * أو في الأجهزة بلا خدمات Google. يستعمل آخر موقع معروف حديث، وإلا يطلب قراءة واحدة.
 */
@CapacitorPlugin(name = "NativeLocation")
public class NativeLocationPlugin extends Plugin {

    private boolean granted() {
        Context c = getContext();
        return c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    /** هل خدمة الموقع مفعّلة في الجوال (أي مزوّد) */
    @PluginMethod
    public void status(PluginCall call) {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        boolean on = false;
        if (lm != null) {
            if (Build.VERSION.SDK_INT >= 28) on = lm.isLocationEnabled();
            else on = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        }
        JSObject r = new JSObject();
        r.put("enabled", on);
        r.put("granted", granted());
        call.resolve(r);
    }

    private static JSObject json(Location l) {
        JSObject r = new JSObject();
        r.put("lat", l.getLatitude());
        r.put("lng", l.getLongitude());
        r.put("accuracy", l.hasAccuracy() ? l.getAccuracy() : 5000);
        return r;
    }

    @SuppressWarnings({ "MissingPermission", "deprecation" })
    @PluginMethod
    public void get(PluginCall call) {
        if (!granted()) { call.reject("denied", "DENIED"); return; }
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) { call.reject("unavailable", "UNAVAILABLE"); return; }
        long maxAge = call.getLong("maxAge", 30 * 60_000L);
        int timeout = call.getInt("timeout", 20000);
        // 1) أحدث موقع معروف من كل المزوّدين
        Location best = null;
        for (String p : lm.getProviders(true)) {
            try {
                Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            } catch (Exception ignored) {}
        }
        if (best != null && System.currentTimeMillis() - best.getTime() <= maxAge) { call.resolve(json(best)); return; }
        // 2) قراءة واحدة من الشبكة ثم GPS
        String provider = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ? LocationManager.NETWORK_PROVIDER
            : lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER : null;
        if (provider == null) {
            if (best != null) { call.resolve(json(best)); return; }
            call.reject("off", "OFF");
            return;
        }
        final Location fallback = best;
        final Handler h = new Handler(Looper.getMainLooper());
        final boolean[] done = { false };
        final LocationListener[] holder = new LocationListener[1];
        holder[0] = new LocationListener() {
            @Override public void onLocationChanged(Location l) {
                if (done[0]) return;
                done[0] = true;
                try { lm.removeUpdates(this); } catch (Exception ignored) {}
                call.resolve(json(l));
            }
            @Override public void onStatusChanged(String p, int s, Bundle b) {}
            @Override public void onProviderEnabled(String p) {}
            @Override public void onProviderDisabled(String p) {}
        };
        try {
            lm.requestLocationUpdates(provider, 0L, 0f, holder[0], Looper.getMainLooper());
        } catch (Exception e) {
            if (fallback != null) call.resolve(json(fallback)); else call.reject("unavailable", "UNAVAILABLE");
            return;
        }
        h.postDelayed(() -> {
            if (done[0]) return;
            done[0] = true;
            try { lm.removeUpdates(holder[0]); } catch (Exception ignored) {}
            if (fallback != null) call.resolve(json(fallback)); else call.reject("timeout", "TIMEOUT");
        }, timeout);
    }
}
