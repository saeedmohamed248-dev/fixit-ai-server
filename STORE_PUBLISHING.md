# 🏪 نشر تطبيق FixIt على Google Play & App Store

دليل النشر الكامل. الجزء التقني كله متجهّز — دورك بس تفتح الحسابات وترفع وتدوس Submit.

---

## 📋 تقسيم الشغل

| 🤖 متجهّز لك بالفعل | 🙋 دورك انت (كليكات بسيطة) |
|---|---|
| الكود + مشروع أندرويد/iOS | فتح حساب مطوّر + الدفع |
| الأيقونات + شاشة البداية | رفع الملف + Submit |
| نصوص المتجر (تحت جاهزة) | تحقّق الهوية |
| إعداد النسخة الموقّعة | تصوير 3–4 سكرين شوت للتطبيق |

---

## 1) 📝 نصوص المتجر — جاهزة للنسخ

### اسم التطبيق (Title)
```
FixIt: BMW & MINI Parts
```

### وصف قصير (Short description — جوجل، 80 حرف)
**عربي:**
```
قطع غيار BMW وميني كوبر أصلية — جديد ومستعمل وارد بضمان وتوصيل سريع.
```
**إنجليزي:**
```
Genuine BMW & MINI parts — new & used imports, warranty & fast delivery.
```

### الوصف الكامل (Full description — عربي)
```
FixIt — وجهتك لقطع غيار BMW وميني كوبر: أصلية، جديدة ومستعملة وارد أوروبا وأمريكا، بفحص وضمان وتوصيل لكل المحافظات.

المميزات:
• كتالوج ضخم بفلاتر بالماركة والموديل (F30, E90, X5...) والفئة والحالة.
• بحث برقم OEM ومطابقة القطعة لعربيتك.
• أسعار واضحة وعروض وخصومات يومية.
• "اسأل الخبير" يشخّص المشكلة ويرشّح القطعة المناسبة.
• تتبّع الطلب لحظة بلحظة + طرق دفع متعددة (عند الاستلام / انستاباي / محفظة).
• حسابك وطلباتك ومفضّلتك في مكان واحد.
• فرع جملة للتجّار (تصدير لكل البلاد).

قطع مضمونة، أسعار أمانة، ودعم على الواتساب. FixIt — عربيتك في إيدين أمينة.
```

### الوصف الكامل (Full description — إنجليزي)
```
FixIt is your destination for genuine BMW & MINI parts: new and used imports from Europe and the USA, inspected, warrantied, and delivered nationwide.

Features:
• Huge catalog with filters by brand, model (F30, E90, X5...), category and condition.
• Search by OEM number and match parts to your car.
• Clear pricing with daily deals and discounts.
• "Ask the Expert" diagnoses the issue and recommends the right part.
• Real-time order tracking + multiple payment methods.
• Your account, orders and wishlist in one place.
• Wholesale branch for traders (worldwide export).

Guaranteed parts, honest prices, and WhatsApp support. FixIt — your car in trusted hands.
```

### كلمات مفتاحية (Apple Keywords — 100 حرف)
```
BMW,MINI,قطع غيار,سبير,parts,spare,عربية,صيانة,OEM,فرامل,فلتر,استيراد,مستعمل,fixit
```

### بيانات ثابتة
| الحقل | القيمة |
|---|---|
| التصنيف (Category) | Shopping / التسوّق |
| تقييم المحتوى | Everyone / 3+ (للجميع) |
| رابط سياسة الخصوصية | `https://fixitauto.parts/policies.html` |
| إيميل الدعم | (إيميلك) |
| موقع الدعم | `https://fixitauto.parts` |

> 📸 **السكرين شوت (دورك):** بعد ما التطبيق يفتح على الموبايل/المحاكي، صوّر 3–5 شاشات:
> الرئيسية، المتجر، صفحة منتج، السلة. جوجل وأبل بيطلبوهم للنشر.

---

## 2) 🤖 النشر على Google Play

### أ) الحساب (مرة واحدة)
1. افتح [play.google.com/console](https://play.google.com/console) وادفع **25$** (مرة واحدة للأبد).
2. كمّل تحقّق الهوية (بياخد من ساعات لأيام).

### ب) بناء نسخة موقّعة (`.aab`) — الجزء اللي جهّزته لك

**اعمل مفتاح التوقيع مرة واحدة** (احتفظ بيه وبكلمة سره في مكان آمن — لو ضاع مش هتقدر تحدّث التطبيق أبداً):
```bash
keytool -genkey -v -keystore ~/fixit-release.jks \
  -alias fixit -keyalg RSA -keysize 2048 -validity 10000
```

**ابنِ ملف الإصدار** — أسهل طريقة من Android Studio:
`Build → Generate Signed App Bundle / APK → Android App Bundle → اختار المفتاح → release → Finish`

هتلاقي الملف في: `android/app/release/app-release.aab`

### ج) الرفع
1. في Play Console: **Create app** → املأ الاسم والوصف (من فوق).
2. **Production → Create release** → ارفع `app-release.aab`.
3. املأ سياسة الخصوصية + تقييم المحتوى + الأسئلة الإلزامية.
4. **Submit for review**.

> ⚠️ **حساب شخصي جديد:** جوجل هتطلب **تجربة مغلقة (Closed testing) بـ 12–20 مختبِر لمدة 14 يوم متواصل** قبل ما تسمحلك بالنشر العام. الحساب كـ Organization بيعفيك من ده.

**⏱️ الوقت:** حساب جاهز → مراجعة **1–7 أيام**. حساب شخصي جديد → **~أسبوعين**.

---

## 3) 🍏 النشر على App Store (محتاج ماك — عندك ✅)

### أ) الحساب (مرة واحدة)
1. اشترك في [Apple Developer](https://developer.apple.com) بـ **99$/سنة**.
2. سجّل دخول بحساب Apple بتاعك.

### ب) التوقيع والرفع من Xcode
1. `npm run ios` (بيفتح Xcode).
2. **Signing & Capabilities → Team** → اختار حسابك (Xcode بيعمل الشهادات أوتوماتيك).
3. فوق: اختار الجهاز **Any iOS Device**.
4. **Product → Archive** → استنى البناء.
5. **Distribute App → App Store Connect → Upload**.

### ج) بيانات المتجر والإرسال
1. افتح [App Store Connect](https://appstoreconnect.apple.com) → **+ New App**.
2. اربط النسخة اللي رفعتها، واملأ الوصف والسكرين شوت وسياسة الخصوصية.
3. **Submit for Review**.

**⏱️ الوقت:** مراجعة أبل عادةً **24–48 ساعة**.

---

## 4) 🔄 تحديث التطبيق بعد النشر

أي تعديل في الموقع → ارفع نسخة جديدة:
1. زوّد رقم الإصدار:
   - أندرويد: `android/app/build.gradle` → `versionCode` (+1) و `versionName`.
   - iOS: في Xcode → **Version** و **Build**.
2. `npm run cap:sync`
3. ابنِ وارفع زي أول مرة → مراجعة أسرع عادةً.

---

## ✅ ملخّص سريع

| | Google Play | App Store |
|---|---|---|
| التكلفة | 25$ مرة واحدة | 99$/سنة |
| محتاج ماك؟ | لا | نعم (عندك) |
| وقت المراجعة | 1–7 أيام | 24–48 ساعة |
| قيد الحساب الجديد | تجربة 14 يوم (شخصي) | لا |

الكود جاهز — الباقي كله كليكات في حسابك. 🚀
