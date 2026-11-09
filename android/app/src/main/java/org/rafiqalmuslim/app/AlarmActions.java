package org.rafiqalmuslim.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

/** زرّا «إيقاف» و«غفوة» في إشعار المنبه */
public class AlarmActions extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        handle(c, intent.getAction());
    }

    static void handle(Context c, String action) {
        JSONObject o = AlarmService.current;
        if (AlarmService.ACTION_SNOOZE.equals(action) && o != null && o.has("id")) {
            WakeAlarms.snooze(c, o.optInt("id"), o.optInt("snooze", 10));
        }
        AlarmService.stop(c);
    }
}
