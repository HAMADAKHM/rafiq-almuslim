// مكتبة «حصن المسلم» كاملة (132 بابًا، 267 ذكرًا ودعاءً) للاستوديو: النص كما في hisnmuslim.com دون تعديل،
// ولكل ذكر تسجيله الصوتي في المشروع نفسه. الملف public/data/hisn.json يُبنى بـ scripts/build-hisn-data.mjs.
import type { ContentCategory } from './types'
import { registerHisnAudio } from './hisnAudio'

interface HisnJson { source: string; chapters: { id: number; title: string; items: { n: number; text: string; repeat?: number; audio?: number }[] }[] }

export const HISN_ITEM_PREFIX = 'hisn-'
let cache: Promise<ContentCategory[]> | null = null

/** يحوّل بيانات حصن المسلم إلى أقسام المكتبة، ويسجّل رقم التسجيل الصوتي لكل ذكر */
export function hisnCategories(j: HisnJson): ContentCategory[] {
  return j.chapters.map((ch) => ({
    id: `hisn-ch-${ch.id}`,
    title: ch.title,
    items: ch.items.map((it) => {
      const id = `${HISN_ITEM_PREFIX}${it.n}`
      if (it.audio) registerHisnAudio(id, it.audio)
      return { id, text: it.text, kind: 'general' as const, count: it.repeat, source: `حصن المسلم — ${ch.title} (${it.n})` }
    }),
  }))
}

export function loadHisnLibrary(fetcher: typeof fetch = fetch): Promise<ContentCategory[]> {
  if (!cache) {
    cache = fetcher((import.meta.env?.BASE_URL ?? '/') + 'data/hisn.json')
      .then((r) => { if (!r.ok) throw new Error('hisn'); return r.json() as Promise<HisnJson> })
      .then(hisnCategories)
    cache.catch(() => { cache = null })
  }
  return cache
}
