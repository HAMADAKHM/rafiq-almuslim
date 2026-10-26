// هل «رفيق بلس» ساري الآن (يضبطه PlusProvider بعد تحقق المتجر) — للخدمات خارج React مثل جدولة التذكيرات.
let active = false
export const setPlusActive = (on: boolean) => { active = on }
export const plusActive = () => active
