// ⚙️ إعدادات الموقع — عدّل البيانات دي على راحتك
window.SITE = {
  name: 'FixIt',
  nameAr: 'فيكس إت',
  slogan: 'قطع غيار BMW & MINI — استيراد جديد ومستعمل',
  sloganEn: 'BMW & MINI Parts — New & Used Import',
  // رقم الواتساب (بكود الدولة من غير + أو مسافات)
  whatsapp: '201125157767',
  phoneDisplay: '01125157767',
  address: 'القاهرة، مصر',
  addressEn: 'Cairo, Egypt',
  currency: 'ج.م',
  currencyEn: 'EGP',
  // طرق الدفع بالتحويل — الأرقام اللي العميل هيحوّل عليها
  instapay: '01125157767',
  wallet: '01125157767', // فودافون كاش / محافظ إلكترونية
  // الشحن
  freeShippingOver: 5000, // شحن مجاني فوق المبلغ ده (0 = إلغاء الخاصية)
  // رفع الصور المباشر (Cloudinary) — قيم عامة آمنة مش أسرار
  cloudinary: {
    cloudName: 'gbooxyif',        // Cloud Name من داشبورد Cloudinary
    uploadPreset: 'fixit_unsigned', // اسم الـ Unsigned Upload Preset
  },
  // 🇦🇪 فرع الجملة (الإمارات) — FixIt Trade — بيع جملة للإمارات ومصر وروسيا وكل البلاد
  wholesale: {
    brandAr: 'فيكس إت تريد',
    brandEn: 'FixIt Trade',
    taglineAr: 'جملة قطع غيار BMW & MINI مستعملة (وارد) — تصدير للعالم',
    taglineEn: 'Wholesale Used BMW & MINI Parts — Global Export',
    whatsapp: '971558803171',      // ← رقم واتساب فرع الجملة (كود الدولة من غير + أو مسافات)
    phoneDisplay: '+971 55 880 3171', // ← الرقم زي ما بيتعرض للعميل
    email: 'trade@fixitauto.parts',
    usdRate: 3.6725,               // كام درهم في الدولار الواحد (الدولار بيتحسب من الدرهم)
    addressAr: 'المنطقة الحرة، الشارقة، الإمارات',
    addressEn: 'Free Zone, Sharjah, UAE',
    minOrderNote: true,            // إظهار ملاحظة "أسعار جملة — الطلب بيتأكد على واتساب"
    // 💵 شروط الدفع حسب الدولة:
    // مصر: دفعة مقدّمة + الباقي عند وصول الجمارك.
    // أي دولة تانية: دفع كامل مقدّماً، ونشحن ونبعت البوليصة (غير مسؤولين بعد الشحن).
    payment: {
      EG: { depositPct: 65, balancePct: 35 },
      DEFAULT: { fullUpfront: true },
    },
    // 📊 تسعير متدرّج حسب الكمية — كل ما الكمية تكبر السعر يقل (خصم % على سعر الجملة الأساسي)
    tiers: [
      { min: 1, off: 0 },
      { min: 10, off: 8 },
      { min: 50, off: 15 },
      { min: 100, off: 22 },
    ],
    moq: 1,                        // أقل كمية للطلب لكل صنف (Minimum Order Quantity)
    // 🚢 الحاويات — الحجم القابل للتحميل فعلياً (CBM) وسقف الوزن
    containers: [
      { code: '20GP', nameAr: 'حاوية 20 قدم', nameEn: "20ft", usableCbm: 28, maxKg: 28000, sort: 1 },
      { code: '40GP', nameAr: 'حاوية 40 قدم', nameEn: "40ft", usableCbm: 58, maxKg: 26500, sort: 2 },
      { code: '40HC', nameAr: 'حاوية 40 قدم عالية', nameEn: "40ft HC", usableCbm: 68, maxKg: 26000, sort: 3 },
    ],
    lclMaxCbm: 15,          // أقل من كده = شحن مجمّع LCL
    leadBufferPct: 40,      // هامش احتياطي (30–50%) يضاف على مدة الشحن اللي يقدّرها البوت
    // 💵 أسعار الشحن من دبي لكل وجهة (بالدولار) — عدّلها أو حدّثها دورياً
    freight: {
      markupPct: 30,        // هامش المنصة على تكلفة الشحن
      insurancePct: 1,      // نسبة التأمين من قيمة (بضاعة + شحن) لـ CIF/DDP
      lanes: {
        EG: { port: 'الإسكندرية', fcl: { '20GP': 1400, '40GP': 2300, '40HC': 2500 }, lclPerCbm: 95, minCharge: 350 },
        RU: { port: 'نوفوروسيسك', fcl: { '20GP': 2600, '40GP': 4100, '40HC': 4400 }, lclPerCbm: 140, minCharge: 500 },
        DEFAULT: { port: 'أقرب ميناء', fcl: { '20GP': 2200, '40GP': 3600, '40HC': 3900 }, lclPerCbm: 130, minCharge: 480 },
      },
    },
    // 📜 شروط التسليم المتاحة (Incoterms)
    incoterms: {
      FOB: { nameAr: 'تسليم ميناء دبي (FOB)', nameEn: 'FOB Dubai', freight: false, insurance: false, customs: false },
      CIF: { nameAr: 'شحن حتى ميناء الوصول (CIF)', nameEn: 'CIF Port', freight: true, insurance: true, customs: false },
      DDP: { nameAr: 'توصيل للباب شامل الجمارك (DDP)', nameEn: 'DDP Door', freight: true, insurance: true, customs: true },
    },
    // 🌍 سياسة كل دولة: أي شروط تسليم مسموحة + هل نقدّر الجمارك
    countryPolicy: {
      EG: { incoterms: ['FOB', 'CIF', 'DDP'], customs: true },
      RU: { incoterms: ['FOB', 'CIF'], customs: false },
      DEFAULT: { incoterms: ['FOB', 'CIF'], customs: false },
    },
    // 🛃 تقدير الجمارك (للدول اللي customs=true).
    // نسبة الجمرك (duty) بتتحدد لكل منتج من لوحة التحكم (customsPct).
    // هنا الضريبة ورسوم التخليص على مستوى الدولة فقط.
    customs: {
      EG: { vatPct: 14, clearanceUsd: 150 },
    },
    // 🌍 لوحة الثقة الدولية — بيانات ثابتة تظهر للتجار
    trust: {
      leadTimeAr: 'حسب الوجهة والشحن — تُحسب عند الطلب', leadTimeEn: 'By destination & mode — quoted at checkout',
      shippingAr: 'شحن جوي وبحري لكل البلاد', shippingEn: 'Air & sea freight worldwide',
      paymentAr: 'مصر: 65% مقدّم + 35% عند الجمارك · باقي الدول: 100% مقدّم', paymentEn: 'Egypt: 65% + 35% on customs · Others: 100% upfront',
      cartonAr: 'تغليف تصدير بالكرتونة', cartonEn: 'Export carton packing',
      countriesAr: '20+ دولة', countriesEn: '20+ countries',
      warrantyAr: 'قطع مفحوصة ومضمونة', warrantyEn: 'Tested & guaranteed parts',
      conditionAr: 'مستعمل وارد — درجة أولى', conditionEn: 'Grade-A used import',
    },
  },
};
