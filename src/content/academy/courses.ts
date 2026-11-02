// مقررات «الأكاديمية الإسلامية».
// قواعد المحتوى:
// - الآيات تُعرض من نص المصحف المضمّن بمواضعها (سورة وآيات)، ولا تُكتب يدويًا.
// - الأحاديث تُعرض من مكتبة الأحاديث بأرقامها، وكل رقم هنا مُتحقق منه على قاعدة البيانات (scripts/hadith).
// - الشروح والتلخيصات التعليمية مكتوبة بإيجاز وبحالة «قيد المراجعة» حتى يراجعها متخصص شرعي، وتظهر للمستخدم كذلك.
// - الخلاف الفقهي يُعرض بنسبة كل قول إلى مذهبه كما اشتهر في كتبه، دون ترجيح.
// - لا روايات إسرائيلية ولا قصص غير ثابتة: قصص الأنبياء من آيات القرآن فقط.
import { SRC, type AcademyLesson, type Course, type Review } from './types'

const R: Review = { status: 'review', verification: 'secondary', note: 'تلخيص تعليمي لم يراجعه متخصص شرعي بعد' }
const P: Review = { status: 'review', verification: 'primary', note: 'نصوص أصلية فقط من المصحف وكتب الحديث؛ ترتيبها في الدرس لم يُراجَع بعد' }
const QH = [SRC.mushaf, SRC.hadithDb]

// ---------- الطهارة ----------
const TAHARAH: AcademyLesson[] = [
  { id: 'wudu-steps', title: 'الوضوء خطوة بخطوة', summary: 'آية الوضوء، وصفة وضوء النبي ﷺ كما رواها عثمان رضي الله عنه.', kids: true, review: P, sources: QH,
    blocks: [
      { type: 'quran', surah: 5, from: 6, to: 6, note: 'آية الوضوء: فيها فرائضه الأربعة المذكورة نصًا' },
      { type: 'hadith', book: 'bukhari', n: 164, cite: 'البخاري (164)', note: 'صفة وضوء النبي ﷺ من حديث عثمان رضي الله عنه' },
      { type: 'link', to: '/learn/wudu', title: 'الدرس المفصّل: صفة الوضوء', hint: 'الخطوات مرتبة مع أدلتها' },
    ],
    quiz: [
      { id: 'w1', kind: 'mcq', q: 'إلى أين تُغسل اليدان في الوضوء؟', options: ['إلى الرسغين', 'إلى المرفقين', 'إلى الكتفين'], answer: 1, explain: 'قال تعالى: «وأيديكم إلى المرافق».', ref: 'المائدة 6', level: 1 },
      { id: 'w2', kind: 'tf', q: 'الرأس في الوضوء يُغسل غسلًا مثل الوجه.', options: ['صح', 'خطأ'], answer: 1, explain: 'الرأس يُمسح ولا يُغسل: «وامسحوا برءوسكم».', ref: 'المائدة 6', level: 1 },
      { id: 'w3', kind: 'fill', q: 'تُغسل الرجلان في الوضوء إلى ...', answer: 'الكعبين', explain: '«وأرجلكم إلى الكعبين».', ref: 'المائدة 6', level: 2 },
    ] },
  { id: 'wudu-nawaqid', title: 'نواقض الوضوء', summary: 'ما يُبطل الوضوء مما اتفق عليه العلماء، وما اختلفوا فيه.', review: R, sources: [...QH, SRC.fiqhSchools],
    blocks: [
      { type: 'hadith', book: 'bukhari', n: 6954, cite: 'البخاري (6954)', note: 'لا تُقبل الصلاة مع الحدث حتى يتوضأ' },
      { type: 'list', title: 'من النواقض المتفق عليها في الجملة', items: ['الخارج من السبيلين (البول والغائط والريح).', 'زوال العقل بنوم مستغرق أو إغماء أو نحوهما، على تفصيل عند العلماء في النوم.', 'ما يوجب الغسل.'] },
      { type: 'madhab', issue: 'مسّ المرأة', views: [{ madhab: 'الحنفية', view: 'لا ينقض الوضوء' }, { madhab: 'المالكية', view: 'ينقض إن كان بلذة أو قصدها' }, { madhab: 'الشافعية', view: 'ينقض مسّ بشرة الأجنبية مطلقًا' }, { madhab: 'الحنابلة', view: 'ينقض إن كان بشهوة' }], source: 'كتب المذاهب الأربعة في باب نواقض الوضوء' },
      { type: 'hadith', book: 'muslim', n: 802, cite: 'مسلم (360)', note: 'السؤال عن الوضوء من لحوم الإبل؛ والمسألة مما اختلف فيه العلماء، وأخذ به الحنابلة' },
    ],
    quiz: [
      { id: 'n1', kind: 'tf', q: 'خروج الريح من نواقض الوضوء.', options: ['صح', 'خطأ'], answer: 0, explain: 'الخارج من السبيلين ناقض باتفاق العلماء.', level: 1 },
      { id: 'n2', kind: 'mcq', q: 'أي المذاهب يرى أن مسّ المرأة لا ينقض الوضوء؟', options: ['الشافعية', 'الحنفية', 'الحنابلة'], answer: 1, explain: 'هذا قول الحنفية، وفي المسألة خلاف معروف.', level: 3 },
    ] },
  { id: 'ghusl', title: 'الغسل وموجباته', summary: 'صفة الغسل الكامل، وما يوجبه.', review: R, sources: QH,
    blocks: [
      { type: 'quran', surah: 5, from: 6, to: 6, note: '«وإن كنتم جنبًا فاطّهروا»' },
      { type: 'hadith', book: 'bukhari', n: 291, cite: 'البخاري (291)', note: 'من موجبات الغسل' },
      { type: 'list', title: 'من موجبات الغسل', items: ['الجنابة.', 'انقطاع دم الحيض والنفاس.', 'الموت (يُغسَّل الميت).'] },
      { type: 'link', to: '/learn/ghusl', title: 'الدرس المفصّل: صفة الغسل' },
    ] },
  { id: 'tayammum', title: 'التيمم', summary: 'متى يُشرع التيمم وكيف يكون.', review: P, sources: QH,
    blocks: [
      { type: 'quran', surah: 5, from: 6, to: 6, note: '«فلم تجدوا ماء فتيمموا صعيدًا طيبًا»' },
      { type: 'hadith', book: 'bukhari', n: 338, cite: 'البخاري (338)', note: 'حديث عمار رضي الله عنه في صفة التيمم' },
      { type: 'link', to: '/learn/tayammum', title: 'الدرس المفصّل: صفة التيمم' },
    ] },
  { id: 'taharah-mistakes', title: 'أخطاء شائعة في الطهارة', summary: 'تنبيهات على أخطاء متكررة في الوضوء.', review: R, sources: QH,
    blocks: [
      { type: 'hadith', book: 'bukhari', n: 163, cite: 'البخاري (163)', note: '«ويل للأعقاب من النار»: التحذير من ترك جزء من القدم دون غسل' },
      { type: 'list', items: ['ترك جزء من أعضاء الوضوء دون أن يصله الماء، كالعقبين والمرفقين.', 'الإسراف في الماء.', 'الوسوسة وتكرار الغسل فوق ثلاث مرات.'] },
    ] },
]

