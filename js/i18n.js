// نظام اللغتين العربية والإنجليزية — Bilingual AR/EN system
// اللغة محفوظة في المتصفح، والافتراضي عربي
const _urlLang = new URLSearchParams(location.search).get('lang');
if (_urlLang === 'ar' || _urlLang === 'en') localStorage.setItem('lang', _urlLang);
window.LANG = localStorage.getItem('lang') || 'ar';
document.documentElement.lang = LANG;
document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';

const I18N = {
  /* ---------- عام / Layout ---------- */
  brand_tag: { ar: 'قطع غيار BMW & MINI', en: 'BMW & MINI Auto Parts' },
  topbar: { ar: '🚚 شحن لجميع المحافظات', en: '🚚 Delivery all over Egypt' },
  topbar_free: { ar: 'مجاني فوق', en: 'Free over' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  nav_home: { ar: 'الرئيسية', en: 'Home' },
  nav_shop: { ar: 'كل القطع', en: 'All Parts' },
  nav_used: { ar: 'مستعمل وارد', en: 'Used Import' },
  nav_new: { ar: 'جديد', en: 'New' },
  nav_track: { ar: 'تتبع طلبك', en: 'Track Order' },
  nav_expert: { ar: 'اسأل الخبير 🤖', en: 'Ask the Expert 🤖' },
  login: { ar: 'دخول', en: 'Login' },
  search_ph: { ar: '🔍 ابحث عن قطعة، رقم OEM، موديل...', en: '🔍 Search parts, OEM number, model...' },
  suggest_all: { ar: 'عرض كل النتائج ←', en: 'View all results →' },
  suggest_none: { ar: 'مفيش نتائج لـ', en: 'No results for' },
  ask_expert: { ar: 'اسأل الخبير 🤖', en: 'Ask the Expert 🤖' },
  footer_desc: { ar: 'كل القطع مفحوصة وبضمان، استيراد مباشر من أوروبا وأمريكا.', en: 'Every part is inspected and guaranteed — imported directly from Europe and the USA.' },
  footer_shop: { ar: 'التسوق', en: 'Shop' },
  footer_all: { ar: 'كل المنتجات', en: 'All products' },
  footer_bmw: { ar: 'قطع BMW', en: 'BMW parts' },
  footer_mini: { ar: 'قطع MINI', en: 'MINI parts' },
  footer_wish: { ar: 'المفضلة', en: 'Wishlist' },
  footer_service: { ar: 'خدمة العملاء', en: 'Customer Service' },
  footer_track: { ar: 'تتبع طلبك', en: 'Track your order' },
  footer_account: { ar: 'حسابي', en: 'My account' },
  footer_policies: { ar: 'الشحن والاسترجاع والضمان', en: 'Shipping, Returns & Warranty' },
  footer_expert: { ar: 'اسأل الخبير', en: 'Ask the expert' },
  footer_contact: { ar: 'تواصل معنا', en: 'Contact us' },
  footer_rights: { ar: 'جميع الحقوق محفوظة', en: 'All rights reserved' },
  pay_badges: { ar: '💵 عند الاستلام &nbsp; 🏦 انستاباي &nbsp; 📱 محافظ إلكترونية', en: '💵 Cash on delivery &nbsp; 🏦 InstaPay &nbsp; 📱 E-wallets' },
  wa_greeting: { ar: 'السلام عليكم، عندي استفسار', en: 'Hello, I have a question' },
  wa_part: { ar: 'السلام عليكم، عايز أسأل عن قطعة', en: 'Hello, I want to ask about a part' },

  /* ---------- المنتجات ---------- */
  cond_new: { ar: 'جديد', en: 'New' },
  cond_used: { ar: 'مستعمل وارد', en: 'Used Import' },
  discount: { ar: 'خصم', en: 'OFF' },
  out_stock: { ar: 'نفذت الكمية', en: 'Out of stock' },
  toast_added: { ar: 'تمت الإضافة للسلة ✓', en: 'Added to cart ✓' },
  wish_added: { ar: 'اتضافت للمفضلة ❤️', en: 'Added to wishlist ❤️' },
  wish_removed: { ar: 'اتشالت من المفضلة', en: 'Removed from wishlist' },

  /* ---------- الرئيسية ---------- */
  title_home: { ar: 'FixIt | قطع غيار BMW & MINI استيراد جديد ومستعمل', en: 'FixIt | BMW & MINI Parts — New & Used Import' },
  hero_title: { ar: 'قطع غيار <span>BMW</span> و <span>MINI</span> بضمان', en: 'Genuine <span>BMW</span> & <span>MINI</span> Parts, Guaranteed' },
  hero_sub: { ar: 'استيراد مباشر — قطع جديدة أصلية ومستعمل وارد أوروبا وأمريكا، كله مفحوص وبضمان. اكتب اسم القطعة أو رقم الشاسيه/OEM وهنلاقيهالك.', en: 'Direct import — genuine new parts and inspected used parts from Europe and the USA, all guaranteed. Search by part name, chassis or OEM number.' },
  hero_search_ph: { ar: '🔍 ابحث باسم القطعة أو رقم OEM أو الموديل (مثال: F30)...', en: '🔍 Search by part name, OEM number or model (e.g. F30)...' },
  search_btn: { ar: 'بحث', en: 'Search' },
  chip_new: { ar: 'جديد أصلي', en: 'Genuine New' },
  chip_used: { ar: 'مستعمل وارد', en: 'Used Import' },
  sec_cats: { ar: 'تسوّق حسب الفئة', en: 'Shop by Category' },
  sec_deals: { ar: '🔥 عروض وخصومات', en: '🔥 Deals & Discounts' },
  sec_best: { ar: '⭐ الأكثر مبيعاً', en: '⭐ Best Sellers' },
  sec_recent: { ar: '👀 شاهدتها مؤخراً', en: '👀 Recently Viewed' },
  view_all: { ar: 'عرض الكل ←', en: 'View all →' },
  feat1_t: { ar: 'فحص شامل', en: 'Fully Inspected' },
  feat1_d: { ar: 'كل قطعة مستعملة بتتفحص بالكامل قبل البيع وبنضمنها.', en: 'Every used part is fully tested before sale and guaranteed.' },
  feat2_t: { ar: 'استيراد مباشر', en: 'Direct Import' },
  feat2_d: { ar: 'وارد أوروبا وأمريكا بدون وسطاء، فالأسعار أفضل.', en: 'Sourced from Europe and the USA with no middlemen — better prices.' },
  feat3_t: { ar: 'شحن سريع', en: 'Fast Delivery' },
  feat3_d: { ar: 'توصيل لجميع المحافظات خلال ٢-٤ أيام عمل.', en: 'Nationwide delivery within 2-4 business days.' },
  feat4_t: { ar: 'خبير يساعدك', en: 'Expert Help' },
  feat4_d: { ar: 'مش عارف اسم القطعة؟ اسأل الخبير الذكي وهيوصلك ليها.', en: "Not sure which part you need? Ask our AI expert." },
  cta_title: { ar: 'مش لاقي القطعة اللي بتدور عليها؟', en: "Can't find the part you're looking for?" },
  cta_sub: { ar: 'ابعتلنا رقم الشاسيه أو صورة القطعة على واتساب وهنوفرهالك.', en: 'Send us your chassis number or a photo of the part on WhatsApp and we will source it.' },
  cta_btn: { ar: 'كلمنا واتساب 💬', en: 'Chat on WhatsApp 💬' },
  no_products: { ar: 'لا توجد منتجات بعد', en: 'No products yet' },
  loading: { ar: 'جاري التحميل...', en: 'Loading...' },

  /* ---------- المتجر ---------- */
  title_shop: { ar: 'المتجر | FixIt', en: 'Shop | FixIt' },
  filters: { ar: 'تصفية النتائج', en: 'Filters' },
  f_search: { ar: 'بحث', en: 'Search' },
  f_search_ph: { ar: 'اسم القطعة أو OEM...', en: 'Part name or OEM...' },
  f_brand: { ar: 'الماركة', en: 'Brand' },
  f_model: { ar: 'الموديل', en: 'Model' },
  f_cat: { ar: 'الفئة', en: 'Category' },
  f_cond: { ar: 'الحالة', en: 'Condition' },
  all: { ar: 'الكل', en: 'All' },
  clear_filters: { ar: 'مسح الفلاتر', en: 'Clear filters' },
  sort_new: { ar: 'الأحدث', en: 'Newest' },
  sort_best: { ar: 'الأكثر مبيعاً', en: 'Best selling' },
  sort_rating: { ar: 'الأعلى تقييماً', en: 'Top rated' },
  sort_asc: { ar: 'السعر: من الأقل', en: 'Price: low to high' },
  sort_desc: { ar: 'السعر: من الأعلى', en: 'Price: high to low' },
  n_products: { ar: 'منتج', en: 'products' },
  no_results: { ar: 'لا توجد نتائج مطابقة — جرّب تعدل الفلاتر أو', en: 'No matching results — try adjusting the filters or' },

  /* ---------- صفحة المنتج ---------- */
  sku: { ar: 'رقم القطعة (SKU)', en: 'Part number (SKU)' },
  oem: { ar: 'رقم OEM', en: 'OEM number' },
  condition: { ar: 'الحالة', en: 'Condition' },
  used_checked: { ar: 'مستعمل وارد (مفحوص)', en: 'Used import (inspected)' },
  fits: { ar: 'يناسب موديلات', en: 'Fits models' },
  available: { ar: 'المتوفر', en: 'In stock' },
  pieces: { ar: 'قطعة', en: 'pcs' },
  low_stock: { ar: 'باقي {n} بس — الحق اطلبها!', en: 'Only {n} left — order now!' },
  qty: { ar: 'الكمية:', en: 'Qty:' },
  add_cart: { ar: '🛒 أضف للسلة', en: '🛒 Add to Cart' },
  wish_in: { ar: '❤️ في المفضلة', en: '❤️ In wishlist' },
  wish_out: { ar: '🤍 أضف للمفضلة', en: '🤍 Add to wishlist' },
  ask_wa: { ar: 'اسأل واتساب 💬', en: 'Ask on WhatsApp 💬' },
  reserve_wa: { ar: 'نفذت الكمية — احجزها واتساب 💬', en: 'Out of stock — reserve on WhatsApp 💬' },
  best_seller: { ar: '🔥 الأكثر مبيعاً', en: '🔥 Best Seller' },
  reviews_title: { ar: 'التقييمات والمراجعات ⭐', en: 'Ratings & Reviews ⭐' },
  rate_product: { ar: 'قيّم المنتج', en: 'Rate this product' },
  your_name: { ar: 'اسمك', en: 'Your name' },
  your_review: { ar: 'رأيك في القطعة (اختياري)', en: 'Your review (optional)' },
  submit_review: { ar: 'إرسال التقييم', en: 'Submit review' },
  review_thanks: { ar: 'شكراً على تقييمك ⭐', en: 'Thanks for your review ⭐' },
  based_on: { ar: 'بناءً على {n} تقييم', en: 'Based on {n} reviews' },
  no_reviews: { ar: 'لسه مفيش تقييمات — كن أول من يقيّم القطعة دي!', en: 'No reviews yet — be the first to review this part!' },
  verified: { ar: '✓ عميل مسجّل', en: '✓ Verified customer' },
  related: { ar: 'قطع مشابهة', en: 'Related Parts' },
  not_found: { ar: 'المنتج غير موجود', en: 'Product not found' },

  /* ---------- السلة ---------- */
  title_cart: { ar: 'السلة وإتمام الطلب | FixIt', en: 'Cart & Checkout | FixIt' },
  cart: { ar: 'السلة', en: 'Cart' },
  cart_empty: { ar: 'السلة فارغة', en: 'Your cart is empty' },
  browse: { ar: 'تصفح المنتجات', en: 'Browse products' },
  remove: { ar: 'إزالة ✕', en: 'Remove ✕' },
  order_summary: { ar: 'ملخص الطلب', en: 'Order Summary' },
  subtotal: { ar: 'الإجمالي', en: 'Subtotal' },
  discount_row: { ar: 'خصم', en: 'Discount' },
  shipping: { ar: 'الشحن', en: 'Shipping' },
  ship_later: { ar: 'يُحدد عند التأكيد', en: 'Confirmed with you later' },
  ship_free: { ar: '🎉 شحن مجاني', en: '🎉 Free shipping' },
  total_due: { ar: 'المطلوب', en: 'Total' },
  coupon_ph: { ar: 'كود الخصم', en: 'Coupon code' },
  apply: { ar: 'تطبيق', en: 'Apply' },
  cancel: { ar: 'إلغاء', en: 'Remove' },
  coupon_ok: { ar: 'تم تطبيق الخصم: {v} 🎉', en: 'Discount applied: {v} 🎉' },
  have_account: { ar: '💡 عندك حساب؟ <a href="/account.html">سجّل دخول</a> عشان تتابع طلباتك', en: '💡 Have an account? <a href="/account.html">Log in</a> to track your orders' },
  full_name: { ar: 'الاسم بالكامل *', en: 'Full name *' },
  phone: { ar: 'رقم الموبايل *', en: 'Mobile number *' },
  city: { ar: 'المحافظة', en: 'City / Governorate' },
  city_ph: { ar: 'القاهرة', en: 'Cairo' },
  address: { ar: 'العنوان بالتفصيل *', en: 'Full address *' },
  notes: { ar: 'ملاحظات (نوع العربية / سنة الموديل / رقم الشاسيه)', en: 'Notes (car model / year / chassis number)' },
  pay_method: { ar: 'طريقة الدفع', en: 'Payment method' },
  pay_cod: { ar: '💵 الدفع عند الاستلام', en: '💵 Cash on delivery' },
  pay_instapay: { ar: '🏦 تحويل انستاباي', en: '🏦 InstaPay transfer' },
  pay_wallet: { ar: '📱 فودافون كاش / محفظة', en: '📱 Vodafone Cash / e-wallet' },
  confirm_order: { ar: 'تأكيد الطلب ✓', en: 'Place Order ✓' },
  sending: { ar: 'جاري إرسال الطلب...', en: 'Placing your order...' },
  fill_required: { ar: 'من فضلك اكتب الاسم ورقم الموبايل والعنوان', en: 'Please enter your name, mobile number and address' },
  order_success: { ar: 'تم استلام طلبك بنجاح!', en: 'Your order has been received!' },
  order_no: { ar: 'رقم الطلب:', en: 'Order number:' },
  saved: { ar: 'وفّرت {v} بكود الخصم 🎉', en: 'You saved {v} with your coupon 🎉' },
  pay_step_instapay: { ar: '🏦 <b>خطوة الدفع:</b> حوّل <b>{v}</b> على انستاباي رقم <b dir="ltr">{n}</b> وابعتلنا سكرين التحويل على واتساب ومعاه رقم طلبك.', en: '🏦 <b>Payment step:</b> Transfer <b>{v}</b> via InstaPay to <b dir="ltr">{n}</b> and send us the receipt on WhatsApp with your order number.' },
  pay_step_wallet: { ar: '📱 <b>خطوة الدفع:</b> حوّل <b>{v}</b> على محفظة رقم <b dir="ltr">{n}</b> وابعتلنا سكرين التحويل على واتساب ومعاه رقم طلبك.', en: '📱 <b>Payment step:</b> Transfer <b>{v}</b> to wallet number <b dir="ltr">{n}</b> and send us the receipt on WhatsApp with your order number.' },
  contact_confirm: { ar: 'هنتواصل معاك على {p} لتأكيد الطلب وتحديد الشحن.', en: 'We will contact you on {p} to confirm your order and arrange delivery.' },
  track_anytime: { ar: 'تقدر تتابع حالة طلبك في أي وقت من صفحة', en: 'You can track your order anytime from the' },
  track_page: { ar: 'تتبع الطلب', en: 'order tracking page' },
  confirm_wa: { ar: 'تأكيد عبر واتساب 💬', en: 'Confirm via WhatsApp 💬' },
  back_shop: { ar: '← الرجوع للمتجر', en: '→ Back to shop' },

  /* ---------- الحساب ---------- */
  title_account: { ar: 'حسابي | FixIt', en: 'My Account | FixIt' },
  login_title: { ar: 'تسجيل الدخول', en: 'Log in' },
  register_title: { ar: 'حساب جديد', en: 'Create account' },
  tab_login: { ar: 'دخول', en: 'Log in' },
  tab_register: { ar: 'حساب جديد', en: 'Sign up' },
  name_label: { ar: 'الاسم بالكامل', en: 'Full name' },
  email_label: { ar: 'الإيميل (اختياري)', en: 'Email (optional)' },
  password: { ar: 'كلمة السر', en: 'Password' },
  btn_login: { ar: 'دخول', en: 'Log in' },
  btn_register: { ar: 'إنشاء الحساب', en: 'Create account' },
  welcome: { ar: 'أهلاً،', en: 'Welcome,' },
  logout: { ar: 'تسجيل خروج', en: 'Log out' },
  my_orders: { ar: 'طلباتي', en: 'My Orders' },
  no_orders: { ar: 'لسه معملتش أي طلب', en: "You haven't placed any orders yet" },
  start_shopping: { ar: 'ابدأ التسوق', en: 'Start shopping' },
  track_link: { ar: 'تتبع الطلب ←', en: 'Track order →' },
  st_new: { ar: 'جديد — في انتظار التأكيد', en: 'New — awaiting confirmation' },
  st_confirmed: { ar: 'مؤكد ✓', en: 'Confirmed ✓' },
  st_shipped: { ar: 'في الشحن 🚚', en: 'Shipped 🚚' },
  st_delivered: { ar: 'تم التسليم 📦', en: 'Delivered 📦' },
  st_cancelled: { ar: 'ملغي', en: 'Cancelled' },

  /* ---------- التتبع ---------- */
  title_track: { ar: 'تتبع طلبك | FixIt', en: 'Track Your Order | FixIt' },
  track_title: { ar: 'تتبع طلبك 🚚', en: 'Track Your Order 🚚' },
  track_sub: { ar: 'اكتب رقم الطلب ورقم الموبايل اللي طلبت بيه', en: 'Enter your order number and the mobile number you ordered with' },
  order_number: { ar: 'رقم الطلب', en: 'Order number' },
  track_btn: { ar: 'تتبع الطلب', en: 'Track order' },
  track_missing: { ar: 'اكتب رقم الطلب ورقم الموبايل', en: 'Enter the order number and mobile number' },
  tl_received: { ar: 'استلمنا الطلب', en: 'Order received' },
  tl_confirmed: { ar: 'تم التأكيد', en: 'Confirmed' },
  tl_shipped: { ar: 'في الشحن', en: 'Shipped' },
  tl_delivered: { ar: 'تم التسليم', en: 'Delivered' },
  order_cancelled: { ar: 'الطلب {n} ملغي ❌ — لو ده غلط كلمنا واتساب', en: 'Order {n} is cancelled ❌ — if this is a mistake, contact us on WhatsApp' },
  ask_order_wa: { ar: 'استفسار عن الطلب واتساب 💬', en: 'Ask about this order on WhatsApp 💬' },

  /* ---------- المفضلة ---------- */
  title_wish: { ar: 'المفضلة | FixIt', en: 'Wishlist | FixIt' },
  wish_title: { ar: 'المفضلة ❤️', en: 'Wishlist ❤️' },
  wish_empty: { ar: 'مفيش قطع في المفضلة — دوس على ❤️ في صفحة أي منتج', en: 'Your wishlist is empty — tap ❤️ on any product page' },

  /* ---------- السياسات ---------- */
  title_policies: { ar: 'الشحن والاسترجاع والضمان | FixIt', en: 'Shipping, Returns & Warranty | FixIt' },
  pol_title: { ar: 'سياسات المتجر', en: 'Store Policies' },
  pol1_t: { ar: 'الشحن والتسليم', en: 'Shipping & Delivery' },
  pol1_d: { ar: 'بنشحن لجميع محافظات مصر خلال ٢-٤ أيام عمل من تأكيد الطلب. تكلفة الشحن بتتحدد حسب المحافظة وحجم القطعة، وبنبلغك بيها عند تأكيد الطلب قبل الشحن. القطع الكبيرة بتتشحن بتغليف خاص لحمايتها.', en: 'We deliver to all governorates of Egypt within 2-4 business days of order confirmation. Shipping cost depends on your location and part size, and we confirm it with you before dispatch. Large parts are shipped with special protective packaging.' },
  pol2_t: { ar: 'الاسترجاع والاستبدال', en: 'Returns & Exchange' },
  pol2_d: { ar: 'ليك حق الاسترجاع أو الاستبدال خلال ١٤ يوم من الاستلام لو القطعة مش مطابقة للوصف أو فيها عيب. القطعة لازم ترجع بحالتها من غير تركيب أو تعديل. مصاريف الشحن بتتحمّلها لو السبب مش عيب في القطعة.', en: 'You may return or exchange within 14 days of delivery if the part does not match the description or is defective. Parts must be returned unused, uninstalled and unmodified. Return shipping is on you unless the part itself is at fault.' },
  pol3_t: { ar: 'الضمان', en: 'Warranty' },
  pol3_d: { ar: 'القطع الجديدة بضمان سنة من تاريخ الشراء ضد عيوب الصناعة. القطع المستعملة الوارد بتتفحص بالكامل قبل البيع وعليها ضمان شهر ضد أي عيب فني. الضمان لا يشمل سوء الاستخدام أو التركيب الخاطئ.', en: 'New parts carry a one-year warranty against manufacturing defects. Used import parts are fully inspected before sale and carry a one-month warranty against technical faults. Warranty does not cover misuse or incorrect installation.' },
  pol4_t: { ar: 'طرق الدفع', en: 'Payment Methods' },
  pol4_d: { ar: 'الدفع عند الاستلام (كاش للمندوب) — أو تحويل انستاباي / محفظة إلكترونية قبل الشحن. بالنسبة للقطع الغالية أو اللي بتتوفر بالطلب، ممكن نطلب عربون بسيط لتأكيد الجدية.', en: 'Cash on delivery — or InstaPay / e-wallet transfer before dispatch. For high-value or special-order parts we may ask for a small deposit.' },
  pol5_t: { ar: 'من نحن', en: 'About Us' },
  pol5_d: { ar: 'FixIt متخصصون في قطع غيار BMW وMINI Cooper — استيراد مباشر من أوروبا وأمريكا بدون وسطاء. هدفنا توفير قطع أصلية مضمونة بأسعار عادلة مع خدمة عملاء محترمة.', en: 'FixIt specialises in BMW and MINI Cooper parts — imported directly from Europe and the USA with no middlemen. Our goal: genuine, guaranteed parts at fair prices with respectful customer service.' },
  pol_wa: { ar: 'عندك سؤال؟ كلمنا واتساب 💬', en: 'Have a question? Chat on WhatsApp 💬' },

  /* ---------- المساعد ---------- */
  title_assistant: { ar: 'اسأل الخبير | FixIt', en: 'Ask the Expert | FixIt' },
  as_title: { ar: 'اسأل خبير قطع الغيار 🤖', en: 'Ask the Parts Expert 🤖' },
  as_sub: { ar: 'مش عارف اسم القطعة؟ عندك صوت غريب في العربية؟ اوصف المشكلة وهنساعدك تعرف القطعة المطلوبة.', en: "Not sure which part you need? Hearing a strange noise? Describe the problem and we'll identify the part." },
  as_greeting: { ar: 'أهلاً بيك 👋 أنا خبير قطع غيار BMW و MINI. قولي نوع عربيتك وسنة الموديل والمشكلة اللي عندك، وهساعدك تحدد القطعة اللي محتاجها.', en: "Welcome 👋 I'm the BMW & MINI parts expert. Tell me your car model, year and the problem you're having, and I'll help you identify the part you need." },
  as_ph: { ar: 'مثال: عندي BMW F30 موديل 2015 وفيه صوت طقطقة في العفشة...', en: 'e.g. I have a 2015 BMW F30 with a knocking noise from the suspension...' },
  send: { ar: 'إرسال', en: 'Send' },
  thinking: { ar: '... بفكر', en: '... thinking' },
  as_error: { ar: 'الخدمة غير متاحة حالياً', en: 'Service temporarily unavailable' },
  as_fallback: { ar: 'تقدر تتواصل معانا واتساب مباشرة.', en: 'You can reach us directly on WhatsApp.' },

  /* ---------- اطلب قطعتك ---------- */
  title_request: { ar: 'اطلب قطعتك | FixIt', en: 'Request a Part | FixIt' },
  req_title: { ar: 'مش لاقي قطعتك؟ اطلبها 🔎', en: "Can't find your part? Request it 🔎" },
  req_sub: { ar: 'سيب بياناتك واسم القطعة (ورقم الشاسيه لو متاح) وهندور عليها ونرد عليك خلال ٢٤ ساعة.', en: 'Leave your details and the part name (plus your VIN if available) — we will source it and get back to you within 24 hours.' },
  req_part: { ar: 'القطعة المطلوبة *', en: 'Part needed *' },
  req_part_ph: { ar: 'مثال: طرمبة بنزين ميني كوبر R56', en: 'e.g. Fuel pump for MINI R56' },
  req_car: { ar: 'العربية (الموديل والسنة)', en: 'Car (model & year)' },
  req_car_ph: { ar: 'مثال: BMW F30 موديل 2015', en: 'e.g. BMW F30, 2015' },
  req_vin: { ar: 'رقم الشاسيه VIN (اختياري — بيضمن قطعة مظبوطة 100%)', en: 'VIN / chassis number (optional — guarantees an exact match)' },
  req_notes: { ar: 'تفاصيل إضافية (جديد ولا مستعمل؟ ميزانيتك؟)', en: 'Extra details (new or used? your budget?)' },
  req_send: { ar: 'إرسال الطلب 🔎', en: 'Send request 🔎' },
  req_success: { ar: 'وصلنا طلبك!', en: 'Request received!' },
  req_number: { ar: 'رقم الطلب:', en: 'Request number:' },
  req_success_sub: { ar: 'هندور على القطعة ونتواصل معاك على {p} خلال ٢٤ ساعة. لرد أسرع كلمنا واتساب:', en: 'We will source the part and contact you on {p} within 24 hours. For a faster reply, message us on WhatsApp:' },
  req_wa: { ar: 'تابع طلبك واتساب 💬', en: 'Follow up on WhatsApp 💬' },
  req_link: { ar: 'اطلب قطعة مش موجودة', en: 'Request a missing part' },
  cta_request: { ar: 'اطلب قطعتك دلوقتي 🔎', en: 'Request your part now 🔎' },

  /* ---------- إحصائيات الهيرو ---------- */
  stat1: { ar: '✓ قطع مفحوصة بضمان', en: '✓ Inspected & guaranteed' },
  stat2: { ar: '✓ شحن ٢-٤ أيام', en: '✓ 2-4 day delivery' },
  stat3: { ar: '✓ استيراد مباشر', en: '✓ Direct import' },

  /* ---------- أسئلة شائعة ---------- */
  faq_title: { ar: 'أسئلة شائعة ❓', en: 'FAQ ❓' },
  faq1_q: { ar: 'إزاي أتأكد إن القطعة تناسب عربيتي؟', en: 'How do I know the part fits my car?' },
  faq1_a: { ar: 'كل منتج مكتوب عليه الموديلات اللي بيناسبها ورقم الـ OEM. ولو مش متأكد، ابعتلنا رقم الشاسيه على واتساب أو استخدم صفحة "اطلب قطعتك" وهنتأكدلك 100%.', en: 'Every product lists compatible models and the OEM number. If unsure, send us your VIN on WhatsApp or use the "Request a Part" page and we will confirm 100%.' },
  faq2_q: { ar: 'إيه الفرق بين الجديد والمستعمل الوارد؟', en: 'What is the difference between new and used import?' },
  faq2_a: { ar: 'الجديد قطع أصلية بالكرتونة بضمان سنة. المستعمل الوارد قطع أصلية متفكّكة من عربيات أوروبية وأمريكية، بتتفحص بالكامل وعليها ضمان شهر — وبتوفر لحد 60% من سعر الجديد.', en: 'New parts are boxed originals with a one-year warranty. Used import parts come from European/US cars, fully inspected with a one-month warranty — saving up to 60% versus new.' },
  faq3_q: { ar: 'الدفع والشحن بيتموا إزاي؟', en: 'How do payment and delivery work?' },
  faq3_a: { ar: 'تدفع عند الاستلام كاش، أو تحوّل انستاباي/محفظة قبل الشحن. بنشحن لكل المحافظات خلال ٢-٤ أيام عمل وبنبلغك بتكلفة الشحن قبل التأكيد.', en: 'Pay cash on delivery, or transfer via InstaPay/e-wallet before dispatch. We deliver nationwide within 2-4 business days and confirm the shipping cost before dispatch.' },
  faq4_q: { ar: 'لو القطعة وصلت مش مناسبة أو فيها عيب؟', en: 'What if the part arrives wrong or faulty?' },
  faq4_a: { ar: 'ليك استرجاع أو استبدال خلال ١٤ يوم بشرط عدم التركيب. ولو ظهر عيب فني في فترة الضمان بنستبدلها أو نرجعلك فلوسك.', en: 'You can return or exchange within 14 days as long as the part is uninstalled. If a technical fault appears within warranty, we replace it or refund you.' },
  faq5_q: { ar: 'بتجيبوا قطع مش موجودة في الموقع؟', en: 'Can you source parts not listed on the site?' },
  faq5_a: { ar: 'أيوه! ده شغلنا الأساسي — استخدم صفحة "اطلب قطعتك" أو ابعت رقم الشاسيه واتساب، وبنوفر أغلب القطع خلال أيام من مخازننا أو بالاستيراد.', en: 'Yes! That is our specialty — use the "Request a Part" page or send your VIN on WhatsApp. We source most parts within days from our warehouses or by import.' },

  ship_progress: { ar: 'فاضل {v} وتوصل للشحن المجاني 🚚', en: 'Add {v} more for free shipping 🚚' },
  low_left: { ar: 'باقي {n} بس!', en: 'Only {n} left!' },

  /* ---------- متفرقات ---------- */
  share: { ar: 'مشاركة', en: 'Share' },
  link_copied: { ar: 'تم نسخ الرابط ✓', en: 'Link copied ✓' },
  nf_title: { ar: 'الصفحة مش موجودة', en: 'Page not found' },
  nf_sub: { ar: 'يمكن الرابط غلط أو الصفحة اتشالت — المتجر أهو كله قدامك 👇', en: 'The link may be wrong or the page was removed — the whole shop is right here 👇' },

  /* ---------- الفئات ---------- */
  cat_فرامل: { ar: 'فرامل', en: 'Brakes' },
  'cat_فلاتر وصيانة': { ar: 'فلاتر وصيانة', en: 'Filters & Service' },
  'cat_عفشة وتعليق': { ar: 'عفشة وتعليق', en: 'Suspension' },
  'cat_كهرباء وإشعال': { ar: 'كهرباء وإشعال', en: 'Electrical & Ignition' },
  cat_تبريد: { ar: 'تبريد', en: 'Cooling' },
  cat_وقود: { ar: 'وقود', en: 'Fuel' },
  'cat_هيكل وإكسسوارات': { ar: 'هيكل وإكسسوارات', en: 'Body & Accessories' },
  cat_أخرى: { ar: 'أخرى', en: 'Other' },
};

// t('key') → النص باللغة الحالية، مع استبدال {n} و {v} و {p}
function t(key, vars = {}) {
  const entry = I18N[key];
  let text = entry ? (entry[LANG] || entry.ar) : key;
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll('{' + k + '}', v);
  return text;
}

// اسم الفئة باللغة الحالية
function catName(cat) {
  return t('cat_' + cat);
}

// تبديل اللغة
function setLang(lang) {
  localStorage.setItem('lang', lang);
  location.reload();
}

// تطبيق الترجمة على عناصر الصفحة الثابتة: data-i18n / data-i18n-ph
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}
