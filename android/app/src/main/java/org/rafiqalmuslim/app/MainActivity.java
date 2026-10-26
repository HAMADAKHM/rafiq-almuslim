package org.rafiqalmuslim.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // إضافات محلية: ودجت المواقيت، وصوت الأذان المختار من الجهاز
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(AdhanSoundPlugin.class);
        // صوت قراءة المعنى في فيديو «التفسير كالقصة»
        registerPlugin(NarrationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
