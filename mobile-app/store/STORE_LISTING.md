# 🚀 نشر تطبيق FixIt على Google Play و App Store

كل حاجة هنا جاهزة للنسخ واللصق. الصور جنب الملف ده في `store/`.

---

## 0) الخطة والمواعيد

| الخطوة | مين | المدة |
|---|---|---|
| فتح حساب Google Play Console (25$ مرة واحدة) + توثيق الهوية | أنت | 1–3 أيام |
| فتح حساب Apple Developer (99$/سنة) + توثيق | أنت | 1–2 يوم (أحياناً أكتر) |
| فتح حساب Expo مجاني على expo.dev وربطه بالريبو | أنت (5 دقايق) | — |
| بناء نسخ المتاجر (EAS) ورفعها | من صفحة expo.dev أو بأمر واحد | ساعة |
| **جوجل**: اختبار مغلق بـ 12 مختبِر لمدة 14 يوم متواصلين (للحسابات الشخصية الجديدة) | أنت + 12 شخص | 14 يوم |
| مراجعة جوجل للإنتاج | جوجل | 2–7 أيام |
| مراجعة أبل | أبل | 1–3 أيام |

> 💡 **حساب شخصي ولا شركة على جوجل؟** الحساب الشخصي الجديد لازم يعدّي الاختبار المغلق (12 مختبِر × 14 يوم).
> حساب الشركة (Organization) معفي من الشرط ده، بس محتاج رقم **D-U-N-S** للشركة (مجاني من Dun & Bradstreet وممكن ياخد لحد 30 يوم).
> لو عندك سجل تجاري لـ FixIt، حساب الشركة أحسن على المدى البعيد (اسم الشركة بيظهر كناشر).
>
> **المختبرين الـ 12**: ابعت لينك الاختبار لعملاء وصحاب على واتساب — لازم يفضلوا مشتركين 14 يوم متواصلين ويستخدموا التطبيق.

---

## 1) البناء والرفع (EAS)

**الأسهل — من المتصفح:** expo.dev ← Create project ← اربط GitHub ريبو `fixit-ai-server` (المجلد `mobile-app`) ← Builds ← Android/iOS ← profile `production`.

**أو من أي كمبيوتر فيه Node:**
```bash
cd mobile-app && npm install
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build -p android --profile production   # .aab لجوجل
npx eas-cli@latest build -p ios --profile production       # بيطلب دخول Apple ويعمل الشهادات لوحده
npx eas-cli@latest submit -p ios                           # رفع لـ App Store Connect / TestFlight
```
أول رفع على جوجل بيتعمل **يدوي** من Play Console (ارفع ملف `.aab`)، وبعد كده `eas submit -p android` يشتغل لوحده.

- **Package / Bundle ID**: `parts.fixitauto.app`
- **الإصدار**: 1.0.0

---

## 2) Google Play — بيانات صفحة المتجر

**App name** (≤30): `FixIt: قطع غيار BMW و MINI`

**Short description** (≤80):
`قطع غيار BMW و MINI جديد ومستعمل وارد — اطلب وتوصلك لحد باب البيت`

**Full description:**
```
FixIt متجرك المتخصص في قطع غيار BMW و MINI Cooper في مصر — جديد ومستعمل وارد بحالة ممتازة.

🚗 اختار عربيتك
اختار الشاسيه (F30، E90، E60، R56، F56 وغيرهم) وهنعلّملك القطع اللي بتركب على عربيتك بالظبط.

🔎 بحث ذكي
دوّر باسم القطعة بالعربي أو الإنجليزي، أو برقم OEM، أو بالشاسيه. ولو القطعة خلصت، اطلبها ونوفرهالك.

🔧 اسأل الخبير
مش عارف اسم القطعة؟ اوصف المشكلة (صوت، سخونية، لمبة...) والخبير يحددلك القطعة ورقمها.

🛒 اطلب بسهولة
• أسعار واضحة ومخزون حقيقي
• الدفع بانستاباي أو فودافون كاش
• توصيل لكل محافظات مصر
• تتبع طلبك خطوة بخطوة

⭐ مميزات تانية
• نقاط على كل طلب تستخدمها خصم
• كوبونات وعروض
• المفضلة وشاهدتها مؤخراً
• تقييمات حقيقية من العملاء
• عربي وإنجليزي

FixIt — الحي العاشر، مدينة نصر، القاهرة. دعم واتساب: 01125157767
```

