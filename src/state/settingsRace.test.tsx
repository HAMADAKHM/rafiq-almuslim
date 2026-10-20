// تغيير إعداد قبل اكتمال تحميل الإعدادات المحفوظة: يجب ألا يضيع التغيير ولا تُستبدل الإعدادات المحفوظة بالافتراضية.
import { describe, expect, it } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { SettingsProvider, useSettings } from './SettingsContext'
import { kv } from '../db/repos'
import type { Settings } from './settings'

let seen: { settings: Settings; ready: boolean } | null = null
function EarlyChanger() {
  const { settings, ready, update } = useSettings()
  seen = { settings, ready }
  // يغيّر إعدادًا فور التركيب، قبل انتهاء قراءة IndexedDB
  useEffect(() => { update({ uiScale: 1.3 }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

describe('تحميل الإعدادات', () => {
  it('التغيير المبكر يُطبق فوق الإعدادات المحفوظة دون مسحها', async () => {
    await kv.set('settings', { theme: 'gold', reciterId: 'husary' })
    await act(async () => { render(<SettingsProvider><EarlyChanger /></SettingsProvider>) })
    await waitFor(() => expect(seen?.ready).toBe(true))
    expect(seen!.settings.theme).toBe('gold')
    expect(seen!.settings.reciterId).toBe('husary')
    expect(seen!.settings.uiScale).toBe(1.3)
    const stored = await kv.get<Partial<Settings>>('settings', {})
    expect(stored.theme).toBe('gold')
    expect(stored.uiScale).toBe(1.3)
  })
})
