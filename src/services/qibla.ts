// حساب اتجاه القبلة على الكرة الأرضية (الدائرة العظمى) نحو الكعبة المشرفة.
// إحداثيات الكعبة: 21.4225° شمالًا، 39.8262° شرقًا.
export const KAABA = { lat: 21.4225, lng: 39.8262 }

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** زاوية القبلة بالدرجات من الشمال الجغرافي باتجاه عقارب الساعة (0..360). */
export function qiblaBearing(lat: number, lng: number): number {
  const φ1 = rad(lat)
  const φ2 = rad(KAABA.lat)
  const Δλ = rad(KAABA.lng - lng)
  const y = Math.sin(Δλ)
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

/** المسافة إلى مكة بالكيلومتر (معادلة هافرساين). */
export function distanceToKaabaKm(lat: number, lng: number): number {
  const R = 6371.0088
  const dφ = rad(KAABA.lat - lat)
  const dλ = rad(KAABA.lng - lng)
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const DIRS = ['الشمال', 'الشمال الشرقي', 'الشرق', 'الجنوب الشرقي', 'الجنوب', 'الجنوب الغربي', 'الغرب', 'الشمال الغربي']
export function compassName(bearing: number): string {
  return DIRS[Math.round(bearing / 45) % 8]
}
