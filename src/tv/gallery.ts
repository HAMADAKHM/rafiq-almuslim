// «صور جاهزة» لشاشة التلفاز: صور أرسلها صاحب التطبيق، مضمّنة في تطبيق التلفاز فقط (المجلد tv-photos).
// استُبعدت منها شعارات الأندية والبطولات والعلامات التجارية لأنها ملك أصحابها.
import type { PhotoSource } from './PhotoScene'

export type GalleryCat = 'all' | 'islamic' | 'nature' | 'sport' | 'space' | 'other'
export const GALLERY_CATS: { id: GalleryCat; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'islamic', label: 'إسلامية' },
  { id: 'nature', label: 'طبيعة' },
  { id: 'sport', label: 'رياضة' },
  { id: 'space', label: 'فضاء' },
  { id: 'other', label: 'متنوعة' },
]
const COUNTS: Record<Exclude<GalleryCat, 'all'>, number> = { islamic: 14, nature: 29, sport: 12, space: 6, other: 14 }

export const GALLERY: { id: string; cat: Exclude<GalleryCat, 'all'> }[] = (Object.keys(COUNTS) as Exclude<GalleryCat, 'all'>[])
  .flatMap((cat) => Array.from({ length: COUNTS[cat] }, (_, i) => ({ id: `${cat}-${String(i + 1).padStart(2, '0')}`, cat })))

export function galleryIds(cat: GalleryCat): string[] {
  return GALLERY.filter((p) => cat === 'all' || p.cat === cat).map((p) => p.id)
}

/** مصدر الصور الجاهزة لعرضها بتلاشٍ كصور الجوال */
export function gallerySource(cat: GalleryCat): PhotoSource {
  const ids = galleryIds(cat)
  return { ids: () => ids, load: (id) => `./tv-photos/${id}.jpg` }
}