// ---------- الصلاة ----------
const SALAH: AcademyLesson[] = [
  { id: 'salah-how', title: 'صفة الصلاة خطوة بخطوة', summary: 'الصلاة كما صلاها النبي ﷺ، مع رسوم توضيحية للأوضاع.', kids: true, review: R, sources: QH,
    blocks: [
      { type: 'hadith', book: 'bukhari', n: 631, cite: 'البخاري (631)', note: '«صلّوا كما رأيتموني أصلي»' },
      { type: 'steps', title: 'الخطوات', items: [
        { title: 'استقبال القبلة والنية', body: 'يقف مستقبلًا القبلة، والنية محلها القلب.', pose: 'stand' },
        { title: 'تكبيرة الإحرام', body: 'يقول «الله أكبر» رافعًا يديه.', pose: 'takbir' },
        { title: 'القراءة', body: 'يقرأ الفاتحة ثم ما تيسر من القرآن في الركعتين الأوليين.', pose: 'stand' },
        { title: 'الركوع', body: 'يكبّر ويركع مطمئنًا ويقول: سبحان ربي العظيم.', pose: 'ruku' },
        { title: 'الرفع من الركوع', body: 'يقول: سمع الله لمن حمده، ربنا ولك الحمد.', pose: 'stand' },
        { title: 'السجود', body: 'يكبّر ويسجد على الأعضاء السبعة ويقول: سبحان ربي الأعلى.', pose: 'sujud' },
        { title: 'الجلوس بين السجدتين', body: 'يجلس مطمئنًا ويقول: رب اغفر لي.', pose: 'sit' },
        { title: 'التشهد', body: 'يجلس للتشهد بعد كل ركعتين وفي آخر الصلاة.', pose: 'sit' },
        { title: 'التسليم', body: 'يسلّم عن يمينه ثم عن شماله.', pose: 'salam' },
      ] },
      { type: 'link', to: '/learn/salah', title: 'الدرس المفصّل: صفة الصلاة مع الأذكار' },
    ],
    quiz: [
      { id: 's1', kind: 'mcq', q: 'كم ركعة في صلاة المغرب؟', options: ['ركعتان', 'ثلاث', 'أربع'], answer: 1, explain: 'المغرب ثلاث ركعات.', level: 1 },
      { id: 's2', kind: 'mcq', q: 'ماذا يقول المصلي في الركوع؟', options: ['سبحان ربي الأعلى', 'سبحان ربي العظيم', 'رب اغفر لي'], answer: 1, explain: '«سبحان ربي العظيم» في الركوع، و«سبحان ربي الأعلى» في السجود.', level: 1 },
      { id: 's3', kind: 'fill', q: 'تبدأ الصلاة بتكبيرة ...', answer: 'الإحرام', explain: 'التكبيرة الأولى تسمى تكبيرة الإحرام.', level: 1 },
    ] },
  { id: 'salah-conditions', title: 'شروط الصلاة', summary: 'ما يجب قبل الدخول في الصلاة.', review: R, sources: [...QH, SRC.fiqhSchools],
    blocks: [
      { type: 'hadith', book: 'tirmidhi', n: 3, cite: 'الترمذي (3)', note: '«مفتاح الصلاة الطهور»' },
      { type: 'list', title: 'شروط الصلاة كما يذكرها الفقهاء', items: ['الإسلام والعقل والتمييز.', 'الطهارة من الحدث.', 'الطهارة من النجاسة في البدن والثوب والمكان.', 'ستر العورة.', 'دخول الوقت.', 'استقبال القبلة.', 'النية.'] },
      { type: 'text', body: 'يختلف الفقهاء في عدّ بعض هذه الأمور شروطًا أو أركانًا، وفي تفاصيلها؛ والمذكور هنا ما عليه عامتهم في الجملة.' },
    ],
    quiz: [{ id: 'c1', kind: 'tf', q: 'دخول الوقت من شروط صحة الصلاة.', options: ['صح', 'خطأ'], answer: 0, explain: '«إن الصلاة كانت على المؤمنين كتابًا موقوتًا».', ref: 'النساء 103', level: 1 }] },
  { id: 'tashahhud', title: 'التشهد والصلاة الإبراهيمية', summary: 'نص التشهد والصلاة على النبي ﷺ من الأحاديث الصحيحة.', kids: true, review: P, sources: QH,
    blocks: [
      { type: 'hadith', book: 'bukhari', n: 831, cite: 'البخاري (831)', note: 'تشهد ابن مسعود رضي الله عنه' },
      { type: 'hadith', book: 'bukhari', n: 3370, cite: 'البخاري (3370)', note: 'الصلاة الإبراهيمية' },
    ] },
  { id: 'salah-adhkar', title: 'أذكار الصلاة', summary: 'الأذكار بعد السلام، مع الاستماع إلى التسجيلات حيث تتوفر.', kids: true, review: P, sources: QH,
    blocks: [{ type: 'link', to: '/adhkar/after-prayer', title: 'أذكار ما بعد الصلاة', hint: 'من حصن المسلم مع التسجيل الصوتي حين يتوفر' }] },
  { id: 'jamaah', title: 'صلاة الجماعة', summary: 'فضل صلاة الجماعة.', review: P, sources: QH,
    blocks: [{ type: 'hadith', book: 'bukhari', n: 645, cite: 'البخاري (645)', note: 'تفضل صلاة الجماعة صلاة الفرد بسبع وعشرين درجة' }],
    quiz: [{ id: 'j1', kind: 'mcq', q: 'تفضل صلاة الجماعة صلاة الفرد بكم درجة؟', options: ['عشر', 'سبع وعشرين', 'مئة'], answer: 1, explain: 'كما في الحديث المتفق عليه.', ref: 'البخاري (645)', level: 1 }] },
  { id: 'safar', title: 'صلاة المسافر', summary: 'القصر والجمع في السفر.', review: R, sources: [...QH, SRC.fiqhSchools],
    blocks: [
      { type: 'quran', surah: 4, from: 101, to: 101 },
      { type: 'hadith', book: 'bukhari', n: 3935, cite: 'البخاري (3935)', note: 'حديث عائشة رضي الله عنها: فُرضت الصلاة ركعتين' },
      { type: 'text', body: 'يقصر المسافر الصلاة الرباعية (الظهر والعصر والعشاء) إلى ركعتين، ولا قصر في الفجر والمغرب.' },
      { type: 'madhab', issue: 'حكم القصر للمسافر', views: [{ madhab: 'الحنفية', view: 'واجب (عزيمة)' }, { madhab: 'الجمهور', view: 'رخصة، وهو أفضل من الإتمام عند أكثرهم' }], source: 'كتب المذاهب في باب صلاة المسافر' },
    ],
    quiz: [{ id: 'sf1', kind: 'tf', q: 'تُقصر صلاة المغرب في السفر.', options: ['صح', 'خطأ'], answer: 1, explain: 'لا قصر في المغرب ولا الفجر.', level: 2 }] },
  { id: 'marid', title: 'صلاة المريض', summary: 'يصلي المريض حسب استطاعته.', review: P, sources: QH,
    blocks: [{ type: 'hadith', book: 'bukhari', n: 1117, cite: 'البخاري (1117)', note: 'صلِّ قائمًا، فإن لم تستطع فقاعدًا، فإن لم تستطع فعلى جنب' }, { type: 'quran', surah: 2, from: 286, to: 286, note: '«لا يكلف الله نفسًا إلا وسعها»' }] },
  { id: 'salah-mistakes', title: 'أخطاء شائعة في الصلاة', summary: 'حديث «المسيء صلاته» وأهمية الطمأنينة.', review: R, sources: QH,
    blocks: [
      { type: 'hadith', book: 'bukhari', n: 757, cite: 'البخاري (757)', note: '«ارجع فصلِّ فإنك لم تصلِّ»' },
      { type: 'list', items: ['ترك الطمأنينة في الركوع والسجود.', 'مسابقة الإمام في الصلاة.', 'العبث والالتفات في الصلاة.'] },
      { type: 'hadith', book: 'bukhari', n: 401, cite: 'البخاري (401)', note: 'من شكّ في صلاته' },
    ] },
  { id: 'men-women', title: 'الصلاة للرجال والنساء', summary: 'صفة الصلاة واحدة في أصلها للرجال والنساء.', review: R, sources: [...QH, SRC.fiqhSchools],
    blocks: [{ type: 'text', body: 'الأصل أن صفة الصلاة واحدة للرجل والمرأة لعموم «صلّوا كما رأيتموني أصلي»، وللفقهاء تفصيلات في بعض الهيئات للمرأة كالتجافي في السجود، وفي ستر العورة.' }, { type: 'hadith', book: 'bukhari', n: 631, cite: 'البخاري (631)' }] },
]

