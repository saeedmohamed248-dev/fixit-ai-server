# 📱 تطبيق FixIt للموبايل — أندرويد & iOS

الموقع اتحوّل لتطبيق موبايل حقيقي (native) عن طريق **[Capacitor](https://capacitorjs.com)** —
نفس الموقع بالظبط، متغلّف في تطبيق قابل للنشر على **Google Play** و **App Store**.

- التطبيق بيعرض نفس صفحات الموقع (محزّنة جواه فبيفتح بسرعة وحتى لو النت ضعيف).
- بيانات المنتجات والطلبات بتيجي مباشرة من سيرفر الإنتاج `https://fixitauto.parts`.
- روابط الواتساب/الاتصال بتفتح في تطبيق النظام، وزرار الرجوع في أندرويد شغّال،
  وشريط الحالة والنوتش متظبطين.

> ⚠️ **مهم**: خطوات بناء التطبيق لازم تتعمل على **جهازك** (فيه إنترنت + الأدوات).
> بيئة السحابة اللي اشتغلنا فيها بتمنع تثبيت حزم npm، فجهّزنا كل الإعداد جاهز
> وانت بس بتنفّذ الأوامر اللي تحت. كله بياخد ~15 دقيقة أول مرة.

---

## 🧰 المتطلبات (تتثبّت مرة واحدة)

| للـ | محتاج |
|---|---|
| **الاتنين** | [Node.js 18+](https://nodejs.org) |
| **أندرويد** | [Android Studio](https://developer.android.com/studio) (بيجيب Android SDK + JDK) |
| **iOS** | جهاز **Mac** + [Xcode](https://apps.apple.com/app/xcode/id497799835) + `sudo gem install cocoapods` |

> iOS مايتبنيش غير على ماك. أندرويد بيتبني على ويندوز/ماك/لينكس.

---

## 🚀 الإعداد أول مرة

من جوه مجلد المشروع:

```bash
# 1) ثبّت الحزم
npm install

# 2) جهّز محتوى الموقع لداخل التطبيق (بيملأ مجلد www/)
npm run build:mobile

# 3) ضيف المنصّات (بيتعمل مرة واحدة بس)
npx cap add android
npx cap add ios        # على الماك فقط

# 4) ولّد أيقونات وشاشات البداية من لوجو FixIt
npm run cap:assets

# 5) زامن كل حاجة مع المشاريع الأصلية
npx cap sync
```

خلاص التطبيق جاهز يتفتح ويتبني 🎉

---

## ▶️ التشغيل والتجربة

### أندرويد
```bash
npm run android          # بيبني + يفتح Android Studio
```
في Android Studio اضغط **Run ▶** على موبايل موصول أو Emulator.
أو مباشرةً على موبايل موصول بالـ USB (مع تفعيل USB debugging):
```bash
npm run android:run
```

### iOS (ماك)
```bash
npm run ios              # بيبني + يفتح Xcode
```
في Xcode: اختار الجهاز/المحاكي واضغط **Run ▶**.
(أول مرة: **Signing & Capabilities → Team** واختار حساب Apple بتاعك.)

---

## 🔄 لما تعدّل الموقع

أي تعديل في ملفات الموقع (HTML/CSS/JS) — رجّع زامن التطبيق:

```bash
npm run cap:sync         # = build:mobile + cap sync
```

بعدها اعمل Run تاني. **مش محتاج** تكرّر `cap add` ولا `cap:assets`.

> الأيقونة اتغيّرت؟ حدّث `mobile-assets/logo.png` وبعدين `npm run cap:assets`.

---

## 📦 بناء نسخة للنشر على المتاجر

### 🤖 Google Play (أندرويد)

1. **اعمل مفتاح توقيع** (مرة واحدة، واحتفظ بيه في مكان آمن — لو ضاع مش هتقدر تحدّث التطبيق):
   ```bash
   keytool -genkey -v -keystore fixit-release.keystore \
     -alias fixit -keyalg RSA -keysize 2048 -validity 10000
   ```
2. في Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**،
   اختار المفتاح اللي عملته، و **release**.
3. ارفع ملف `.aab` على [Google Play Console](https://play.google.com/console)
   (حساب المطوّر بـ 25$ لمرة واحدة).

### 🍏 App Store (iOS — ماك)

1. محتاج اشتراك [Apple Developer](https://developer.apple.com) (99$/سنة).
2. في Xcode: **Product → Archive**، وبعدها **Distribute App → App Store Connect**.
3. كمّل بيانات التطبيق على [App Store Connect](https://appstoreconnect.apple.com) وابعته للمراجعة.

---

## 🆔 هوية التطبيق (متظبطة)

| | القيمة | تتغيّر من |
|---|---|---|
| اسم التطبيق | **FixIt** | `capacitor.config.json` → `appName` |
| مُعرّف التطبيق | `parts.fixitauto.app` | `capacitor.config.json` → `appId` |
| سيرفر البيانات | `https://fixitauto.parts` | `js/app.js` → `PROD_ORIGIN` |
| اللون الأساسي | `#101828` / `#23279c` | `capacitor.config.json` + `js/app.js` |

> ✏️ لو غيّرت `appId` **بعد** ما عملت `cap add`، الأسهل تمسح مجلدي `android/` و `ios/`
> وتعيد `npx cap add ...`.

---

## 🗂️ إيه اللي اتضاف للمشروع

```
capacitor.config.json      إعدادات التطبيق (الاسم، المعرّف، الألوان، شاشة البداية)
mobile-assets/logo.png     مصدر الأيقونة وشاشة البداية (لوجو FixIt)
scripts/build-mobile.mjs   بينسخ الموقع لمجلد www/ اللي التطبيق بيحزمه
www/                       (يتولّد) محتوى الموقع داخل التطبيق
android/                   (يتولّد) مشروع أندرويد — يتفتح بـ Android Studio
ios/                       (يتولّد) مشروع iOS — يتفتح بـ Xcode
```

تعديلات على الموقع نفسه (شغّالة على الويب وفي التطبيق سوا):
- `js/app.js` — يوجّه الـ API لسيرفر الإنتاج داخل التطبيق + يهيّئ Capacitor
  (شريط الحالة، شاشة البداية، زرار الرجوع، فتح الروابط الخارجية في النظام).
- `css/style.css` — دعم المناطق الآمنة (النوتش / مؤشر الـ Home).

---

## 🩹 حل المشاكل الشائعة

| المشكلة | الحل |
|---|---|
| التطبيق فاتح بس المنتجات مش بتظهر | اتأكد إن `https://fixitauto.parts` شغّال، والـ CORS مفعّل (هو مفعّل `*`). |
| `cap: command not found` | استخدم `npx cap ...` أو `npm install`. |
| iOS: خطأ Pods | `cd ios/App && pod install` وبعدها Run تاني. |
| أندرويد: خطأ SDK | افتح Android Studio مرة، سيب الـ SDK يتحمّل، وحدّد `ANDROID_HOME`. |
| الأيقونة القديمة لسه ظاهرة | امسح التطبيق من الموبايل وأعِد التثبيت. |
| بعد تعديل الموقع مش بيتحدّث | نسيت `npm run cap:sync` قبل الـ Run. |
