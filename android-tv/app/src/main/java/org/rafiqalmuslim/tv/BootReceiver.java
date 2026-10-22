package org.rafiqalmuslim.tv;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** فتح شاشة المواقيت تلقائيًا عند تشغيل التلفاز (إن كان الخيار مفعّلًا، ويسمح به نظام التلفاز) */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !"android.intent.action.QUICKBOOT_POWERON".equals(a)) return;
        if (!TvWeb.autostart(ctx)) return;
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { ctx.startActivity(open); } catch (Exception ignored) { /* بعض الأنظمة تمنع الفتح من الخلفية */ }
    }
}