// ---------- السيرة النبوية ----------
const SEERAH: AcademyLesson[] = [
  { id: 'seerah-timeline', title: 'الخط الزمني للسيرة', summary: 'أبرز الأحداث من المولد إلى الوفاة، على المشهور عند أهل السير.', review: R, sources: [SRC.mushaf, SRC.hadithDb, { title: 'كتب السيرة المعتمدة', note: 'التواريخ على المشهور؛ في بعضها خلاف معروف بين أهل السير' }],
    blocks: [
      { type: 'text', title: 'نسبه ﷺ', body: 'هو محمد بن عبد الله بن عبد المطلب بن هاشم، من قريش، من ولد إسماعيل بن إبراهيم عليهما السلام.' },
      { type: 'timeline', note: 'التواريخ الهجرية والميلادية تقريبية على المشهور، وفي تحديد بعضها خلاف.', events: [
        { when: 'عام الفيل (نحو 571م)', title: 'المولد في مكة' },
        { when: 'في الأربعين من عمره (نحو 610م)', title: 'نزول الوحي في غار حراء', quran: [96, 1, 5] },
        { when: 'السنوات الأولى من البعثة', title: 'الدعوة السرية ثم الجهرية', quran: [26, 214, 214] },
        { when: 'السنة الخامسة من البعثة', title: 'الهجرة الأولى إلى الحبشة' },
        { when: '1هـ (622م)', title: 'الهجرة إلى المدينة وبناء المسجد والمؤاخاة', quran: [9, 40, 40] },
        { when: '2هـ', title: 'غزوة بدر', quran: [3, 123, 123] },
        { when: '3هـ', title: 'غزوة أحد' },
        { when: '5هـ', title: 'غزوة الأحزاب (الخندق)', quran: [33, 9, 9] },
        { when: '6هـ', title: 'صلح الحديبية', quran: [48, 1, 1] },
        { when: '8هـ', title: 'فتح مكة', quran: [110, 1, 3] },
        { when: '10هـ', title: 'حجة الوداع', quran: [5, 3, 3] },
        { when: '11هـ (632م)', title: 'وفاته ﷺ في المدينة' },
      ] },
      { type: 'hadith', book: 'bukhari', n: 3, cite: 'البخاري (3)', note: 'حديث بدء الوحي' },
    ],
    quiz: [
      { id: 'sr1', kind: 'mcq', q: 'أين نزل الوحي أول مرة؟', options: ['غار ثور', 'غار حراء', 'المسجد الحرام'], answer: 1, explain: 'نزل الوحي في غار حراء، كما في حديث بدء الوحي.', ref: 'البخاري (3)', level: 1 },
      { id: 'sr2', kind: 'mcq', q: 'ما أول ما نزل من القرآن؟', options: ['الفاتحة', '«اقرأ باسم ربك الذي خلق»', 'آية الكرسي'], answer: 1, explain: 'أول ما نزل صدر سورة العلق.', ref: 'البخاري (3)', level: 1 },
      { id: 'sr3', kind: 'fill', q: 'كانت الهجرة النبوية إلى ...', answer: 'المدينة', explain: 'هاجر النبي ﷺ من مكة إلى المدينة.', level: 1 },
      { id: 'sr4', kind: 'mcq', q: 'في أي سنة كانت غزوة بدر؟', options: ['2هـ', '5هـ', '8هـ'], answer: 0, explain: 'كانت بدر في السنة الثانية للهجرة.', level: 2 },
      { id: 'sr5', kind: 'mcq', q: 'في أي سنة كان فتح مكة؟', options: ['6هـ', '8هـ', '10هـ'], answer: 1, explain: 'فُتحت مكة في السنة الثامنة للهجرة.', level: 2 },
    ] },
]