**English (add as translation):**
- Title: `FixIt: BMW & MINI Parts`
- Short: `New & used imported BMW and MINI parts, delivered across Egypt`
- Full:
```
FixIt is your specialist store for BMW and MINI Cooper parts in Egypt — new and grade-A used imports.

🚗 Pick your car — choose your chassis (F30, E90, E60, R56, F56 and more) and see exactly which parts fit.
🔎 Smart search — by part name in Arabic or English, OEM number or chassis. Out of stock? Request it and we'll source it.
🔧 Ask the expert — describe the symptom and our expert identifies the part and its number.
🛒 Easy ordering — clear prices and real stock, pay with InstaPay or mobile wallet, delivery to every governorate, step-by-step order tracking.
⭐ Loyalty points, coupons, wishlist, real customer reviews, Arabic & English.
```

**Category**: Shopping · **Tags**: Auto parts, Shopping
**Contact email**: `trade@fixitauto.parts` (أو إيميلك) · **Phone**: +20 112 515 7767 · **Website**: https://fixitauto.parts
**Privacy policy**: https://fixitauto.parts/privacy.html

**الصور:**
- App icon 512×512: `store/play-icon-512.png`
- Feature graphic 1024×500: `store/play-feature-graphic-1024x500.png`
- Phone screenshots (2–8): `store/play-phone/ar-1..6.png` (والإنجليزي `en-*` للترجمة)

### App content (Play Console ← Policy ← App content)

| السؤال | الإجابة |
|---|---|
| Privacy policy | https://fixitauto.parts/privacy.html |
| Ads | **No**, the app does not contain ads |
| App access | All functionality available without special access — **بس** اكتب حساب تجربة (شوف الجزء 4) |
| Content rating (IARC) | Category: **Shopping / Utility**. كل الأسئلة (عنف، جنس، مخدرات، مقامرة، محتوى من المستخدمين...) = **No**. التقييمات النصية من العملاء = نعم «users can interact/share content» → **No** (التقييمات بتتراجع وتتحذف من اللوحة، ومفيش تواصل بين المستخدمين) |
| Target audience | **18+** (مش موجّه للأطفال) |
| News app | No |
| Government app | No |
| Financial features | None (الدفع تحويل خارج التطبيق) |
| Health | None |
| Data safety | الجدول اللي تحت ⬇️ |

### Data safety

- Does your app collect or share user data? **Yes**
- Is all data encrypted in transit? **Yes** (HTTPS)
- Do you provide a way for users to request data deletion? **Yes** → https://fixitauto.parts/delete-account.html
- Account creation: **Username and password** (رقم الموبايل + كلمة سر) → Delete account URL: `https://fixitauto.parts/delete-account.html`

| Data type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| Personal info → **Name** | ✅ | ❌ | Required (للطلب) | App functionality, Account management |
| Personal info → **Phone number** | ✅ | ❌ | Required | App functionality, Account management |
| Personal info → **Email address** | ✅ | ❌ | Optional | App functionality (تأكيد الطلب) |
| Personal info → **Address** (عنوان التوصيل) | ✅ | ❌ | Required (للطلب) | App functionality |
| Financial info → **Purchase history** | ✅ | ❌ | Required | App functionality |
| Messages → **Other in-app messages** (اسأل الخبير) | ✅ | ✅ (مزوّد الذكاء الاصطناعي Google Gemini لمعالجة السؤال بس) | Optional | App functionality |
| App activity → **Other user-generated content** (التقييمات) | ✅ | ❌ | Optional | App functionality |

