package org.rafiqalmuslim.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.widget.Toast;

/** نسخ نص من الودجت إلى الحافظة ثم الإغلاق فورًا (لا تستطيع الودجتات النسخ مباشرة) */
public class CopyActivity extends Activity {
    static final String EXTRA_TEXT = "org.rafiqalmuslim.COPY_TEXT";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        String t = getIntent().getStringExtra(EXTRA_TEXT);
        if (t != null) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) { cm.setPrimaryClip(ClipData.newPlainText("رفيق المسلم", t)); Toast.makeText(this, "نُسخ الدعاء", Toast.LENGTH_SHORT).show(); }
        }
        finish();
        overridePendingTransition(0, 0);
    }
}
