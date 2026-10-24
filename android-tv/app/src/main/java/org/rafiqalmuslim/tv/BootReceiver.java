package org.rafiqalmuslim.tv;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** فتح شاشة المواقيت تلقائيًا عند تشغيل التلفاز (إن كان الخيار مفعّلًا، ويسمح به نظام التلفاز) */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (a == null) return;
        // الخدمة تعمل دائمًا بعد التشغيل أو التحديث (الأذان وشاشة عدم الاستخدام وفتح الشاشة عند الاستيقاظ)
        TvService.start(ctx);
        Alarms.schedule(ctx);
        TvService.log(ctx, "boot");
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) return;
        if (!TvWeb.autostart(ctx)) return;
        TvService.openScreen(ctx);
    }
}