// ---------- قصص الأنبياء (من آيات القرآن فقط) ----------
/** مواضع قصص الأنبياء في القرآن؛ كل موضع مُتحقق منه آليًا بورود اسم النبي فيه (academy.test) */
export const PROPHETS: { id: string; name: string; ranges: [number, number, number][]; story?: string; match?: string }[] = [
  { id: 'adam', name: 'آدم', ranges: [[2, 30, 39], [7, 11, 25]], story: 'adam' },
  { id: 'idris', name: 'إدريس', ranges: [[19, 56, 57], [21, 85, 86]] },
  { id: 'nuh', name: 'نوح', ranges: [[11, 25, 49], [71, 1, 28]], story: 'nuh' },
  { id: 'hud', name: 'هود', ranges: [[7, 65, 72], [11, 50, 60]] },
  { id: 'salih', name: 'صالح', ranges: [[7, 73, 79], [11, 61, 68]] },
  { id: 'ibrahim', name: 'إبراهيم', ranges: [[21, 51, 73], [6, 74, 83], [14, 35, 41]], story: 'ibrahim' },
  { id: 'lut', name: 'لوط', ranges: [[11, 77, 83], [26, 160, 175]] },
  { id: 'ismail', name: 'إسماعيل', ranges: [[2, 127, 129], [19, 54, 55]] },
  { id: 'ishaq', name: 'إسحاق', ranges: [[37, 112, 113], [11, 69, 73]] },
  { id: 'yaqub', name: 'يعقوب', ranges: [[2, 132, 133], [12, 4, 6]] },
  { id: 'yusuf', name: 'يوسف', ranges: [[12, 4, 101]], story: 'yusuf' },
  { id: 'ayyub', name: 'أيوب', ranges: [[21, 83, 84], [38, 41, 44]] },
  { id: 'shuayb', name: 'شعيب', ranges: [[7, 85, 93], [11, 84, 95]] },
  { id: 'musa', name: 'موسى', ranges: [[28, 3, 43], [20, 9, 98]], story: 'musa' },
  { id: 'harun', name: 'هارون', ranges: [[20, 29, 36], [20, 90, 94]] },
  { id: 'dhulkifl', name: 'ذو الكفل', match: 'الكفل', ranges: [[21, 85, 86], [38, 48, 48]] },
  { id: 'dawud', name: 'داود', ranges: [[38, 17, 26], [34, 10, 11]] },
  { id: 'sulayman', name: 'سليمان', ranges: [[27, 15, 44], [38, 30, 40]], story: 'sulayman' },
  { id: 'ilyas', name: 'إلياس', ranges: [[37, 123, 132]] },
  { id: 'alyasa', name: 'اليسع', ranges: [[6, 86, 86], [38, 48, 48]] },
  { id: 'yunus', name: 'يونس', ranges: [[37, 139, 148], [10, 98, 98]], story: 'yunus' },
  { id: 'zakariya', name: 'زكريا', ranges: [[19, 2, 11], [3, 37, 41]] },
  { id: 'yahya', name: 'يحيى', ranges: [[19, 12, 15], [3, 39, 39]] },
  { id: 'isa', name: 'عيسى', ranges: [[19, 16, 34], [3, 45, 59], [5, 110, 118]], story: 'maryam' },
  { id: 'muhammad', name: 'محمد', ranges: [[33, 40, 40], [48, 29, 29], [3, 144, 144]] },
]

