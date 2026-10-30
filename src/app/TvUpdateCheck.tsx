// عند فتح التطبيق على الجوال (مرة كل 12 ساعة): إن كان تلفاز مربوط يعمل بنسخة أقدم من آخر إصدار منشور لتطبيق الشاشة،
// يُنبَّه المستخدم ليحدّثه من «التحكم بالتلفاز». لا شيء يُرسل للتلفاز دون ضغط المستخدم.
import { useEffect } from 'react'
import { kv } from '../db/repos'
import { toast } from '../hooks'
import { latestTvRelease, loadTvs, pingTv } from '../services/tvRemote'
import { tvLinkSupported, tvRequest } from '../platform/tvlink'

const KEY = 'tv:update-check'

export function TvUpdateCheck() {
  useEffect(() => {
    if (!tvLinkSupported()) return
    let alive = true
    const t = setTimeout(async () => {
      const last = await kv.get<number>(KEY, 0)
      if (Date.now() - last < 12 * 3600_000) return
      const tvs = await loadTvs()
      if (!tvs.length) return
      await kv.set(KEY, Date.now())
      const rel = await latestTvRelease()
      if (!rel || !alive) return
      for (const tv of tvs) {
        const info = await pingTv(tvRequest, tv.host, tv.port)
        if (alive && info?.version && rel.build > info.version.code) {
          toast(`يتوفر تحديث لتطبيق الشاشة على «${tv.name}» — حدّثه من «التحكم بالتلفاز»`)
          return
        }
      }
    }, 6000)
    return () => { alive = false; clearTimeout(t) }
  }, [])
  return null
}
