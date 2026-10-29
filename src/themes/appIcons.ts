// أيقونات التطبيق (الأصلية والبديلة لمشتركي بلس) — التصاميم المعتمدة كما أُرسلت، في scripts/brand/icons/<id>.png.
// منها يولّد scripts/brand/build-alt-icons.py ملفات Android وصور صفحة الاختيار (public/app-icons).

export type AppIconId = 'default' | 'royal' | 'night' | 'turquoise' | 'dawn' | 'nature' | 'violet' | 'rose' | 'evening'

export const APP_ICONS: Record<AppIconId, { name: string; theme: string }> = {
  default: { name: 'الأصلية', theme: 't-classic' },
  royal: { name: 'الملكية الذهبية', theme: 't-royal' },
  night: { name: 'الليلية الزرقاء', theme: 't-night' },
  turquoise: { name: 'الفيروزية', theme: 't-turquoise' },
  dawn: { name: 'الشروق', theme: 't-dawn' },
  nature: { name: 'الطبيعية', theme: 't-nature' },
  violet: { name: 'البنفسجية', theme: 't-violet' },
  rose: { name: 'الوردية', theme: 't-rose' },
  evening: { name: 'المساء', theme: 't-evening' },
}
export const APP_ICON_IDS = Object.keys(APP_ICONS) as AppIconId[]

/** صورة الأيقونة لعرضها داخل التطبيق */
export const appIconUrl = (id: AppIconId) => `${import.meta.env.BASE_URL}app-icons/${id}.png`

/** اسم مكوّن Android (activity-alias) لكل أيقونة */
export const aliasOf = (id: AppIconId) => (id === 'default' ? 'LauncherDefault' : `Launcher${id[0].toUpperCase()}${id.slice(1)}`)