const PROPHET_LESSONS: AcademyLesson[] = PROPHETS.map((p) => ({
  id: `prophet-${p.id}`, title: p.id === 'muhammad' ? 'محمد ﷺ' : `${p.name} عليه السلام`, summary: `مواضع ذكر ${p.id === 'muhammad' ? 'النبي محمد ﷺ' : `قصة ${p.name} عليه السلام`} في القرآن الكريم، مع التفسير الميسر لكل آية.`, kids: true,
  review: { status: 'review', verification: 'primary', note: 'آيات القرآن وحدها مع التفسير الميسر؛ لا سرد من عندنا ولا روايات إسرائيلية' },
  sources: [SRC.mushaf, SRC.muyassar],
  blocks: [
    ...p.ranges.map(([surah, from, to]) => ({ type: 'quran' as const, surah, from, to })),
    ...(p.story ? [{ type: 'link' as const, to: `/stories/${p.story}`, title: 'التفسير كالقصة (رفيق بلس)', hint: 'القصة كاملة بآياتها وتفسيرها' }] : []),
    { type: 'text' as const, title: 'الدروس والعبر', body: 'تُستخلص العبر من الآيات نفسها ومن التفسير الميسر تحت كل آية. لم نكتب عبرًا من عندنا حتى تُراجع من متخصص.' },
  ],
}))

// ---------- الصحابة ----------
const COMPANIONS: AcademyLesson[] = [
  { id: 'khulafa', title: 'الخلفاء الراشدون', summary: 'أبو بكر الصديق، وعمر بن الخطاب، وعثمان بن عفان، وعلي بن أبي طالب رضي الله عنهم.', review: R, sources: QH,
    blocks: [
      { type: 'list', items: ['أبو بكر الصديق رضي الله عنه: أول الخلفاء.', 'عمر بن الخطاب رضي الله عنه.', 'عثمان بن عفان رضي الله عنه.', 'علي بن أبي طالب رضي الله عنه.'] },
      { type: 'quran', surah: 9, from: 100, to: 100, note: 'ثناء الله على السابقين الأولين من المهاجرين والأنصار' },
      { type: 'link', to: '/hadith/search?topic=' + encodeURIComponent('المناقب'), title: 'أحاديث المناقب في كتب الحديث', hint: 'كتب «فضائل الصحابة» و«المناقب»' },
      { type: 'text', title: 'السيرة المفصّلة', body: 'السير المفصلة لكل صحابي قيد الإعداد من مصادر موثقة مثل «الإصابة في تمييز الصحابة» لابن حجر، ولم تُكتب بعد.' },
    ],
    quiz: [{ id: 'k1', kind: 'mcq', q: 'من أول الخلفاء الراشدين؟', options: ['عمر بن الخطاب', 'أبو بكر الصديق', 'علي بن أبي طالب'], answer: 1, explain: 'أبو بكر الصديق رضي الله عنه أول الخلفاء.', level: 1 }] },
  { id: 'ashara', title: 'العشرة المبشرون بالجنة', summary: 'الحديث الذي ذكرهم بأسمائهم.', review: P, sources: QH,
    blocks: [{ type: 'hadith', book: 'tirmidhi', n: 3747, cite: 'الترمذي (3747)', note: 'انظر حكم العلماء عليه تحت الحديث' }] },
  { id: 'ummahat', title: 'أمهات المؤمنين', summary: 'زوجات النبي ﷺ رضي الله عنهن.', review: R, sources: QH,
    blocks: [
      { type: 'quran', surah: 33, from: 6, to: 6, note: '«وأزواجه أمهاتهم»' },
      { type: 'list', items: ['خديجة بنت خويلد', 'سودة بنت زمعة', 'عائشة بنت أبي بكر', 'حفصة بنت عمر', 'زينب بنت خزيمة', 'أم سلمة هند بنت أبي أمية', 'زينب بنت جحش', 'جويرية بنت الحارث', 'أم حبيبة رملة بنت أبي سفيان', 'صفية بنت حيي', 'ميمونة بنت الحارث'] },
    ] },
]

