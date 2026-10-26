// موضع الإعلان الوحيد في التطبيق. يحمل data-ad-slot لتتحقق اختبارات الحماية أنه لا يظهر في صفحات العبادة.
// يُعرض فقط إن سمح به الإعداد المركزي (config.ts): صفحة مسموحة، وغير مشترك، ولا تلاوة تعمل.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { usePlus } from '../billing/PlusContext'
import { player } from '../services/audio'
import { adAllowed, adsPreview, type AdPlacement } from './config'
import { removeBanner, showBanner } from './admob'

/** مسافة الشريط فوق شريط التنقل السفلي (dp) */
const TABBAR_DP = 64

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const { pathname } = useLocation()
  const { entitled, ready } = usePlus()
  const audio = useSyncExternalStore(player.subscribe, player.getSnapshot)
  const audioPlaying = audio.status === 'playing' || audio.status === 'loading'
  const allowed = ready && adAllowed(pathname, placement, { entitled, audioPlaying })
  const owner = useRef(Symbol(placement))
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!allowed || !Capacitor.isNativePlatform()) return
    let alive = true
    const id = owner.current
    showBanner(id, TABBAR_DP).then((ok) => { if (alive) setShown(ok) })
    return () => { alive = false; setShown(false); removeBanner(id) }
  }, [allowed])

  if (!allowed) return null
  if (Capacitor.isNativePlatform()) return shown ? <div data-ad-slot={placement} className="ad-spacer" aria-hidden="true" /> : null
  return adsPreview() ? <div data-ad-slot={placement} className="ad-preview" role="note">مساحة إعلان (معاينة) — لا تظهر للمشتركين ولا في صفحات العبادة</div> : null
}
