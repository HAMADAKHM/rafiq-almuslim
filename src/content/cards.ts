// بطاقات المشاركة: رمضان والعيد والجمعة. النصوص الدينية بتخريجها (الآيات تُجلب من المصحف المعتمد بالمرجع)،
// والتهاني عبارات عامة تُعرض «تهنئة» دون نسبة إلى نص شرعي. بطاقات «اليوم» تُختار يوميًا من المكتبة الموثقة.

export interface ShareCard {
  id: string
  /** عنوان صغير أعلى البطاقة */
  title: string
  /** نص البطاقة (للأحاديث والأدعية والتهاني) */
  text?: string
  /** آيات تُجلب من المصحف */
  quran?: { surah: number; from: number; to: number }
  /** التخريج، أو «تهنئة» */
  source: string
  kind: 'quran' | 'hadith' | 'dua' | 'greeting'
}

export const RAMADAN_CARDS: ShareCard[] = [
  { id: 'r-greet-1', title: 'رمضان كريم', text: 'رَمَضَانُ كَرِيمٌ\nأعاده الله علينا وعليكم بالخير واليمن والبركات', source: 'تهنئة', kind: 'greeting' },
  { id: 'r-greet-2', title: 'مبارك عليكم الشهر', text: 'مبارك عليكم الشهر\nتقبّل الله صيامكم وقيامكم', source: 'تهنئة', kind: 'greeting' },
  { id: 'r-greet-3', title: 'رمضان مبارك', text: 'رَمَضَانُ مُبَارَكٌ\nجعله الله شهر خير ومغفرة لنا ولكم', source: 'تهنئة', kind: 'greeting' },
  { id: 'r-greet-4', title: 'كل عام وأنتم بخير', text: 'كل عام وأنتم إلى الله أقرب\nوعلى طاعته أدوم', source: 'تهنئة', kind: 'greeting' },
  { id: 'r-q-183', title: 'كُتب عليكم الصيام', quran: { surah: 2, from: 183, to: 183 }, source: 'سورة البقرة: 183', kind: 'quran' },
  { id: 'r-q-185', title: 'شهر القرآن', quran: { surah: 2, from: 185, to: 185 }, source: 'سورة البقرة: 185', kind: 'quran' },
  { id: 'r-q-186', title: 'إني قريب', quran: { surah: 2, from: 186, to: 186 }, source: 'سورة البقرة: 186', kind: 'quran' },
  { id: 'r-q-qadr', title: 'ليلة القدر', quran: { surah: 97, from: 1, to: 5 }, source: 'سورة القدر', kind: 'quran' },
  { id: 'r-h-iman', title: 'إيمانًا واحتسابًا', text: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ', source: 'متفق عليه: البخاري (38) ومسلم (760)', kind: 'hadith' },
  { id: 'r-h-qiyam', title: 'قيام رمضان', text: 'مَنْ قَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ', source: 'متفق عليه: البخاري (37) ومسلم (759)', kind: 'hadith' },
  { id: 'r-h-qadr', title: 'قيام ليلة القدر', text: 'مَنْ قَامَ لَيْلَةَ الْقَدْرِ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ', source: 'متفق عليه: البخاري (1901) ومسلم (760)', kind: 'hadith' },
  { id: 'r-h-gates', title: 'أبواب الجنة', text: 'إِذَا جَاءَ رَمَضَانُ فُتِّحَتْ أَبْوَابُ الْجَنَّةِ، وَغُلِّقَتْ أَبْوَابُ النَّارِ، وَصُفِّدَتِ الشَّيَاطِينُ', source: 'متفق عليه: البخاري (1899) ومسلم (1079)', kind: 'hadith' },
  { id: 'r-h-farha', title: 'فرحتا الصائم', text: 'لِلصَّائِمِ فَرْحَتَانِ: فَرْحَةٌ عِنْدَ فِطْرِهِ، وَفَرْحَةٌ عِنْدَ لِقَاءِ رَبِّهِ', source: 'رواه مسلم (1151)', kind: 'hadith' },
  { id: 'r-h-junna', title: 'الصيام جُنّة', text: 'الصِّيَامُ جُنَّةٌ', source: 'متفق عليه: البخاري (1894) ومسلم (1151)', kind: 'hadith' },
  { id: 'r-h-suhoor', title: 'السحور', text: 'تَسَحَّرُوا، فَإِنَّ فِي السَّحُورِ بَرَكَةً', source: 'متفق عليه: البخاري (1923) ومسلم (1095)', kind: 'hadith' },
  { id: 'r-h-fitr', title: 'تعجيل الفطر', text: 'لَا يَزَالُ النَّاسُ بِخَيْرٍ مَا عَجَّلُوا الْفِطْرَ', source: 'متفق عليه: البخاري (1957) ومسلم (1098)', kind: 'hadith' },
  { id: 'r-h-iftar', title: 'تفطير الصائم', text: 'مَنْ فَطَّرَ صَائِمًا كَانَ لَهُ مِثْلُ أَجْرِهِ، غَيْرَ أَنَّهُ لَا يَنْقُصُ مِنْ أَجْرِ الصَّائِمِ شَيْئًا', source: 'رواه الترمذي (807) وقال: حسن صحيح', kind: 'hadith' },
  { id: 'r-h-witr', title: 'العشر الأواخر', text: 'تَحَرَّوْا لَيْلَةَ الْقَدْرِ فِي الْوِتْرِ مِنَ الْعَشْرِ الْأَوَاخِرِ مِنْ رَمَضَانَ', source: 'رواه البخاري (2017)', kind: 'hadith' },
  { id: 'r-d-iftar', title: 'دعاء الإفطار', text: 'ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ', source: 'رواه أبو داود (2357)، وحسّنه الألباني', kind: 'dua' },
  { id: 'r-d-afw', title: 'دعاء ليلة القدر', text: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', source: 'رواه الترمذي (3513) وابن ماجه (3850)، وصححه الألباني', kind: 'dua' },
  { id: 'r-h-shawwal', title: 'ست من شوال', text: 'مَنْ صَامَ رَمَضَانَ ثُمَّ أَتْبَعَهُ سِتًّا مِنْ شَوَّالٍ كَانَ كَصِيَامِ الدَّهْرِ', source: 'رواه مسلم (1164)', kind: 'hadith' },
  { id: 'r-greet-5', title: 'تقبّل الله', text: 'تقبّل الله منا ومنكم الصيام والقيام وصالح الأعمال', source: 'تهنئة', kind: 'greeting' },
  { id: 'r-greet-6', title: 'سحور مبارك', text: 'سحورًا مباركًا\nلا تنسونا من صالح دعائكم', source: 'تهنئة', kind: 'greeting' },
  { id: 'r-greet-7', title: 'إفطار شهي', text: 'تقبّل الله صيامكم\nوأفطرتم على خير', source: 'تهنئة', kind: 'greeting' },
]

export const EID_CARDS: ShareCard[] = [
  { id: 'e-greet-1', title: 'عيد مبارك', text: 'عِيدٌ مُبَارَكٌ\nتقبّل الله منا ومنكم', source: 'تهنئة', kind: 'greeting' },
  { id: 'e-greet-2', title: 'كل عام وأنتم بخير', text: 'كل عام وأنتم بخير\nأعاده الله علينا وعليكم باليمن والبركات', source: 'تهنئة', kind: 'greeting' },
  { id: 'e-greet-3', title: 'عيد سعيد', text: 'عيدكم سعيد\nوأيامكم عامرة بالطاعة والفرح', source: 'تهنئة', kind: 'greeting' },
  { id: 'e-q-takbir', title: 'ولتكبروا الله', quran: { surah: 2, from: 185, to: 185 }, source: 'سورة البقرة: 185', kind: 'quran' },
  { id: 'e-q-hajj', title: 'عيد الأضحى', quran: { surah: 22, from: 37, to: 37 }, source: 'سورة الحج: 37', kind: 'quran' },
]

export const FRIDAY_CARDS: ShareCard[] = [
  { id: 'f-greet', title: 'جمعة مباركة', text: 'جُمُعَةٌ مُبَارَكَةٌ\nأكثروا فيها من الصلاة على النبي ﷺ', source: 'تهنئة', kind: 'greeting' },
  { id: 'f-q-9', title: 'يوم الجمعة', quran: { surah: 62, from: 9, to: 9 }, source: 'سورة الجمعة: 9', kind: 'quran' },
  { id: 'f-q-salat', title: 'الصلاة على النبي ﷺ', quran: { surah: 33, from: 56, to: 56 }, source: 'سورة الأحزاب: 56', kind: 'quran' },
  { id: 'f-h-kahf', title: 'سورة الكهف', text: 'مَنْ قَرَأَ سُورَةَ الْكَهْفِ فِي يَوْمِ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ', source: 'رواه الحاكم والبيهقي، وصححه الألباني (صحيح الجامع 6470)', kind: 'hadith' },
  { id: 'f-h-salat', title: 'صلاة واحدة', text: 'مَنْ صَلَّى عَلَيَّ صَلَاةً وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ عَشْرًا', source: 'رواه مسلم (408)', kind: 'hadith' },
]

/** البطاقات المصوّرة (قياس القصص): تهانٍ بخط الرقعة أو الكوفي، وأدعية وأحاديث قصيرة بتخريجها — فوق مشاهد مرسومة */
export interface PosterCard {
  id: string
  occasion: 'ramadan' | 'eid' | 'friday'
  scene: import('../services/posterArt').PosterScene
  text: import('../services/posterArt').PosterText
}
export const POSTER_CARDS: PosterCard[] = [
  { id: 'p-r-kareem', occasion: 'ramadan', scene: 'alley', text: { headline: 'رمضان كريم', sub: 'أعاده الله علينا وعليكم بالخير والبركات', style: 'kufi' } },
  { id: 'p-r-awwad', occasion: 'ramadan', scene: 'mudhouse', text: { headline: 'عساكم من عوّاده', style: 'ruqaa' } },
  { id: 'p-r-taqabbal', occasion: 'ramadan', scene: 'desert', text: { headline: 'تقبّل الله منا ومنكم صالح الأعمال والطاعات', style: 'ruqaa' } },
  { id: 'p-r-mubarak', occasion: 'ramadan', scene: 'dusk', text: { headline: 'رمضان مبارك', sub: 'Ramadan Mubarak', style: 'kufi' } },
  { id: 'p-r-shahr', occasion: 'ramadan', scene: 'crimson', text: { headline: 'مبارك عليكم الشهر', style: 'ruqaa' } },
  { id: 'p-r-ahlan', occasion: 'ramadan', scene: 'lanterns', text: { headline: 'أهلًا رمضان', sub: 'شهر الخير والقرآن', style: 'kufi' } },
  { id: 'p-r-iftar', occasion: 'ramadan', scene: 'sufra', text: { headline: 'إفطارًا شهيًا', sub: 'وتقبّل الله صيامكم', style: 'ruqaa' } },
  { id: 'p-r-kul', occasion: 'ramadan', scene: 'emerald', text: { headline: 'كل عام وأنتم بخير', sub: 'وإلى الله أقرب', style: 'ruqaa' } },
  { id: 'p-r-afw', occasion: 'ramadan', scene: 'archway', text: { headline: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', source: 'رواه الترمذي (3513) وابن ماجه (3850)', style: 'naskh' } },
  { id: 'p-r-zama', occasion: 'ramadan', scene: 'sufra', text: { headline: 'ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ', source: 'دعاء الإفطار — رواه أبو داود (2357)', style: 'naskh' } },
  { id: 'p-r-iman', occasion: 'ramadan', scene: 'desert', text: { headline: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ', source: 'متفق عليه: البخاري (38) ومسلم (760)', style: 'naskh' } },
  { id: 'p-r-suhoor', occasion: 'ramadan', scene: 'lanterns', text: { headline: 'تَسَحَّرُوا فَإِنَّ فِي السَّحُورِ بَرَكَةً', source: 'متفق عليه: البخاري (1923) ومسلم (1095)', style: 'naskh' } },
  { id: 'p-e-mubarak', occasion: 'eid', scene: 'crimson', text: { headline: 'عيد مبارك', sub: 'تقبّل الله منا ومنكم', style: 'kufi' } },
  { id: 'p-e-eidkum', occasion: 'eid', scene: 'dusk', text: { headline: 'عيدكم مبارك', sub: 'وأيامكم سعيدة', style: 'ruqaa' } },
  { id: 'p-e-taqabbal', occasion: 'eid', scene: 'emerald', text: { headline: 'تقبّل الله منا ومنكم', style: 'ruqaa' } },
  { id: 'p-e-kul', occasion: 'eid', scene: 'lanterns', text: { headline: 'كل عام وأنتم بخير', style: 'kufi' } },
  { id: 'p-f-jumua', occasion: 'friday', scene: 'emerald', text: { headline: 'جمعة مباركة', style: 'ruqaa' } },
  { id: 'p-f-salat', occasion: 'friday', scene: 'archway', text: { headline: 'جمعة مباركة', sub: 'أكثروا فيها من الصلاة على النبي ﷺ', style: 'kufi' } },
  { id: 'p-f-allahumma', occasion: 'friday', scene: 'dusk', text: { headline: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', style: 'naskh' } },
]

/** صور الخلفيات (أرسلها صاحب التطبيق لاستعمالها في البطاقات) — في public/card-photos */
export const CARD_PHOTOS = ['p00', 'p01', 'p03', 'p04', 'p05', 'p07', 'p08', 'p09', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p18', 'p19', 'p20', 'p21', 'p22', 'p23', 'p24', 'p25', 'p26', 'p27', 'p28', 'p29', 'p30', 'p31', 'p32', 'p33', 'p34', 'p35', 'p36', 'p37', 'p38', 'p39', 'p40', 'p41', 'p42', 'p43', 'p44', 'p45', 'p46', 'p47', 'p48', 'p49', 'p50', 'p51', 'p52', 'p53', 'p54', 'p55', 'p56']

/** بطاقات جاهزة بنصوصها (صور كاملة) */
export const READY_CARDS: { id: string; label: string; occasion: 'ramadan' | 'eid' }[] = [
  { id: 'r00', label: 'رمضان كريم — مبارك عليكم الشهر', occasion: 'ramadan' },
  { id: 'r01', label: 'تقبّل الله طاعاتكم', occasion: 'ramadan' },
  { id: 'r02', label: 'كل عام وأنتم بخير', occasion: 'ramadan' },
  { id: 'r07', label: 'رمضان كريم', occasion: 'ramadan' },
  { id: 'r08', label: 'اللهم اجعلنا من عتقائك من النار', occasion: 'ramadan' },
  { id: 'r09', label: 'اللهم ارزقنا الخير في الدنيا والآخرة', occasion: 'ramadan' },
  { id: 'r10', label: 'مبارك عليكم الشهر', occasion: 'ramadan' },
  { id: 'r12', label: 'كل عام وأنتم بخير', occasion: 'ramadan' },
  { id: 'r13', label: 'اللهم اجعل أيامنا في رمضان أقرب إليك', occasion: 'ramadan' },
  { id: 'r14', label: 'رمضان كريم — تقبّل الله طاعاتكم', occasion: 'ramadan' },
  { id: 'r06', label: 'عيدكم مبارك', occasion: 'eid' },
  { id: 'r11', label: 'تقبّل الله منا ومنكم', occasion: 'eid' },
  { id: 'r15', label: 'عيدكم مبارك', occasion: 'eid' },
]
