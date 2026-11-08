// «صور جاهزة» لشاشة التلفاز: صور أرسلها صاحب التطبيق، مضمّنة في تطبيق التلفاز فقط (المجلد tv-photos).
// شعارات الأندية ملك أصحابها، أُضيفت بطلب صاحب التطبيق (لا تُرفع إلى متجر Google Play بها).
import type { PhotoSource } from './PhotoScene'

export type GalleryCat = 'all' | 'islamic' | 'nature' | 'sport' | 'clubs' | 'space' | 'other'
const ALL_CATS: { id: GalleryCat; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'islamic', label: 'إسلامية' },
  { id: 'nature', label: 'طبيعة' },
  { id: 'sport', label: 'رياضة' },
  { id: 'clubs', label: 'أندية' },
  { id: 'space', label: 'فضاء' },
  { id: 'other', label: 'متنوعة' },
]
// الصور عالية الدقة فقط: حُذفت الصور القديمة منخفضة الدقة (1280×720 مكبّرة وضبابية) بطلب صاحب التطبيق
const COUNTS: Record<Exclude<GalleryCat, 'all'>, number> = { islamic: 1, nature: 0, sport: 0, clubs: 0, space: 0, other: 0 }

export const GALLERY: { id: string; cat: Exclude<GalleryCat, 'all'> }[] = (Object.keys(COUNTS) as Exclude<GalleryCat, 'all'>[])
  .flatMap((cat) => Array.from({ length: COUNTS[cat] }, (_, i) => ({ id: `${cat}-${String(i + 1).padStart(2, '0')}`, cat })))

/** التصنيفات التي فيها صور فقط (والكل) — في التلفاز والجوال */
export const GALLERY_CATS = ALL_CATS.filter((c) => c.id === 'all' || COUNTS[c.id as Exclude<GalleryCat, 'all'>] > 0)

/** صور التصنيف؛ وإن صار التصنيف المحفوظ فارغًا تُعرض كل الصور حتى لا تبقى الشاشة سوداء */
export function galleryIds(cat: GalleryCat): string[] {
  const ids = GALLERY.filter((p) => cat === 'all' || p.cat === cat).map((p) => p.id)
  return ids.length ? ids : GALLERY.map((p) => p.id)
}

/** مصدر الصور الجاهزة لعرضها بتلاشٍ كصور الجوال */
export function gallerySource(cat: GalleryCat): PhotoSource {
  const ids = galleryIds(cat)
  return { ids: () => ids, load: (id) => `./tv-photos/${id}.jpg` }
}
