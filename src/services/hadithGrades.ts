// ترجمة أحكام المحدثين كما وردت في قاعدة fawazahmed0/hadith-api (بالإنجليزية) إلى مصطلحاتها العربية.
// لا يُنشأ حكم من عندنا: كل حكم منسوب إلى العالم الذي قاله كما في القاعدة. ما لم تُعرف ترجمته يُعرض كما هو.

export const SCHOLARS: Record<string, string> = {
  'Al-Albani': 'محمد ناصر الدين الألباني',
  'Zubair Ali Zai': 'زبير علي زئي',
  'Muhammad Muhyi Al-Din Abdul Hamid': 'محمد محيي الدين عبد الحميد',
  'Shuaib Al Arnaut': 'شعيب الأرناؤوط',
  'Ahmad Muhammad Shakir': 'أحمد محمد شاكر',
  'Bashar Awad Maarouf': 'بشار عواد معروف',
  'Abu Ghuddah': 'عبد الفتاح أبو غدة',
  'Muhammad Fouad Abd al-Baqi': 'محمد فؤاد عبد الباقي',
  'Salim al-Hilali': 'سليم بن عيد الهلالي',
}

// الأطول أولًا حتى لا تُترجم كلمة داخل عبارة أطول
const TERMS: [string, string][] = [
  ['Sahih - Isnaad Hasan', 'صحيح، إسناده حسن'],
  ['Isnaad Daif', 'إسناده ضعيف'],
  ['Witness', 'وله شاهد'],
  ['Sahih - Agreed Upon', 'صحيح، متفق عليه'],
  ['Isnaad Sahih Agreed Upon', 'إسناده صحيح، متفق عليه'],
  ['Hasan Sahih Isnaad', 'إسناده حسن صحيح'],
  ['Very Daif Isnaad', 'إسناده ضعيف جدًا'],
  ['Sahih Isnaad Maqtu', 'مقطوع، إسناده صحيح'],
  ['Sahih Isnaad Mauquf', 'موقوف، إسناده صحيح'],
  ['Sahih Isnaad Mursal', 'مرسل، إسناده صحيح'],
  ['Daif Isnaad Maqtu', 'مقطوع، إسناده ضعيف'],
  ['Mauquf Sahih Lighairihi', 'موقوف، صحيح لغيره'],
  ['Maqtu Sahih Lighairihi', 'مقطوع، صحيح لغيره'],
  ['Mauquf Hasan Lighairihi', 'موقوف، حسن لغيره'],
  ['Sahih Lighairihi', 'صحيح لغيره'],
  ['Hasan Lighairihi', 'حسن لغيره'],
  ['Hasan Sahih', 'حسن صحيح'],
  ['Isnaad Hasan', 'إسناده حسن'], ['Hasan Isnaad', 'إسناده حسن'],
  ['Isnaad Sahih', 'إسناده صحيح'], ['Sahih Isnaad', 'إسناده صحيح'],
  ['Daif Isnaad', 'إسناده ضعيف'], ['Sanad Daif', 'إسناده ضعيف'],
  ['Isnaad Malool', 'إسناده معلول'],
  ['Mauquf Sahih', 'موقوف صحيح'], ['Sahih Muquf', 'موقوف صحيح'], ['Sahih Mauquf', 'موقوف صحيح'],
  ['Mauquf Daif', 'موقوف ضعيف'], ['Daif Muquf', 'موقوف ضعيف'], ['Daif Mauquf', 'موقوف ضعيف'],
  ['Mauquf Hasan', 'موقوف حسن'],
  ['Maqtu Sahih', 'مقطوع صحيح'], ['Sahih Maqtu', 'مقطوع صحيح'],
  ['Maqtu Daif', 'مقطوع ضعيف'], ['Daif Maqtu', 'مقطوع ضعيف'],
  ['Maqtu Hasan', 'مقطوع حسن'], ['Hasan Maqtu', 'مقطوع حسن'],
  ['Sahih Mutawatir', 'صحيح متواتر'],
  ['Sahih Matn', 'صحيح المتن'],
  ['Sahih Hadith', 'حديث صحيح'],
  ['Daif Munkar', 'ضعيف منكر'], ['Munkar Daif', 'منكر ضعيف'],
  ['Very Daif', 'ضعيف جدًا'],
  ['Mawdu', 'موضوع'], ['Munkar', 'منكر'], ['Shadh', 'شاذ'], ['Batil', 'باطل'],
  ['Mursal', 'مرسل'], ['Mauquf', 'موقوف'], ['Maqtu', 'مقطوع'],
  ['Sahih', 'صحيح'], ['Hasan', 'حسن'], ['Daif', 'ضعيف'], ['Da\'if', 'ضعيف'],
]

export type GradeLevel = 'sahih' | 'hasan' | 'daif' | 'fabricated' | 'other'

/** يترجم الحكم؛ untranslated = بقيت فيه كلمات لاتينية لم تُعرف (يُعرض الأصل بجانبه) */
export function translateGrade(raw: string): { ar: string; untranslated: boolean } {
  let s = raw.trim()
  if (!s || s === '-') return { ar: '', untranslated: false }
  // التخريج داخل الحكم: «Sahih Bukhari (1023) Sahih Muslim (894)» ← أخرجه البخاري (1023) ومسلم (894)
  const refs: string[] = []
  // «Bukhari And Muslim» بلا أرقام: يُعامل قبل استخراج المراجع
  if (/Bukhari And Muslim/.test(s)) { s = s.replace(/\s*-?\s*Bukhari And Muslim/, ''); refs.push('البخاري', 'مسلم') }
  s = s.replace(/Sahih (Bukhari|Muslim)\s*(?:\(([^)]*)\))?/g, (_m, who: string, n?: string) => {
    const ref = n?.replace(/Through Last/g, 'آخر').replace(/After/g, 'بعد').replace(/Mukhtasar/g, 'مختصرًا').replace(/\s+/g, ' ').trim()
    refs.push(`${who === 'Bukhari' ? 'البخاري' : 'مسلم'}${ref ? ` (${ref})` : ''}`)
    return ' '
  }).trim()
  for (const [en, ar] of TERMS) s = s.split(en).join(` ${ar} `)
  s = s.replace(/\s+/g, ' ').trim()
  const parts = [s, refs.length ? `أخرجه ${refs.join(' و')}` : ''].filter(Boolean)
  // حكم «صحيح مسلم» وحده يعني: صحيح، أخرجه مسلم
  const ar = (s ? parts.join('، ') : `صحيح، ${parts.join('')}`).replace(/\s+،/g, '،')
  return { ar, untranslated: /[A-Za-z]/.test(ar) }
}

export function gradeLevel(raw: string): GradeLevel {
  const s = raw.toLowerCase()
  if (/mawdu|batil/.test(s)) return 'fabricated'
  if (/daif|munkar|shadh|malool/.test(s)) return 'daif'
  if (/sahih/.test(s)) return 'sahih'
  if (/hasan/.test(s)) return 'hasan'
  return 'other'
}

export const LEVEL_LABEL: Record<GradeLevel, string> = { sahih: 'صحيح', hasan: 'حسن', daif: 'ضعيف', fabricated: 'موضوع أو باطل', other: 'حكم آخر' }