// ---------- العقيدة ----------
const AQIDAH: AcademyLesson[] = [
  { id: 'pillars', title: 'أركان الإسلام والإيمان', summary: 'حديث جبريل وحديث «بُني الإسلام على خمس».', kids: true, review: P, sources: QH,
    blocks: [
      { type: 'hadith', book: 'bukhari', n: 8, cite: 'البخاري (8)', note: 'بُني الإسلام على خمس' },
      { type: 'hadith', book: 'muslim', n: 93, cite: 'مسلم (8)', note: 'حديث جبريل: الإسلام والإيمان والإحسان' },
      { type: 'link', to: '/learn/pillars', title: 'الدرس المختصر: أركان الإسلام والإيمان والإحسان' },
    ],
    quiz: [
      { id: 'p1', kind: 'mcq', q: 'كم عدد أركان الإسلام؟', options: ['أربعة', 'خمسة', 'ستة'], answer: 1, explain: '«بُني الإسلام على خمس».', ref: 'البخاري (8)', level: 1 },
      { id: 'p2', kind: 'mcq', q: 'كم عدد أركان الإيمان؟', options: ['خمسة', 'ستة', 'سبعة'], answer: 1, explain: 'الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر خيره وشره.', ref: 'مسلم (8)', level: 1 },
      { id: 'p3', kind: 'tf', q: 'الإيمان بالقدر من أركان الإيمان.', options: ['صح', 'خطأ'], answer: 0, explain: 'كما في حديث جبريل.', ref: 'مسلم (8)', level: 1 },
    ] },
  { id: 'iman-allah', title: 'الإيمان بالله وأسمائه وصفاته', summary: 'من الآيات الجامعة في التوحيد.', review: P, sources: [SRC.mushaf, SRC.muyassar],
    blocks: [{ type: 'quran', surah: 112, from: 1, to: 4 }, { type: 'quran', surah: 2, from: 255, to: 255 }, { type: 'quran', surah: 59, from: 22, to: 24 }, { type: 'quran', surah: 7, from: 180, to: 180 }] },
  { id: 'iman-malaika', title: 'الإيمان بالملائكة والكتب والرسل', summary: 'آيات أركان الإيمان.', review: P, sources: [SRC.mushaf, SRC.muyassar],
    blocks: [{ type: 'quran', surah: 2, from: 285, to: 285 }, { type: 'quran', surah: 4, from: 136, to: 136 }, { type: 'quran', surah: 66, from: 6, to: 6 }] },
  { id: 'iman-akhirah', title: 'الإيمان باليوم الآخر والقدر', summary: 'من آيات اليوم الآخر والقدر.', review: P, sources: [SRC.mushaf, SRC.muyassar],
    blocks: [{ type: 'quran', surah: 99, from: 1, to: 8 }, { type: 'quran', surah: 54, from: 49, to: 49 }] },
  { id: 'tawhid', title: 'التوحيد وأقسامه', summary: 'تقسيم تعليمي يستعمله كثير من العلماء لبيان معاني التوحيد.', review: R, sources: [SRC.mushaf, SRC.muyassar],
    blocks: [
      { type: 'list', items: ['توحيد الربوبية: الإيمان بأن الله وحده الخالق الرازق المدبّر.', 'توحيد الألوهية: إفراد الله بالعبادة.', 'توحيد الأسماء والصفات: إثبات ما أثبته الله لنفسه من الأسماء والصفات.'] },
      { type: 'quran', surah: 1, from: 2, to: 5 },
      { type: 'text', body: 'هذا التقسيم اصطلاح تعليمي، ويعبّر بعض العلماء عن المعاني نفسها بتقسيمات أخرى.' },
    ] },
]

