// أسماء عربية لأهم المدن (المفتاح: رمز الدولة:الاسم كما في GeoNames).
// بقية المدن تُعرض باسمها اللاتيني ويمكن البحث عنها به.
export const CITY_NAMES_AR: Record<string, string> = {
  // فلسطين
  'PS:Jerusalem (Al-Quds)': 'القدس', 'PS:Gaza': 'غزة', 'PS:Nablus': 'نابلس', 'PS:Hebron': 'الخليل', 'PS:Khān Yūnis': 'خان يونس',
  'PS:Jabālyā': 'جباليا', 'PS:Rafaḩ': 'رفح', 'PS:Dayr al Balaḩ': 'دير البلح', 'PS:Bayt Lāhyā': 'بيت لاهيا', 'PS:Ţūlkarm': 'طولكرم',
  'PS:Qalqīlyah': 'قلقيلية', 'PS:Yuta': 'يطا', 'PS:Al Bīrah': 'البيرة', 'PS:Bayt Ḩānūn': 'بيت حانون', 'PS:An Nuşayrāt': 'النصيرات',
  'PS:Al Burayj': 'البريج', 'PS:Janīn': 'جنين', 'PS:Banī Suhaylā': 'بني سهيلا', 'PS:Bethlehem': 'بيت لحم', 'PS:Az̧ Z̧āhirīyah': 'الظاهرية',
  'PS:Ramallah': 'رام الله', 'PS:Ḩalḩūl': 'حلحول', 'PS:Dūrā': 'دورا', 'PS:Banī Na‘īm': 'بني نعيم', 'PS:Jericho': 'أريحا',
  'PS:Qabāţīyah': 'قباطية', 'PS:Idhnā': 'إذنا', 'PS:Sa‘īr': 'سعير', 'PS:Al ‘Ayzarīyah': 'العيزرية', 'PS:Bayt Jālā': 'بيت جالا',
  'PS:Ţūbās': 'طوباس', 'PS:Salfīt': 'سلفيت', 'PS:Bayt Sāḩūr': 'بيت ساحور', 'PS:As Samū‘': 'السموع', 'PS:Balāţah': 'بلاطة',
  'PS:Al Yāmūn': 'اليامون', 'PS:Al Qarārah': 'القرارة', 'PS:Az Zuwāydah': 'الزوايدة', 'PS:Ar Rām wa Ḑāḩiyat al Barīd': 'الرام وضاحية البريد',
  'PS:Kalandia': 'قلنديا', 'PS:‘Abasān al Kabīrah': 'عبسان الكبيرة',
  // الأردن
  'JO:Amman': 'عمّان', 'JO:Zarqa': 'الزرقاء', 'JO:Irbid': 'إربد', 'JO:Russeifa': 'الرصيفة', 'JO:Aqaba': 'العقبة', 'JO:Mādabā': 'مأدبا', 'JO:As Salţ': 'السلط', 'JO:Mafraq': 'المفرق', 'JO:Jarash': 'جرش',   // السعودية
  'SA:Riyadh': 'الرياض', 'SA:Jeddah': 'جدة', 'SA:Mecca': 'مكة المكرمة', 'SA:Medina': 'المدينة المنورة', 'SA:Dammam': 'الدمام', 'SA:Ta’if': 'الطائف',
  'SA:Tabuk': 'تبوك', 'SA:Buraydah': 'بريدة', 'SA:Khamis Mushait': 'خميس مشيط', 'SA:Al Hufūf': 'الهفوف', 'SA:Al Mubarraz': 'المبرز', 'SA:Hafar Al-Batin': 'حفر الباطن',
  'SA:Ha\'il': 'حائل', 'SA:Najrān': 'نجران', 'SA:Abha': 'أبها', 'SA:Yanbu': 'ينبع', 'SA:Khobar': 'الخبر', 'SA:Jizan': 'جازان', 'SA:Al Qaţīf': 'القطيف', 'SA:Dhahran': 'الظهران',
  // الخليج واليمن
  'AE:Dubai': 'دبي', 'AE:Abu Dhabi': 'أبوظبي', 'AE:Sharjah': 'الشارقة', 'AE:Al Ain City': 'العين', 'AE:Ajman City': 'عجمان', 'AE:Ras Al Khaimah City': 'رأس الخيمة',
  'KW:Kuwait City': 'مدينة الكويت', 'KW:Al Aḩmadī': 'الأحمدي', 'KW:Ḩawallī': 'حولي', 'QA:Doha': 'الدوحة', 'QA:Ar Rayyān': 'الريان', 'BH:Manama': 'المنامة', 'BH:Al Muharraq': 'المحرق',
  'OM:Muscat': 'مسقط', 'OM:Seeb': 'السيب', 'OM:Şalālah': 'صلالة', 'OM:Sohar': 'صحار',
  'YE:Sanaa': 'صنعاء', 'YE:Aden': 'عدن', 'YE:Ta‘izz': 'تعز', 'YE:Al Ḩudaydah': 'الحديدة', 'YE:Mukalla': 'المكلا', 'YE:Ibb': 'إب',
  // العراق وسوريا ولبنان
  'IQ:Baghdad': 'بغداد', 'IQ:Basrah': 'البصرة', 'IQ:Mosul': 'الموصل', 'IQ:Erbil': 'أربيل', 'IQ:Kirkuk': 'كركوك', 'IQ:Najaf': 'النجف', 'IQ:Karbala': 'كربلاء', 'IQ:As Sulaymānīyah': 'السليمانية', 'IQ:Al Fallūjah': 'الفلوجة', 'IQ:Ramadi': 'الرمادي',
  'SY:Damascus': 'دمشق', 'SY:Aleppo': 'حلب', 'SY:Homs': 'حمص', 'SY:Ḩamāh': 'حماة', 'SY:Latakia': 'اللاذقية', 'SY:Deir ez-Zor': 'دير الزور', 'SY:Ar Raqqah': 'الرقة', 'SY:Idlib': 'إدلب', 'SY:Dar‘ā': 'درعا', 'SY:Tartouss': 'طرطوس',
  'LB:Beirut': 'بيروت', 'LB:Tripoli': 'طرابلس', 'LB:Sidon': 'صيدا', 'LB:Tyre': 'صور', 'LB:Zahlé': 'زحلة',
  // مصر والسودان
  'EG:Cairo': 'القاهرة', 'EG:Alexandria': 'الإسكندرية', 'EG:Giza': 'الجيزة', 'EG:Port Said': 'بورسعيد', 'EG:Suez': 'السويس', 'EG:Luxor': 'الأقصر', 'EG:Asyūţ': 'أسيوط', 'EG:Al Manşūrah': 'المنصورة', 'EG:Aswan': 'أسوان', 'EG:Al Fayyūm': 'الفيوم', 'EG:Zagazig': 'الزقازيق', 'EG:Ismailia': 'الإسماعيلية', 'EG:Damanhūr': 'دمنهور', 'EG:Al Minyā': 'المنيا',
  'SD:Khartoum': 'الخرطوم', 'SD:Omdurman': 'أم درمان', 'SD:Port Sudan': 'بورتسودان', 'SD:Kassala': 'كسلا',   // المغرب العربي
  'LY:Tripoli': 'طرابلس', 'LY:Benghazi': 'بنغازي', 'LY:Mişrātah': 'مصراتة',
  'TN:Tunis': 'تونس', 'TN:Sfax': 'صفاقس', 'TN:Sousse': 'سوسة', 'TN:Kairouan': 'القيروان', 'TN:Bizerte': 'بنزرت',
  'DZ:Algiers': 'الجزائر', 'DZ:Oran': 'وهران', 'DZ:Constantine': 'قسنطينة', 'DZ:Annaba': 'عنابة', 'DZ:Blida': 'البليدة', 'DZ:Batna': 'باتنة', 'DZ:Sétif': 'سطيف', 'DZ:Tlemcen': 'تلمسان',
  'MA:Casablanca': 'الدار البيضاء', 'MA:Rabat': 'الرباط', 'MA:Fès': 'فاس', 'MA:Marrakesh': 'مراكش', 'MA:Tangier': 'طنجة', 'MA:Meknès': 'مكناس', 'MA:Agadir': 'أكادير', 'MA:Oujda-Angad': 'وجدة', 'MA:Kenitra': 'القنيطرة', 'MA:Tétouan': 'تطوان',
  'MR:Nouakchott': 'نواكشوط', 'SO:Mogadishu': 'مقديشو', 'DJ:Djibouti': 'جيبوتي', 'KM:Moroni': 'موروني',
  // مدن ذات حضور إسلامي كبير
  'TR:Istanbul': 'إسطنبول', 'TR:Ankara': 'أنقرة', 'TR:İzmir': 'إزمير', 'TR:Bursa': 'بورصة', 'TR:Gaziantep': 'غازي عنتاب', 'TR:Konya': 'قونية',
  'IR:Tehran': 'طهران', 'PK:Karachi': 'كراتشي', 'PK:Lahore': 'لاهور', 'PK:Islamabad': 'إسلام آباد', 'AF:Kabul': 'كابل',
  'ID:Jakarta': 'جاكرتا', 'MY:Kuala Lumpur': 'كوالالمبور', 'BD:Dhaka': 'دكا', 'IN:New Delhi': 'نيودلهي', 'IN:Mumbai': 'مومباي',
  'GB:London': 'لندن', 'FR:Paris': 'باريس', 'DE:Berlin': 'برلين', 'SE:Stockholm': 'ستوكهولم', 'NL:Amsterdam': 'أمستردام', 'BE:Brussels': 'بروكسل',
  'US:New York City': 'نيويورك', 'US:Chicago': 'شيكاغو', 'US:Los Angeles': 'لوس أنجلوس', 'US:Houston': 'هيوستن', 'US:Dearborn': 'ديربورن', 'CA:Toronto': 'تورونتو', 'CA:Montréal': 'مونتريال',
  'AU:Sydney': 'سيدني', 'AU:Melbourne': 'ملبورن', 'RU:Moscow': 'موسكو', 'NG:Lagos': 'لاغوس', 'NG:Kano': 'كانو', 'SN:Dakar': 'داكار',
  'IL:Haifa': 'حيفا', 'IL:Nazareth': 'الناصرة', 'IL:Tel Aviv': 'تل أبيب', 'IL:Jaffa': 'يافا', 'IL:Lod': 'اللد', 'IL:Ramla': 'الرملة', }
