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
};
