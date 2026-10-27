// «آخر قراءة فعلية»: سجل مستقل عن «أكمل قراءتك» (الذي يبقى كما هو).
// لا يتحدث بمجرد فتح المصحف ولا بانتقال الصفحات مع التلاوة الصوتية: يلزم بقاء القارئ على الصفحة نفسها
// 20 ثانية والتطبيق ظاهر والتلاوة متوقفة.
import { useEffect } from 'react'
import { usePlayer } from '../../hooks'
import { ayahMeta, type QuranData } from '../../services/quran'
import { DWELL_MS, saveActual } from '../../services/companionStore'
import { useSettings } from '../../state/SettingsContext'

export function useActualReading(data: QuranData | null, surah: number, ayah: number) {
  const p = usePlayer()
  const { settings } = useSettings()
  const tz = settings.location?.tz
  const playing = p.status === 'playing' || p.status === 'loading'
  useEffect(() => {
    if (!data || !surah || !ayah || playing) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = () => {
      clearTimeout(timer)
      if (document.visibilityState === 'hidden') return
      timer = setTimeout(() => {
        const m = ayahMeta(data.meta, surah, ayah)
        saveActual({ surah, ayah, page: m.page, juz: m.juz, surahName: data.meta.surahs[surah - 1]?.name, at: Date.now() }, tz).catch(() => {})
      }, DWELL_MS)
    }
    arm()
    document.addEventListener('visibilitychange', arm)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', arm) }
  }, [data, surah, ayah, playing, tz])
}
