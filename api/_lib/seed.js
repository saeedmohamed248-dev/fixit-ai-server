// بيانات أولية للمنتجات — تظهر في أول تشغيل، وتقدر تعدّلها من لوحة التحكم
export const CATEGORIES = [
  'فرامل',
  'فلاتر وصيانة',
  'عفشة وتعليق',
  'كهرباء وإشعال',
  'تبريد',
  'وقود',
  'هيكل وإكسسوارات',
];

export const SEED_PRODUCTS = [
  {
    id: 'p1', sku: 'BP-34116850568', name: 'طقم تيل فرامل أمامي Brembo',
    brand: 'BMW', models: ['F30', 'F10', 'F32'], category: 'فرامل', condition: 'new',
    price: 3400, oldPrice: 3900, stock: 8, oem: '34116850568', image: '',
    description: 'طقم تيل فرامل أمامي بريمبو أصلي، مناسب لموديلات F30 و F10 و F32. صناعة إيطالية بضمان سنة.',
  },
  {
    id: 'p2', sku: 'BP-34216790966', name: 'تيل فرامل خلفي أصلي',
    brand: 'BMW', models: ['E90', 'E92'], category: 'فرامل', condition: 'new',
    price: 2100, oldPrice: 0, stock: 12, oem: '34216790966', image: '',
    description: 'تيل فرامل خلفي أصلي BMW لموديلات E90 و E92، وارد ألمانيا.',
  },
  {
    id: 'p3', sku: 'BP-34116794429', name: 'هوبات فرامل أمامية (طقم)',
    brand: 'BMW', models: ['F10', 'F11'], category: 'فرامل', condition: 'new',
    price: 5200, oldPrice: 5800, stock: 4, oem: '34116794429', image: '',
    description: 'طقم أقراص (هوبات) فرامل أمامية مقاس 348مم لموديلات F10 و F11.',
  },
  {
    id: 'p4', sku: 'FL-HU6004X', name: 'فلتر زيت محرك MANN',
    brand: 'BMW', models: ['F30', 'F10', 'X1'], category: 'فلاتر وصيانة', condition: 'new',
    price: 450, oldPrice: 0, stock: 30, oem: '11428583898', image: '',
    description: 'فلتر زيت MANN الألماني لمحركات N20 و N26 و B48. الأعلى جودة في فئته.',
  },
  {
    id: 'p5', sku: 'FL-13718577171', name: 'فلتر هواء محرك B48/B58',
    brand: 'BMW', models: ['G20', 'G30', 'X3'], category: 'فلاتر وصيانة', condition: 'new',
    price: 750, oldPrice: 0, stock: 20, oem: '13718577171', image: '',
    description: 'فلتر هواء أصلي لمحركات B48 و B58، مناسب للفئات G20 و G30 و X3 الجديدة.',
  },
  {
    id: 'p6', sku: 'CO-11517586925', name: 'طلمبة مياه كهربائية',
    brand: 'BMW', models: ['E90', 'E60', 'X3'], category: 'تبريد', condition: 'used',
    price: 4800, oldPrice: 0, stock: 3, oem: '11517586925', image: '',
    description: 'طلمبة مياه كهربائية لمحرك N52، مستعمل وارد أوروبا بحالة ممتازة، مفحوصة بالكامل.',
  },
  {
    id: 'p7', sku: 'SU-31316873765', name: 'مساعدين أمامي (زوج)',
    brand: 'BMW', models: ['F30', 'F31'], category: 'عفشة وتعليق', condition: 'used',
    price: 6500, oldPrice: 0, stock: 2, oem: '31316873765', image: '',
    description: 'زوج مساعدين أمامي أصلي فبريكا، مستعمل وارد ألمانيا، حالة ممتازة بدون تهريب.',
  },
  {
    id: 'p8', sku: 'SU-E46-ARM', name: 'مقصات أمامية كاملة بالجلد',
    brand: 'BMW', models: ['E46'], category: 'عفشة وتعليق', condition: 'used',
    price: 3800, oldPrice: 0, stock: 5, oem: '31126757623', image: '',
    description: 'طقم مقصات أمامية كامل للـ E46 بالجلد والبيضات، مستعمل وارد بحالة الزيرو.',
  },
  {
    id: 'p9', sku: 'AC-64529399060', name: 'كمبروسر تكييف Denso',
    brand: 'BMW', models: ['F10', 'F30'], category: 'تبريد', condition: 'used',
    price: 9500, oldPrice: 11000, stock: 2, oem: '64529399060', image: '',
    description: 'كمبروسر تكييف دينسو مستعمل وارد، مفحوص على جهاز الشحن ويعمل بكفاءة 100%.',
  },
  {
    id: 'p10', sku: 'EL-R56-ALT', name: 'دينامو (مولد كهرباء)',
    brand: 'MINI', models: ['R56', 'R55'], category: 'كهرباء وإشعال', condition: 'used',
    price: 4200, oldPrice: 0, stock: 3, oem: '12317576514', image: '',
    description: 'دينامو ميني كوبر R56 مستعمل وارد أوروبا، مفحوص ومضمون شهر.',
  },
  {
    id: 'p11', sku: 'EL-F56-START', name: 'مارش (سلف) جديد',
    brand: 'MINI', models: ['F56', 'F55'], category: 'كهرباء وإشعال', condition: 'new',
    price: 5600, oldPrice: 0, stock: 4, oem: '12418645324', image: '',
    description: 'مارش جديد لميني كوبر F55 و F56، صناعة Valeo بضمان سنة.',
  },
  {
    id: 'p12', sku: 'EL-0258017025', name: 'حساس أكسجين Bosch',
    brand: 'BMW', models: ['E90', 'E92', 'E60'], category: 'كهرباء وإشعال', condition: 'new',
    price: 2900, oldPrice: 3300, stock: 10, oem: '11787558073', image: '',
    description: 'حساس أكسجين (لامدا) بوش أصلي، قبل الكتليزر، لمحركات N52 و N53.',
  },
  {
    id: 'p13', sku: 'IG-NGK-B58', name: 'طقم بوجيهات NGK (6 قطع)',
    brand: 'BMW', models: ['G20', 'G30', 'X5'], category: 'كهرباء وإشعال', condition: 'new',
    price: 3600, oldPrice: 0, stock: 15, oem: '12120040551', image: '',
    description: 'طقم 6 بوجيهات NGK ليزر بلاتينيوم لمحرك B58، الأصلية من مصنع BMW.',
  },
  {
    id: 'p14', sku: 'IG-12138616153', name: 'طقم كويلات إشعال (6 قطع)',
    brand: 'BMW', models: ['F30', 'F10', 'X6'], category: 'كهرباء وإشعال', condition: 'new',
    price: 7200, oldPrice: 8000, stock: 6, oem: '12138616153', image: '',
    description: 'طقم كويلات Delphi لمحرك N55، بديل أصلي بضمان سنة كاملة.',
  },
  {
    id: 'p15', sku: 'BD-F30-MIRROR', name: 'غطاء مراية كربون (زوج)',
    brand: 'BMW', models: ['F30', 'F32', 'F36'], category: 'هيكل وإكسسوارات', condition: 'new',
    price: 2500, oldPrice: 0, stock: 7, oem: '', image: '',
    description: 'زوج غطاء مرايات كربون فايبر حقيقي لموديلات F30 و F32، تركيب مباشر بدون تعديل.',
  },
  {
    id: 'p16', sku: 'BD-51138072085', name: 'شبكة أمامية (كلاوي) G20',
    brand: 'BMW', models: ['G20'], category: 'هيكل وإكسسوارات', condition: 'new',
    price: 4800, oldPrice: 0, stock: 5, oem: '51138072085', image: '',
    description: 'كلاوي أسود لامع (Shadow Line) للفئة الثالثة G20، خامة أصلية.',
  },
  {
    id: 'p17', sku: 'LT-F30-LCI', name: 'فانوس أمامي LED يمين',
    brand: 'BMW', models: ['F30'], category: 'هيكل وإكسسوارات', condition: 'used',
    price: 14500, oldPrice: 0, stock: 1, oem: '63117419634', image: '',
    description: 'فانوس أمامي LED أصلي للـ F30 LCI (الشكل الجديد)، مستعمل وارد بحالة ممتازة بدون كسور.',
  },
  {
    id: 'p18', sku: 'CO-17117600511', name: 'ردياتير مياه أصلي',
    brand: 'BMW', models: ['F30', 'F20', 'F22'], category: 'تبريد', condition: 'new',
    price: 6800, oldPrice: 7500, stock: 4, oem: '17117600511', image: '',
    description: 'ردياتير مياه أصلي لموديلات F20 و F22 و F30، وارد ألمانيا بالكرتونة.',
  },
  {
    id: 'p19', sku: 'FU-R56-PUMP', name: 'طرمبة بنزين كاملة',
    brand: 'MINI', models: ['R56', 'R57'], category: 'وقود', condition: 'used',
    price: 3200, oldPrice: 0, stock: 3, oem: '16112755082', image: '',
    description: 'طرمبة بنزين كاملة بالعوامة لميني كوبر R56، مستعمل وارد مفحوص.',
  },
  {
    id: 'p20', sku: 'SU-X5-REAR', name: 'عفشة خلفية كاملة X5',
    brand: 'BMW', models: ['X5'], category: 'عفشة وتعليق', condition: 'used',
    price: 18500, oldPrice: 0, stock: 1, oem: '', image: '',
    description: 'عفشة خلفية كاملة (مقصات + مساعدين + أكصات) للـ X5 E70، وارد أمريكا بحالة ممتازة.',
  },
];