مش بنجمع: الموقع، الصور، جهات الاتصال، معرّفات الإعلانات، بيانات صحية. ومفيش إعلانات ولا تتبّع.
(كل البيانات بتتعالج مؤقتاً ومحدش بيبيعها. «Shared» مع مزوّد خدمة بيشتغل نيابة عنك ممكن يتعلّم «No» حسب تعريف جوجل لمقدّمي الخدمة — اختار اللي تحس إنه أدق.)

---

## 3) App Store (App Store Connect)

| الحقل | القيمة |
|---|---|
| Name (≤30) | `FixIt: BMW & MINI Parts` |
| Subtitle (≤30) | `قطع غيار جديد ومستعمل وارد` |
| Primary language | Arabic (وضيف English) |
| Category | Shopping · Secondary: Utilities |
| Age rating | 4+ (كل الإجابات None) |
| Price | Free |
| Support URL | https://fixitauto.parts/about.html |
| Marketing URL | https://fixitauto.parts |
| Privacy Policy URL | https://fixitauto.parts/privacy.html |
| Copyright | `2026 FixIt` |

**Keywords** (≤100 حرف، مفصولة بفاصلة):
`قطع غيار,بي ام,ميني كوبر,BMW,MINI,spare parts,OEM,F30,E90,R56,مستعمل,وارد,عفشة,موتور`

**Promotional text:**
`اختار عربيتك وشوف القطع اللي بتركب عليها — ولو مش عارف اسم القطعة، اسأل الخبير.`

**Description**: نفس الوصف الكامل بتاع جوجل (عربي)، والإنجليزي للترجمة.

**Screenshots** (iPhone 6.9"، 1320×2868): `store/ios-6.9/ar-1..6.png` و `en-1..6.png`
(أبل بتصغّرها لوحدها لباقي المقاسات. الآيباد: التطبيق شغال عليه، ولو طلبت صور آيباد قولي أطلعها.)

### App Privacy (Data types)
Data **linked to the user**، **not used for tracking**:
- Contact Info: **Name, Email Address, Phone Number, Physical Address** — App Functionality
- Purchases: **Purchase History** — App Functionality
- User Content: **Customer Support** (اسأل الخبير)، **Other User Content** (التقييمات) — App Functionality

Tracking: **No**.

### Export compliance
متظبط في التطبيق (`ITSAppUsesNonExemptEncryption = false`) — التطبيق بيستخدم HTTPS عادي بس.

---

## 4) ملاحظات المراجعين (للمتجرين)

**حساب تجربة**: اعمل حساب من التطبيق برقم تجريبي (مثال: 01000000001 / كلمة سر قوية)، واكتبه في:
- Google: App access → «All or some functionality is restricted» → username/password
- Apple: App Review Information → Sign-in required → username/password

**Review notes (انسخها):**
```
FixIt is an online store for physical car parts (BMW & MINI) in Egypt.
- Browsing, search and the cart work without an account. The demo account above shows order history and profile.
- Payment for physical goods is done outside the app by bank transfer (InstaPay) or mobile wallet after the order is confirmed by phone — no digital goods are sold, so In-App Purchase does not apply (Guideline 3.1.3(e)/3.1.5).
- Account deletion: Account → Edit profile → Delete account (also at https://fixitauto.parts/delete-account.html).
- "Ask the expert" is an AI assistant that only answers car-parts questions.
- Please don't place a real order; if you do, it will simply be cancelled.
```

---

## 5) بعد النشر

- أي تعديل في **المنتجات/الأسعار/المخزون/الإعدادات** بيظهر في التطبيق فوراً — مش محتاج تحديث.
- أي تعديل في **شكل التطبيق نفسه** = نسخة جديدة: زوّد `version` في `app.json` وابني تاني بـ EAS (رقم البناء بيزيد لوحده).
- حط لينكات التطبيق على الموقع وصفحة فيسبوك أول ما ينزل.