// ---------- فقه العبادات ----------
const FIQH: AcademyLesson[] = [
  { id: 'siyam', title: 'فقه الصيام', summary: 'آيات الصيام وأحاديث من فضله وآدابه.', review: R, sources: QH,
    blocks: [{ type: 'quran', surah: 2, from: 183, to: 185 }, { type: 'hadith', book: 'bukhari', n: 38, cite: 'البخاري (38)', note: 'من صام رمضان إيمانًا واحتسابًا' }, { type: 'hadith', book: 'bukhari', n: 1923, cite: 'البخاري (1923)', note: 'تسحّروا فإن في السحور بركة' }],
    quiz: [{ id: 'f1', kind: 'mcq', q: 'في أي سورة آيات فرض الصيام؟', options: ['آل عمران', 'البقرة', 'النساء'], answer: 1, explain: '«يا أيها الذين آمنوا كتب عليكم الصيام» في سورة البقرة.', ref: 'البقرة 183', level: 1 }] },
  { id: 'zakah', title: 'فقه الزكاة', summary: 'مصارف الزكاة ومكانتها.', review: R, sources: [...QH, SRC.fiqhSchools],
    blocks: [
      { type: 'quran', surah: 9, from: 60, to: 60, note: 'مصارف الزكاة الثمانية' },
      { type: 'hadith', book: 'bukhari', n: 1395, cite: 'البخاري (1395)', note: 'تؤخذ من أغنيائهم وتُرد على فقرائهم' },
      { type: 'madhab', issue: 'زكاة الحليّ المعدّ للاستعمال', views: [{ madhab: 'الحنفية', view: 'تجب فيه الزكاة' }, { madhab: 'الجمهور', view: 'لا زكاة فيه (المالكية والشافعية والحنابلة في المشهور عنهم)' }], source: 'كتب المذاهب في باب زكاة الذهب والفضة' },
    ],
    quiz: [{ id: 'z1', kind: 'mcq', q: 'كم عدد مصارف الزكاة في القرآن؟', options: ['ستة', 'ثمانية', 'عشرة'], answer: 1, explain: 'ذكرت آية التوبة ثمانية مصارف.', ref: 'التوبة 60', level: 2 }] },
  { id: 'hajj', title: 'فقه الحج والعمرة', summary: 'فرض الحج وفضل الحج والعمرة.', review: R, sources: QH,
    blocks: [{ type: 'quran', surah: 3, from: 97, to: 97 }, { type: 'hadith', book: 'muslim', n: 3137, cite: 'مسلم (1297)', note: '«لتأخذوا مناسككم»' }, { type: 'hadith', book: 'bukhari', n: 1773, cite: 'البخاري (1773)', note: 'العمرة إلى العمرة كفارة، والحج المبرور ليس له جزاء إلا الجنة' }] },
  { id: 'jumuah-eid', title: 'أحكام الجمعة والعيدين', summary: 'فضل يوم الجمعة وصلاة العيد.', review: R, sources: QH,
    blocks: [{ type: 'quran', surah: 62, from: 9, to: 10 }, { type: 'hadith', book: 'muslim', n: 1976, cite: 'مسلم (854)', note: 'خير يوم طلعت عليه الشمس يوم الجمعة' }, { type: 'hadith', book: 'bukhari', n: 956, cite: 'البخاري (956)', note: 'الخروج إلى المصلى يوم الفطر والأضحى' }] },
  { id: 'janaiz', title: 'أحكام الجنائز', summary: 'فضل اتباع الجنازة والصلاة عليها.', review: R, sources: QH,
    blocks: [{ type: 'hadith', book: 'bukhari', n: 1325, cite: 'البخاري (1325)', note: 'من شهد الجنازة حتى يُصلّى عليها فله قيراط' }, { type: 'link', to: '/for-the-deceased', title: 'أدعية للمتوفى' }] },
  { id: 'madhahib', title: 'مسائل اختلف فيها المذاهب الأربعة', summary: 'أمثلة من الخلاف المعتبر في العبادات، بنسبة كل قول إلى مذهبه دون ترجيح.', review: R, sources: [SRC.fiqhSchools],
    blocks: [
      { type: 'madhab', issue: 'مقدار الواجب في مسح الرأس في الوضوء', views: [{ madhab: 'الحنفية', view: 'ربع الرأس' }, { madhab: 'المالكية', view: 'جميع الرأس' }, { madhab: 'الشافعية', view: 'ما يقع عليه اسم المسح ولو بعض شعرة' }, { madhab: 'الحنابلة', view: 'جميع الرأس' }], source: 'كتب المذاهب في باب فرائض الوضوء' },
      { type: 'madhab', issue: 'قراءة البسملة في الصلاة الجهرية', views: [{ madhab: 'الحنفية', view: 'تُقرأ سرًا' }, { madhab: 'المالكية', view: 'لا تُقرأ في الفريضة على المشهور' }, { madhab: 'الشافعية', view: 'تُقرأ جهرًا لأنها آية من الفاتحة' }, { madhab: 'الحنابلة', view: 'تُقرأ سرًا' }], source: 'كتب المذاهب في باب صفة الصلاة' },
      { type: 'text', body: 'الخلاف المعتبر بين المذاهب رحمة وسعة، ولكل قول أدلته عند أصحابه. يُرجع في العمل إلى أهل العلم الموثوقين في بلدك.' },
    ],
    quiz: [{ id: 'm1', kind: 'mcq', q: 'أي المذاهب يرى الجهر بالبسملة في الصلاة الجهرية؟', options: ['الحنفية', 'الشافعية', 'الحنابلة'], answer: 1, explain: 'الشافعية يرون الجهر بها لأنها آية من الفاتحة عندهم.', level: 3 }] },
  { id: 'fiqh-links', title: 'الطهارة والصلاة والسفر', summary: 'دروس فقه الطهارة والصلاة في مقرراتها.', review: P, sources: QH,
    blocks: [{ type: 'link', to: '/academy/course/taharah', title: 'مقرر الطهارة' }, { type: 'link', to: '/academy/course/salah', title: 'مقرر الصلاة' }, { type: 'link', to: '/academy/lesson/salah/safar', title: 'صلاة المسافر' }] },
]

