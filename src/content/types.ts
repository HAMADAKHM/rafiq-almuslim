// نموذج المحتوى الديني. كل عنصر يحدد نوعه (قرآن / حديث / دعاء عام) ومصدره.
// النصوص القرآنية لا تُكتب هنا يدويًا أبدًا: تُحدَّد بمرجع (سورة وآيات) وتُعرض من المصحف المعتمد.

export type ContentKind = 'quran' | 'hadith' | 'general'

export interface QuranRange {
  surah: number
  from: number
  to: number
}

export interface DhikrItem {
  id: string
  /** نص الحديث/الدعاء (فارغ لعناصر القرآن) */
  text?: string
  /** آيات تُجلب من المصحف */
  quran?: QuranRange[]
  kind: ContentKind
  /** عدد التكرار حين ورد به النص فقط */
  count?: number
  /** التخريج: من رواه، ورقم الحديث حين يكون معروفًا */
  source: string
  /** الحكم على الحديث حين يكون في الصحيحين أو متفقًا على صحته */
  grade?: string
  /** متى يقال أو ملاحظة ثابتة من نص الحديث */
  note?: string
}

export interface ContentCategory {
  id: string
  title: string
  intro?: string
  items: DhikrItem[]
}
