package org.rafiqalmuslim.tv;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** شاشة المواقيت تظهر بعد المدة المحددة من عدم الاستخدام بالضبط، ولا تظهر أثناء الاستخدام */
public class IdleRulesTest {
    private static final long T0 = 1_800_000_000_000L;
    private static final long MIN = 60_000L;

    private static IdleRules.Input base() {
        IdleRules.Input in = new IdleRules.Input();
        in.now = T0;
        in.lastKeyAt = T0;
        in.lastActiveAt = T0;
        in.accessibility = true;
        in.quietMode = true;
        in.canOpen = true;
        in.takeoverEnabled = true;
        in.minutes = 5;
        return in;
    }

    @Test public void opensExactlyAfterFiveMinutesWithoutKeys() {
        IdleRules.Input in = base();
        in.now = T0 + 5 * MIN - 1;
        assertEquals("waiting", IdleRules.decide(in));
        in.now = T0 + 5 * MIN;
        assertNull(IdleRules.decide(in));
    }

    @Test public void aKeyPressRestartsTheCount() {
        IdleRules.Input in = base();
        in.lastKeyAt = T0 + 4 * MIN;
        in.now = T0 + 6 * MIN;
        assertEquals("waiting", IdleRules.decide(in));
        in.now = T0 + 9 * MIN;
        assertNull(IdleRules.decide(in));
    }

    @Test public void minutesSettingIsRespected() {
        IdleRules.Input in = base();
        in.minutes = 10;
        in.now = T0 + 9 * MIN;
        assertEquals("waiting", IdleRules.decide(in));
        in.now = T0 + 10 * MIN;
        assertNull(IdleRules.decide(in));
    }

    @Test public void neverInterruptsMediaOrAdhanOrVisibleScreen() {
        IdleRules.Input in = base();
        in.now = T0 + 30 * MIN;
        in.mediaActive = true;
        assertEquals("media_active", IdleRules.decide(in));
        in.mediaActive = false;
        in.adhanActive = true;
        assertEquals("adhan", IdleRules.decide(in));
        in.adhanActive = false;
        in.screenVisible = true;
        assertEquals("screen_visible", IdleRules.decide(in));
    }

    @Test public void hdmiBlocksOnlyWhenItsInputIsInFront() {
        IdleRules.Input in = base();
        in.now = T0 + 30 * MIN;
        in.externalForeground = false; // جهاز موصول لكن التلفاز ليس على مدخله
        assertNull(IdleRules.decide(in));
        in.externalForeground = true;
        assertEquals("hdmi_foreground", IdleRules.decide(in));
    }

    @Test public void withoutAccessibilityUsesQuietModeAndNeedsPermission() {
        IdleRules.Input in = base();
        in.accessibility = false;
        in.lastKeyAt = 0;
        in.now = T0 + 5 * MIN;
        assertNull(IdleRules.decide(in));
        in.canOpen = false;
        assertEquals("needs_overlay_permission", IdleRules.decide(in));
        in.canOpen = true;
        in.quietMode = false;
        assertEquals("needs_accessibility", IdleRules.decide(in));
    }

    @Test public void snoozeAndDisabled() {
        IdleRules.Input in = base();
        in.now = T0 + 30 * MIN;
        in.snoozeUntil = T0 + 31 * MIN;
        assertEquals("snoozed", IdleRules.decide(in));
        in.snoozeUntil = 0;
        in.takeoverEnabled = false;
        assertEquals("disabled", IdleRules.decide(in));
        in.takeoverEnabled = true;
        in.minutes = 0;
        assertEquals("disabled", IdleRules.decide(in));
    }

    @Test public void knownTvInputPackages() {
        assertTrue(IdleRules.isTvInputPackage("com.google.android.tv"));
        assertTrue(IdleRules.isTvInputPackage("com.mediatek.wwtv.tvcenter"));
        assertTrue(IdleRules.isTvInputPackage("com.android.tv"));
        assertFalse(IdleRules.isTvInputPackage("com.google.android.youtube.tv"));
        assertFalse(IdleRules.isTvInputPackage("com.google.android.tvlauncher"));
        assertFalse(IdleRules.isTvInputPackage(null));
    }
}
