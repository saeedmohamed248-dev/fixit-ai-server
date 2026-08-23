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
    taglineAr: 'بوابة تصدير قطع غيار BMW & MINI بالجملة',
    taglineEn: 'BMW & MINI Parts — Global Wholesale Export',
    whatsapp: '971558803171',      // ← رقم واتساب فرع الجملة (كود الدولة من غير + أو مسافات)
    phoneDisplay: '+971 55 880 3171', // ← الرقم زي ما بيتعرض للعميل
    email: 'trade@fixitauto.parts',
    usdRate: 3.6725,               // كام درهم في الدولار الواحد (الدولار بيتحسب من الدرهم)
    addressAr: 'المنطقة الحرة، دبي، الإمارات',
    addressEn: 'Free Zone, Dubai, UAE',
    minOrderNote: true,            // إظهار ملاحظة "أسعار جملة — الطلب بيتأكد على واتساب"
    // 📊 تسعير متدرّج حسب الكمية — كل ما الكمية تكبر السعر يقل (خصم % على سعر الجملة الأساسي)
    tiers: [
      { min: 1, off: 0 },
      { min: 10, off: 8 },
      { min: 50, off: 15 },
      { min: 100, off: 22 },
    ],
    moq: 1,                        // أقل كمية للطلب لكل صنف (Minimum Order Quantity)
    // 🌍 لوحة الثقة الدولية — بيانات ثابتة تظهر للتجار
    trust: {
      leadTimeAr: '3–7 أيام عمل', leadTimeEn: '3–7 business days',
      shippingAr: 'شحن جوي وبحري لكل البلاد', shippingEn: 'Air & sea freight worldwide',
      paymentAr: 'تحويل بنكي / T-T • دفعة مقدّمة', paymentEn: 'Bank transfer / T-T • deposit',
      cartonAr: 'تغليف تصدير بالكرتونة', cartonEn: 'Export carton packing',
      countriesAr: '20+ دولة', countriesEn: '20+ countries',
      warrantyAr: 'ضمان أصلي على القطع الجديدة', warrantyEn: 'Genuine warranty on new parts',
    },
  },
};