// ---------- الأطفال ----------
const KIDS: AcademyLesson[] = [
  { id: 'kids-akhlaq', title: 'أخلاق المسلم', summary: 'الكلمة الطيبة والرحمة وبرّ الوالدين.', kids: true, review: P, sources: QH,
    blocks: [
      { type: 'hadith', book: 'bukhari', n: 2989, cite: 'البخاري (2989)', note: 'الكلمة الطيبة صدقة' },
      { type: 'hadith', book: 'bukhari', n: 5997, cite: 'البخاري (5997)', note: 'من لا يَرحم لا يُرحم' },
      { type: 'quran', surah: 17, from: 23, to: 24, note: 'برّ الوالدين' },
      { type: 'hadith', book: 'tirmidhi', n: 1956, cite: 'الترمذي (1956)', note: 'تبسّمك في وجه أخيك لك صدقة' },
    ],
    quiz: [
      { id: 'a1', kind: 'tf', q: 'الكلمة الطيبة صدقة.', options: ['صح', 'خطأ'], answer: 0, explain: 'كما قال النبي ﷺ.', ref: 'البخاري (2989)', level: 1 },
      { id: 'a2', kind: 'mcq', q: 'ماذا نقول لوالدينا؟', options: ['قولًا كريمًا', 'كلامًا قاسيًا', 'لا نكلمهما'], answer: 0, explain: '«وقل لهما قولًا كريمًا».', ref: 'الإسراء 23', level: 1 },
    ] },
  { id: 'kids-letters', title: 'الحروف العربية', summary: 'تعلّم الحروف العربية الثمانية والعشرين بالشكل والصوت.', kids: true, review: { status: 'review', verification: 'secondary' }, sources: [], blocks: [{ type: 'link', to: '/academy/kids/letters', title: 'لوحة الحروف التفاعلية' }] },
  { id: 'kids-adhkar', title: 'أذكاري اليومية', summary: 'أذكار الصباح والمساء والنوم والطعام بأسلوب مبسط.', kids: true, review: P, sources: QH, blocks: [{ type: 'link', to: '/kids-adhkar', title: 'أذكار الأطفال' }] },
]

const unit = (id: string, title: string, lessons: AcademyLesson[]) => ({ id, title, lessons })

export const COURSES: Course[] = [
  { id: 'salah', title: 'تعليم الصلاة', intro: 'الصلاة خطوة بخطوة بالرسوم التوضيحية، والأذكار بالصوت، وأحكام الجماعة والمسافر والمريض.', color: '#174B3C', icon: 'prayer', units: [unit('salah-1', 'كيف أصلي', SALAH.slice(0, 4)), unit('salah-2', 'أحكام وحالات', SALAH.slice(4))] },
  { id: 'taharah', title: 'تعليم الطهارة', intro: 'الوضوء والغسل والتيمم ونواقض الوضوء والأخطاء الشائعة.', color: '#1F6F8B', icon: 'water', units: [unit('taharah-1', 'الطهارة', TAHARAH)] },
  { id: 'seerah', title: 'السيرة النبوية', intro: 'خط زمني لأبرز أحداث السيرة من المولد إلى الوفاة، مع الآيات المتعلقة بكل حدث. لا يتضمن أي تجسيد للنبي ﷺ.', color: '#8A6A24', icon: 'seerah', units: [unit('seerah-1', 'السيرة', SEERAH)] },
  { id: 'prophets', title: 'قصص الأنبياء', intro: 'خمسة وعشرون نبيًا ورسولًا ذُكرت أسماؤهم في القرآن، بقصصهم كما وردت في الآيات مع التفسير الميسر.', color: '#3C7A3F', icon: 'prophets', units: [unit('prophets-1', 'الأنبياء والرسل', PROPHET_LESSONS)] },
  { id: 'companions', title: 'الصحابة رضي الله عنهم', intro: 'الخلفاء الراشدون والعشرة المبشرون وأمهات المؤمنين.', color: '#6C4A8A', icon: 'companions', units: [unit('companions-1', 'الصحابة', COMPANIONS)] },
  { id: 'aqidah', title: 'العقيدة الإسلامية', intro: 'أركان الإسلام والإيمان، والتوحيد، من الآيات والأحاديث.', color: '#0F6E70', icon: 'aqidah', units: [unit('aqidah-1', 'أصول العقيدة', AQIDAH)] },
  { id: 'fiqh', title: 'فقه العبادات', intro: 'الصيام والزكاة والحج والجمعة والجنائز، مع عرض خلاف المذاهب الأربعة في مسائل مختارة.', color: '#9A4A12', icon: 'fiqh', units: [unit('fiqh-1', 'العبادات', FIQH)] },
  { id: 'kids', title: 'ركن الأطفال', intro: 'الصلاة والوضوء وقصص الأنبياء والأخلاق والحروف والأذكار بأسلوب مبسط.', color: '#C8641E', icon: 'kids', kids: true, units: [unit('kids-1', 'أتعلم ديني', [...KIDS, ...SALAH.filter((l) => l.kids), ...TAHARAH.filter((l) => l.kids), ...AQIDAH.filter((l) => l.kids)])] },
]

export const allLessons = () => COURSES.flatMap((c) => c.units.flatMap((u) => u.lessons.map((l) => ({ course: c, lesson: l }))))
export const findLesson = (courseId: string, lessonId: string) => {
  const c = COURSES.find((x) => x.id === courseId)
  const l = c?.units.flatMap((u) => u.lessons).find((x) => x.id === lessonId)
  return c && l ? { course: c, lesson: l } : null
}
