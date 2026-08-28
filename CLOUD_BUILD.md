# ☁️ بناء ونشر FixIt من السحابة — بدون Android Studio / Xcode / Mac

عايز تبني وتنشر التطبيق من غير ما تنزّل أي برنامج على جهازك؟ ده ممكن.
بنستخدم **[Codemagic](https://codemagic.io)** — خدمة بتبني تطبيقك على سيرفراتها
(فيها أجهزة **Mac سحابية** للـ iOS) وترفعه للمتاجر. كل شغلك من المتصفح.

> ⚠️ **الوحيد اللي مستحيل يتلغى:** حسابات المتاجر ورسومها —
> **Google Play** (25$ مرة واحدة) و **Apple Developer** (99$/سنة).
> دي مطلوبة من جوجل وأبل نفسهم. Codemagic نفسه فيه **باقة مجانية** كافية للبداية.

---

## 🗺️ الصورة الكاملة

```
جهازك (متصفح بس)  →  Codemagic (يبني أندرويد + iOS في السحابة)  →  متاجر التطبيقات
```

كله متجهّز في الريبو (ملف `codemagic.yaml`). دورك: ربط الحسابات بكام كليك.

---

## 1) 🔑 الحسابات (مرة واحدة — من المتصفح)

| الحساب | ليه | الرابط |
|---|---|---|
| **Codemagic** | خدمة البناء السحابية (باقة مجانية) | [codemagic.io](https://codemagic.io) — سجّل بحساب GitHub |
| **Google Play** | نشر أندرويد (25$ مرة واحدة) | [play.google.com/console](https://play.google.com/console) |
| **Apple Developer** | نشر iOS (99$/سنة) | [developer.apple.com](https://developer.apple.com) |

---

## 2) 🤖 أندرويد — الخطوات

### أ) اربط الريبو
1. ادخل [codemagic.io](https://codemagic.io) بحساب GitHub → **Add application** → اختار ريبو `fixit-ai-server`.
2. اختار Branch: `claude/professional-mobile-web-app-dl1uut` (أو `main` بعد الدمج).
3. Codemagic هيلاقي ملف `codemagic.yaml` أوتوماتيك ويظهرلك workflow اسمه **FixIt — Android**.

### ب) مفتاح التوقيع (Codemagic بيعمله لك — من غير أدوات!)
1. **Teams → Code signing identities → Android keystores → Generate keystore**.
2. سمّي الـ **Reference name**: `fixit_keystore` (نفس الاسم بالظبط، عشان الملف يلاقيه).
3. Codemagic هيحفظه ويوقّع بيه تلقائياً. **احفظ نسخة منه عندك** (Download) — لو ضاع مش هتقدر تحدّث التطبيق.

### ج) ابنِ
اضغط **Start new build** → اختار workflow **FixIt — Android**.
بعد ~10 دقايق هيجيلك على الإيميل ملف **`.aab`** جاهز.

### د) ارفعه على Google Play
- في Play Console: **Create app** → **Production → Create release** → ارفع الـ `.aab`.
- (أو فعّل الرفع التلقائي — خطوة اختيارية في آخر الملف.)

> ⚠️ حساب جوجل شخصي جديد: بيطلب تجربة مغلقة 14 يوم قبل النشر العام (شوف `STORE_PUBLISHING.md`).

---

## 3) 🍏 iOS — الخطوات (على Mac سحابي — مش محتاج تملك Mac)

### أ) مفتاح App Store Connect API
1. ادخل [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access → Integrations → App Store Connect API**.
2. **Generate API Key** بصلاحية **App Manager** → نزّل الملف `.p8` (مرة واحدة بس!) واحفظ الـ **Key ID** و **Issuer ID**.

### ب) اربطه في Codemagic
1. **Teams → Integrations → App Store Connect → Connect**.
2. ارفع ملف `.p8` واكتب الـ Key ID و Issuer ID، وسمّي التكامل: `fixit_asc` (نفس الاسم بالظبط).
3. Codemagic هيعمل الشهادات والتوقيع كله **أوتوماتيك** — مش محتاج تعمل حاجة يدوي.

### ج) اعمل التطبيق في App Store Connect
- **Apps → + → New App**: الاسم **FixIt**، الـ Bundle ID: `parts.fixitauto.app`.

### د) ابنِ
اضغط **Start new build** → workflow **FixIt — iOS**.
بعد ~15–20 دقيقة هيترفع تلقائياً على **TestFlight** (تجربة)، وتقدر تبعته للنشر العام من App Store Connect.

---

## 4) ⏱️ الوقت المتوقّع

| المرحلة | الوقت |
|---|---|
| إعداد الحسابات والربط | ~ساعة (مرة واحدة) |
| كل عملية بناء (أندرويد) | ~10 دقايق |
| كل عملية بناء (iOS) | ~15–20 دقيقة |
| ظهور على **App Store** بعد الإرسال | 24–48 ساعة |
| ظهور على **Google Play** | 1–7 أيام (أو ~أسبوعين لحساب شخصي جديد) |

---

## 5) 🔄 أي تعديل بعد كده

عدّل الموقع → اعمل commit/push على GitHub → في Codemagic اضغط **Start new build**.
(أو فعّل **Automatic build triggering** عشان يبني لوحده مع كل push.)
مش محتاج تلمس جهازك خالص.

> 💡 قبل كل بناء، زوّد رقم الإصدار في `capacitor.config.json`? لأ — رقم الإصدار
> بيتظبط في Codemagic أوتوماتيك (build number)، بس لو عايز versionName جديد
> عدّله في إعدادات المشروع لما تحب.

---

## 6) 🆚 الفرق عن الطريقة اليدوية

| | يدوي (BUILD_MOBILE.md) | سحابي (الملف ده) |
|---|---|---|
| Android Studio / Xcode | مطلوب | ❌ مش مطلوب |
| جهاز Mac | مطلوب للـ iOS | ❌ مش مطلوب |
| مكان البناء | جهازك | سحابة Codemagic |
| مناسب لـ | لو عندك الأدوات | **لو مش عايز تنزّل حاجة** ← انت هنا |

كل اللي محتاجه: متصفح + الحسابات. 🚀
