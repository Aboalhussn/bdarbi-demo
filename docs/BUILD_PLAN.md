# بدربي — Build Plan for Claude Code

خطة بناء النسخة الحقيقية من بدربي على مراحل. كل مرحلة بيها:
- برومبت بالإنكليزي تنسخه لكلود كود.
- شرح بالعربي لشنو يگول البرومبت.
- شروط حتى تعتبر المرحلة خالصة.

**الترتيب:** امشِ مرحلة مرحلة، ولا تبدي بالمرحلة الجاية إلا بعد ما تتأكد من شروط اللي قبلها.

**النظام المستخدم:**

| الجزء | التقنية |
|---|---|
| السيرفر | Flask + PostgreSQL + Redis |
| تطبيقات الموبايل | Flutter، تطبيقين: «بدربي» للمسافر و«كابتن بدربي» للكابتن والمكاتب والإدارة |
| لوحة الإدارة على الويب | React |

**المرجع للشكل والتصرف:** الديمو بهذا الريبو `Aboalhussn/bdarbi-demo` وتصاميم كلود دزاين.

---

## Shared context (paste once at the start of every new Claude Code session)

```text
You are building the production version of بدربي (Bdarbi), an Iraqi intercity trip-booking platform.

Reference: the repo Aboalhussn/bdarbi-demo is a working React demo of every screen and rule. Treat it as the UI/UX and behaviour spec: copy layouts, copy text (Iraqi Arabic), flows and rules from it. Don't copy its code structure. Read docs/BUILD_PLAN.md for the phase plan.

Stack:
- backend/   Python 3.12, Flask (app factory + blueprints), SQLAlchemy 2 + Alembic, PostgreSQL 16, Redis (cache, OTP, rate limits, queues via RQ), Flask-SocketIO for live updates, JWT auth (access 15 min + refresh 30 days), Pydantic for request/response schemas, pytest.
- mobile/    Flutter 3 (Dart), one codebase with two flavors: "passenger" (app name بدربي, id iq.bdarbi.app) and "partner" (app name كابتن بدربي, id iq.bdarbi.partner). Riverpod, go_router, dio, freezed/json_serializable, flutter_secure_storage, firebase_messaging, google_maps_flutter or flutter_map, mobile_scanner, qr_flutter.
- admin-web/ React + TypeScript + Vite, TanStack Query, React Router. Website layout with sidebar, RTL.
- infra/     docker-compose (api, worker, postgres, redis, nginx), GitHub Actions CI.

Product rules (never break these):
- Arabic RTL first, Iraqi dialect in all UI text; English and Kurdish via i18n. Times on a 12-hour clock with ص/م. Money as 25,000 د.ع.
- Login is phone + password with no OTP. OTP only on sign-up (to verify the phone) and on forgot-password.
- Roles: passenger, captain, office (travel/tourism office), office_driver, admin.
- A solo traveller books 1 seat; a family booking can take several seats together. Each seat gets a passenger name. Ladies' seats are locked for men.
- A captain has only one active trip at a time; an office can run many trips at once.
- A captain registers their vehicle once; it's locked after approval. New captains upload driving licence (both sides) and the vehicle's annual registration, then wait for admin approval. Offices also need admin approval.
- Commission: 5% on electronic payments only, none on cash.
- Captains see only their overall rating; the rating ranks their trips in search.
- Hotels: no in-app booking yet. The book button opens WhatsApp or a call to the hotel's own number.
- Every screen has empty, loading, error and success states. Dark mode uses a designed palette (see the demo's src/dark-manual.css), never colour inversion.

Working rules:
- Work in small, reviewable steps. Run tests and linters before saying a step is done.
- Never hard-code secrets; use .env files (with a .env.example).
- At the end of each phase, update docs/PROGRESS.md with what was built, how to run it, and what's left.
```

**شرح:** هذا الكلام تلصقه بأول كل جلسة جديدة بكلود كود. يعرّفه:
- **شنو المشروع**، وإن ريبو الديمو هو المرجع للشكل والقواعد، وياخذ منه التصميم والكتابة بس، مو الكود.
- **التقنيات بكل جزء:**
  - السيرفر: Flask، وقاعدة بيانات PostgreSQL، وRedis للرموز والكاش.
  - Flutter بتطبيقين من كود واحد.
  - لوحة الإدارة بـ React.
  - Docker.
- **قواعد بدربي الثابتة:**
  - العربي واللهجة العراقية، والوقت بنظام 12 ساعة.
  - الدخول بدون رمز، والرمز بس عند التسجيل ونسيت كلمة السر.
  - المقاعد: مسافر وحده ياخذ مقعد واحد، والعائلة أكثر. مقاعد النساء مقفولة على الرجال.
  - الكابتن عنده رحلة وحدة فعالة، والمكتب أكثر.
  - المستمسكات وموافقة الإدارة، والعمولة 5% على الإلكتروني بس.
  - التقييم الكلي، والفنادق بالواتساب والاتصال.
- **طريقة الشغل:** خطوات صغيرة، واختبارات، وبدون أسرار بالكود، وتحديث ملف التقدم بنهاية كل مرحلة.

---

## Phase 0 — Project setup

```text
Phase 0: set up the monorepo.

1. Create folders backend/, mobile/, admin-web/, infra/, docs/.
2. infra/docker-compose.yml with services: postgres 16, redis 7, api (Flask via gunicorn + eventlet for SocketIO), worker (RQ), nginx. Healthchecks for each. A Makefile with: make up, make down, make migrate, make seed, make test, make lint.
3. backend/: Flask app factory, config by environment (dev/test/prod) from env vars, blueprints folder, SQLAlchemy + Alembic wired, /health endpoint, structured JSON logging, error handler that returns {"error": {"code", "message", "fields"}} with Arabic messages, ruff + mypy + pytest configured.
4. mobile/: Flutter project with two flavors (passenger, partner): different app names, bundle ids, icons and Firebase configs. RTL by default, Arabic locale, flutter_localizations, an empty home per flavor.
5. admin-web/: Vite React TS app, RTL, router, a login page placeholder.
6. GitHub Actions: backend lint + tests with Postgres/Redis services; admin-web build; Flutter analyze + test + build both flavor APKs as artifacts.
7. Root CLAUDE.md summarising the stack, commands and the product rules from the shared context. docs/PROGRESS.md started.

Done when: `make up` starts everything, /health returns ok, CI is green, both Flutter flavors build.
```

**شرح:** يجهز هيكل المشروع كامل:
- مجلد لكل جزء: السيرفر، والموبايل، ولوحة الإدارة، والبنية التحتية.
- Docker يشغل قاعدة البيانات وRedis والسيرفر بأمر واحد.
- Flutter بنسختين: بدربي وكابتن بدربي، كل وحدة باسمها وأيقونتها.
- لوحة الإدارة بـ React.
- GitHub Actions يفحص ويبني كل شي ويطلع APK للتطبيقين.
- ملف CLAUDE.md يحفظ القواعد حتى كلود كود يرجعلها بكل جلسة.

**تعتبر خالصة لما:**
- كلشي يشتغل بأمر `make up`.
- الفحص بـ GitHub أخضر.
- التطبيقين ينبنون.

---

## Phase 1 — Accounts and auth (backend)

```text
Phase 1: users and authentication in backend/.

Models: User (id, phone unique E.164 +964, name, password_hash argon2, role, status [active, pending_review, rejected, suspended, deleted], gender, avatar_url, lang, dark_mode, notif_on, created_at), Device (user_id, fcm_token, platform, last_seen), OtpCode in Redis only (phone, purpose [register, reset], code hash, attempts, expires 5 min).

Endpoints under /api/v1/auth:
- POST /register/start {name, phone, password} → validates, sends OTP (purpose register). Password rules like the demo's PASS_RULES.
- POST /register/verify {phone, code} → creates the user, returns tokens.
- POST /login {phone, password} → tokens. NO OTP on login. Wrong password → Arabic error.
- POST /forgot/start {phone} → OTP (purpose reset). POST /forgot/verify {phone, code} → short reset token. POST /forgot/reset {reset_token, new_password}.
- POST /refresh, POST /logout (revoke refresh token in Redis).
- GET/PATCH /me (name, avatar, gender, lang, dark_mode, notif_on). DELETE /me with body {"confirm": "احذف"} → soft delete, cancel future bookings, refund.

SMS: an SmsProvider interface with a console provider for dev and a stub for a real Iraqi SMS gateway. Rate limits in Redis: 3 OTP sends per phone per 15 min, 5 verify attempts per code, 10 logins per minute per IP.

Role guards: decorators require_role(...). Tests for every endpoint, including wrong code, expired code, rate limit, and deleted user.

Done when: all auth tests pass and docs/api.md lists the endpoints with request/response examples.
```

**شرح:** يبني الحسابات بالسيرفر:
- **جدول المستخدمين:** الرقم العراقي، والاسم، وكلمة السر مشفرة، والدور (مسافر أو كابتن أو مكتب أو سائق مكتب أو إدارة)، والحالة.
- **التسجيل:** يدز رمز للرقم، وبعد التأكيد ينشئ الحساب.
- **الدخول:** بالرقم وكلمة السر بدون رمز.
- **نسيت كلمة السر:** رقم، بعدها رمز، بعدها كلمة سر جديدة.
- **تعديل البيانات والإعدادات**، و**حذف الحساب** بكتابة «احذف».
- **الحماية:**
  - حد لإرسال الرموز وللمحاولات حتى ما ينضرب.
  - الرسائل تطلع بالكونسول وقت التطوير، ومجهزة لشركة رسائل عراقية بعدين.
- **اختبار لكل حالة.**

**تعتبر خالصة لما:** كل الاختبارات تعدي، وملف الـ API يكون موثق.

---

## Phase 2 — Core data: garages, vehicles, trips, seats, bookings

```text
Phase 2: core booking domain in backend/.

Models:
- Garage (name, city, address, lat, lng, hours or is_24h, phone, services[], active).
- Vehicle (owner_type captain|office, owner_id, kind [باص, كوستر, سيارة, VIP], model, plate, seats, color, year, seat_layout json, locked_at). A captain's vehicle is locked after approval.
- Trip (id, operator_type captain|office, operator_id, driver_id, vehicle_id, from_city, to_city, garage_id, end_garage_id, depart_at, arrive_at, price, platform, status [scheduled, started, arrived, cancelled], delay_min, started_at, arrived_at, ladies_seats int[]).
- Booking (code 6 chars unique, trip_id, user_id, seats int[], passengers [{seat, name, gender}], is_family, subtotal, discount, total, pay_method [cash, zaincash, card, wallet], pay_status, status [confirmed, cancelled], cancelled_by, boarded_at, created_at).
- SeatHold in Redis (trip_id, seat, user_id, ttl 7 min) so two people can't take the same seat.

Rules (enforce in a BookingService, with tests):
- Solo booking = exactly 1 seat; family booking = 2+ seats. Every seat needs a passenger name.
- A man can't take a ladies' seat. Seats already booked or held can't be chosen.
- A captain can't have two active trips (scheduled/started) that overlap; an office can.
- Departed trips (now > depart_at - 10 min) and full trips are hidden from search.
- Cancel: passenger can cancel until departure; refund to the same method; if the captain cancels, all bookings are cancelled and refunded and passengers are notified.

Endpoints /api/v1:
- GET /garages, GET /cities.
- GET /trips/search?from&to&date → only bookable trips, sorted by operator overall rating desc, then time.
- GET /trips/{id} with seat map (free / taken / held / ladies).
- POST /trips/{id}/hold {seats}, DELETE hold.
- POST /bookings {trip_id, seats, passengers, is_family, coupon, pay_method} → creates a pending booking; cash confirms right away, electronic waits for payment (Phase 4).
- GET /bookings/mine?tab=upcoming|past|cancelled, GET /bookings/{code}, POST /bookings/{code}/cancel.
- GET /bookings/{code}/ticket → data for the ticket + QR payload signed with HMAC (code, trip, seats, exp) so captains can verify offline.

Seed script: the demo's garages, cities, trips (src/data.ts) and demo passengers.

Done when: service tests cover every rule above, including two users racing for one seat.
```

**شرح:** يبني قلب التطبيق:
- **الكراجات:** الموقع والدوام والخدمات.
- **المركبات:** تنقفل بعد موافقة الإدارة.
- **الرحلات:** من وين لوين، والوقت، والسعر، والحالة (ما انطلقت، بالطريق، وصلت، ملغية)، ومقاعد النساء.
- **الحجوزات:** رمز من 6 حروف، والمقاعد، واسم كل راكب، وطريقة الدفع.
- **حجز مؤقت للمقعد** 7 دقايق، حتى ما يحجز اثنين نفس المقعد بنفس الوقت.
- **القواعد:**
  - مسافر وحده ياخذ مقعد واحد، والعائلة أكثر.
  - مقاعد النساء مقفولة على الرجال.
  - الكابتن ما يگدر يسوي رحلتين بنفس الوقت.
  - البحث يطلع بس الرحلات المتوفرة، مرتبة حسب التقييم.
  - الإلغاء والاسترجاع، وإذا الكابتن لغى ينبلغون كل الركاب.
- **التذكرة:** فيها QR موقّع، حتى الكابتن يتأكد منه حتى بدون إنترنت.
- **بيانات تجريبية** من الديمو.

**تعتبر خالصة لما:** كل قاعدة إلها اختبار، ومنها اختبار شخصين يتسابقون على نفس المقعد.

---

## Phase 3 — Passenger app (Flutter, flavor: passenger)

```text
Phase 3: the passenger app بدربي in mobile/ (passenger flavor). Match the demo's screens and copy exactly; open the demo in a browser for reference.

1. Design system in lib/theme: colour tokens for light and dark copied from the demo (styles.css :root and dark-manual.css), Alexandria + IBM Plex Sans Arabic fonts, components: AppButton (primary/light/ghost/soft), Chip, Pill (ok/bad/info/warn), Card, Sheet, TopBar, Hero header with the pattern, floating tab bar, Toast (violet, white text), PhoneField (+964 flag), OtpPad, Switch, empty/error/loading widgets.
2. Screens: splash → onboarding (location, notifications) → login (phone + password, «نسيت كلمة السر؟») → register → OTP → home (greeting, rewards card, city chips, today's trips, hotels banner, coaster, garages) → pick trip (city chips + day chips in the same style; only available trips, best rated first) → seats (solo/family, legend, ladies' seats) → checkout (names per seat, gender, coupon, payment method) → ticket (QR, save image, share, track) → my trips (upcoming/past/cancelled) → track (map with live bus position) → rate → profile, personal info, wallet, rewards & coupons, settings, help & support, policy.
3. Error screens: no internet (global overlay), trip cancelled, seat just taken (from a 409 on booking).
4. Data: dio client with JWT refresh, Riverpod repositories per feature, cache the last ticket for offline view.
5. Portrait only. Dark mode toggle in settings uses the dark tokens. Language switch (ar/en/ku).
6. Widget tests for the booking flow and golden tests for ticket and seat map in light and dark.

Done when: a real user can register, book, see the ticket and cancel against the local backend, and the APK builds from CI.
```

**شرح:** يبني تطبيق المسافر بـ Flutter، ويطابق الديمو بالشكل والكتابة.

**نظام التصميم:**
- نفس ألوان بدربي بالفاتح والليلي، ونفس الخطوط.
- الأزرار والكروت والـ chips والتاب بار العائم.
- الإشعار البنفسجي بكتابة بيضة.
- حقل الرقم بالعلم.

**كل الشاشات:**
- البداية والدخول والتسجيل والرمز.
- الرئيسية، واختيار الرحلة (المتوفرة بس، مرتبة بالتقييم)، والمقاعد.
- تأكيد الحجز، والتذكرة بالـ QR، ورحلاتي، والتتبع بالخريطة، والتقييم.
- الحساب والمحفظة والمكافآت والإعدادات والمساعدة.

**شاشات الأخطاء:** ما اكو إنترنت، والرحلة انلغت، والمقعد انحجز هسه.

**غيرها:**
- التطبيق يبقى عمودي.
- الوضع الليلي وتغيير اللغة.
- اختبارات لمسار الحجز.

**تعتبر خالصة لما:** مستخدم حقيقي يگدر يسجل ويحجز ويشوف التذكرة ويلغي على السيرفر.

---

## Phase 4 — Payments and wallet

```text
Phase 4: payments.

1. PaymentProvider interface with implementations: Cash (confirms booking, no commission), ZainCash (merchant API: create transaction → redirect/OTP → callback with signed JWT → verify), Card (Qi/Mastercard gateway stub with the same shape), and a Fake provider for dev/tests.
2. Payment model (booking_id, provider, amount, status [pending, paid, failed, refunded], provider_ref, raw callback, created_at). Idempotent callbacks. Booking confirms only when payment is paid; a pending booking holds seats for 7 minutes, then expires.
3. Refunds through the same provider; cash refunds are recorded for the garage.
4. Commission: 5% on electronic payments only, stored per payment. Ledger tables: WalletAccount (captain, office, platform), LedgerEntry (double entry: debit/credit, reason, ref).
5. Captain/office wallet: they must add a payout card first; the Bdarbi card shows the balance; withdraw request → admin approves (Phase 7) → paid.
6. Passenger app: payment screen with method choice → OTP/confirmation step → processing → success/fail, receipt with transaction number (match the demo's Pay screen).
7. Tests: paid, failed, double callback, refund, commission maths.

Done when: a ZainCash sandbox payment confirms a booking end to end and the ledger balances.
```

**شرح:** يربط الدفع الحقيقي:
- **طرق الدفع:**
  - كاش: يأكد الحجز بدون عمولة.
  - زين كاش: بالطريقة الرسمية، ويتأكد من الرد الموقّع من زين كاش.
  - بطاقة.
  - طريقة وهمية للتجربة.
- **الحجز الإلكتروني** ما يتأكد إلا بعد ما تنجح الدفعة. إذا ما ندفع خلال 7 دقايق ينلغي ويرجع المقعد.
- **الاسترجاع** لنفس طريقة الدفع.
- **العمولة** 5% على الإلكتروني بس، وتنحسب بدفتر حسابات دقيق.
- **محفظة الكابتن والمكتب:** يضيف بطاقته أول، وبعدها يطلب سحب، والإدارة توافق.
- **شاشة الدفع بالتطبيق** مثل الديمو.

**تعتبر خالصة لما:** دفعة تجريبية بزين كاش تأكد حجز من البداية للنهاية، والحسابات مضبوطة.

---

## Phase 5 — Captain app (Flutter, flavor: partner)

```text
Phase 5: the captain side of كابتن بدربي (partner flavor). Match the demo's Driver/Captain screens.

Backend:
- Captain sign-up: phone → OTP → personal info → vehicle (locked after approval) → documents upload (licence front/back, vehicle annual registration) to S3-compatible storage (MinIO in dev) → status pending_review.
- Trips for the captain: create trip wizard (vehicle fixed, route, garages, date, time, price, platform); start / delay (minutes) / cancel / arrived. Each change notifies the trip's passengers.
- Manifest: passengers with seats, pay method, boarded state. POST /trips/{id}/board {code or qr_payload} verifies the HMAC, returns ok / already boarded / cancelled / wrong trip.
- Live location: POST /trips/{id}/location every 10 s while started; broadcast over SocketIO room trip:{id}; store the last point in Redis.
- Earnings by day/week/month, overall rating, goals/challenges with progress and claim (reward credited to the wallet).

App (partner flavor, captain role):
- Login, then a pending screen until approved. Tabs: home (today's trip card with start/delay/cancel/arrived, quick stats), passengers (list + new requests from the top button), scan (camera QR + manual code, result screen), achievements (goals, yellow amounts, green when ready), profile (wallet, earnings, documents, settings, help).
- Background location while a trip is started (with the Android foreground service notice).

Done when: a captain can be approved, run a trip, scan a real ticket from the passenger app, and passengers see the bus move live.
```

**شرح:** يبني جهة الكابتن.

**بالسيرفر:**
- **تسجيل الكابتن:** رقم، بعدها رمز، بعدها معلوماته، بعدها المركبة (تنقفل بعد الموافقة). بعدها يرفع إجازة السوق بوجهين والسنوية، وينتظر موافقة الإدارة.
- **إنشاء رحلة** وإدارتها: انطلقنا، تأخير، إلغاء، وصلنا. كل تغيير يوصل إشعار للركاب.
- **قائمة الركاب، ومسح التذكرة:** يتأكد من توقيعها، ويگول صعد أو صاعد من قبل أو ملغية أو رحلة غلط.
- **الموقع المباشر:** كل 10 ثواني وقت الرحلة، حتى الركاب يشوفون الباص يتحرك.
- **الأرباح** باليوم والأسبوع والشهر، والتقييم الكلي، والتحديات ومكافآتها للمحفظة.

**بالتطبيق:**
- صفحة انتظار الموافقة.
- التابات: الرئيسية بكارت الرحلة، والركاب، والمسح، والإنجازات (المبالغ بالأصفر والجاهزة بالأخضر)، والحساب.

**تعتبر خالصة لما:** كابتن ينقبل، ويشغل رحلة، ويمسح تذكرة حقيقية، والركاب يشوفون الباص يتحرك.

---

## Phase 6 — Travel offices and packages

```text
Phase 6: offices (partner flavor, office and office_driver roles).

Backend:
- Office sign-up: phone → OTP → office info (name, manager, city, address, fleet size, password) → documents → pending_review.
- Office fleet (vehicles), office drivers (invite by phone; the driver sets a password; logs into the partner app and only sees trips assigned to him and can scan their tickets).
- Office trips: same as captain trips but many at once, each with vehicle + driver; overlap checks per vehicle and per driver.
- Packages (سفرات المكاتب): title, type, photos (up to 5), from/to, meet garage + note, date, nights, what's included (chips), day-by-day plan (day title + items), adult/child price, single supplement, seats, description; status pending → published by admin. Package bookings with lead traveller, travellers count, payment.
- Office stats: today's sales, bookings per trip, weekly chart.

App (office role): tabs = home (sales) / today's trips with passengers / + (create trip or package, same wizard as the captain) / fleet (vehicles + add) / profile (office info, driver accounts, settings, help).
Passenger app: «سفرات المكاتب» tab in pick-trip; package detail with what's included and the day-by-day plan (option «أ» from the design); package booking and ticket.

Done when: an office publishes a package, admin approves it, a passenger books it, and the office's driver scans that passenger.
```

**شرح:** يبني جهة مكاتب السفر.

**بالسيرفر:**
- **تسجيل المكتب** بالرمز والمستمسكات، وينتظر الموافقة.
- **الأسطول والسواق:** المكتب يضيف سائق برقمه. السائق يدخل لتطبيق الكابتن ويشوف بس الرحلات اللي المكتب نطاها إله، ويمسح تذاكرها.
- **رحلات المكتب:** هواية بنفس الوقت، كل وحدة بمركبتها وسائقها.
- **سفرات المكاتب:**
  - الصور، وشنو يشمل، وخطة يوم بيوم.
  - أسعار الكبار والصغار والغرفة المفردة.
  - ما تطلع للناس إلا بعد موافقة الإدارة.

**بالتطبيق:**
- **المكتب:** تاباته (الرئيسية، ورحلات اليوم، والزائد، والأسطول، والحساب).
- **المسافر:** يشوف السفرات بالشكل اللي اخترته (خيار أ ويا خطة الأيام)، ويحجزها.

**تعتبر خالصة لما:** مكتب ينشر سفرة، والإدارة توافق، ومسافر يحجز، وسائق المكتب يمسحه.

---

## Phase 7 — Admin (web dashboard + admin in the partner app)

```text
Phase 7: admin.

Backend /api/v1/admin (role admin, audit log for every write: who, what, before/after, when):
- Overview numbers (today's bookings, active trips, published packages, today's commission), needs-attention list, weekly bookings chart.
- Join requests: captains and offices with their documents; approve / reject with a reason (notifies the applicant).
- Offices list and details.
- Bookings: search by booking code; booking detail with status timeline (booked → boarded → departed → arrived or cancelled by whom), route and garages, driver name + phone + vehicle + plate, passenger, seats, payment, rating.
- Package review queue (publish / reject).
- Support inbox: threads from passengers, captains and offices; replies go back to the user's in-app chat.
- Finance: withdrawal requests (approve → mark paid), commission totals.
- Challenges for captains (title, reward, target) → notification to captains.
- Garages: add with map pin, hours (24h or open/close), services.
- Hotels: add with photo, city, landmark, address, booking phone + WhatsApp, stars, check-in/out, amenities, rooms + prices, about, notes.
- Coupons: code (or generated), percent or amount, max discount, audience (all / new users / users with N+ trips / specific phones), expiry, active switch. Booking checkout validates them.
- Admin settings: language, dark mode, which alerts to receive.

admin-web/: website layout with a sidebar (Settings just above the account/logout card), every section above, RTL, dark mode. Use the demo's Admin screens and the iPad mockups as the spec.
Partner app, admin role: phone layout with tabs (home, requests, support, finance, more) and a sidebar layout on tablets; only the admin part can rotate.

Done when: every admin action works from the website and from the phone, and each write shows up in the audit log.
```

**شرح:** يبني الإدارة.

**بالسيرفر:** كل حركة من الإدارة تنسجل منو سواها ووكت. والصلاحيات:
- **نظرة عامة:** أرقام، و«يحتاج انتباهك»، ورسمة الحجوزات الأسبوعية.
- **طلبات الانضمام** ويا المستمسكات: موافقة، أو رفض ويا السبب.
- **الحجوزات:** بحث برمز الحجز، والتفاصيل كاملة (وصلت لو لا، ومنو السائق ورقمه ومركبته، ومن وين لوين، والدفع).
- **مراجعة السفرات**، و**صندوق الدعم** اللي يرد على محادثة المستخدم.
- **السحوبات والعمولة**، و**التحديات** ويا إشعار للكباتن.
- **الكراجات** بالخريطة والدوام، و**الفنادق** بكل تفاصيلها.
- **الكوبونات:** عامة، أو للجدد، أو لمن كمل عدد رحلات، أو لأرقام معينة.
- **إعدادات الإدارة.**

**الواجهات:**
- موقع على الحاسبة بسايد بار، والإعدادات فوك تسجيل الخروج.
- بتطبيق الكابتن: تابات بالتلفون، وسايد بار بالآيباد. الإدارة بس تتدور.

**تعتبر خالصة لما:** كل شي يشتغل من الموقع والتلفون، وكل حركة تنسجل.

---

## Phase 8 — Notifications, live updates, support chat

```text
Phase 8: messaging.

1. Notification service: one function notify(user_ids, type, title, body, link) that writes an in-app Notification row and sends FCM push (respecting the user's notif_on and admin alert preferences). Templates in Iraqi Arabic for: booking confirmed, payment failed, trip delayed/started/arrived/cancelled, boarding confirmed, rate your trip, new challenge, request approved/rejected, withdrawal paid, new support reply, package approved/rejected, new join request (admin).
2. Scheduled jobs (RQ scheduler): reminder 2 h and 30 min before departure, expire unpaid bookings, rating prompt after arrival, daily earnings summary for captains.
3. SocketIO: rooms per trip (status + location) and per support thread; the apps reconnect with backoff.
4. Support chat: threads per user role, messages with text and image, read state, the round chat button in Help; «بلّغ عن مشكلة» creates a message with the category and booking code.
5. Notification centre screen in both apps; a test-notification button in settings.

Done when: every event in the list reaches the right phone as a push and appears in the notification centre.
```

**شرح:**
- **إشعارات حقيقية للتلفون** بكل الأحداث، باللهجة العراقية:
  - تأكيد الحجز وفشل الدفع.
  - تأخير الرحلة وانطلاقها ووصولها وإلغاؤها.
  - صعود الراكب، وطلب التقييم.
  - تحدي جديد، وموافقة أو رفض الطلب.
  - السحب، ورد الدعم، وموافقة السفرة.
- **الإشعارات تحترم إعداداتك:** إذا طافيها ما توصل.
- **تذكيرات تلقائية:** قبل الرحلة بساعتين ونص ساعة، وإلغاء الحجوزات اللي ما اندفعت، وطلب التقييم بعد الوصول.
- **تحديثات مباشرة** للرحلة والدعم بدون تحديث الصفحة.
- **محادثة الدعم** بالصور، و«بلّغ عن مشكلة» ويا رمز الحجز.
- **صفحة الإشعارات** وزر التجربة.

**تعتبر خالصة لما:** كل حدث بالقائمة يوصل للتلفون الصحيح كإشعار، ويطلع بصفحة الإشعارات.

---

## Phase 9 — Hotels, coaster, rewards and coupons (passenger)

```text
Phase 9: extras in the passenger app.

1. Hotels list (city chips) and hotel detail from the admin data: photo, amenities, about, address, check-in/out, notes, rooms with prices, date range; «أحجز الغرفة» opens WhatsApp with a prefilled message to the hotel's number, or calls it. No in-app hotel booking.
2. Private coaster request (destination, date, people count, round trip) → creates a support/lead ticket for admin.
3. Rewards: points per completed trip, progress to a free trip, coupons list (admin coupons the user is eligible for), apply at checkout.
4. Garages screen with the map and each garage's info and services.

Done when: hotels and coupons added in the admin show up and work in the passenger app.
```

**شرح:**
- **الفنادق:** من بيانات الإدارة، بالصور والخدمات والغرف وأسعارها. زر الحجز يفتح واتساب برسالة جاهزة لرقم الفندق، أو يتصل بيه. ما اكو حجز فنادق داخل التطبيق هسه.
- **طلب كوستر خاص:** يوصل للإدارة.
- **النقاط والمكافآت والكوبونات:** يشوف الكوبونات اللي تشمله ويستخدمها بالدفع.
- **خريطة الكراجات** ومعلوماتها.

**تعتبر خالصة لما:** الفندق والكوبون اللي تضيفهم الإدارة يطلعون ويشتغلون عند المسافر.

---

## Phase 10 — Polish: languages, dark mode, states, accessibility

```text
Phase 10: polish across both apps and the admin web.

1. Full translations ar / en / ku (ckb), with LTR layout for English; all strings in ARB files, no hard-coded text.
2. Dark mode on every screen with the designed palette; photos, flag, mascot, maps and QR stay in natural colours; status bar colour follows the screen and theme.
3. Every list has empty states; every screen has loading skeletons and error states; every form has inline errors; disabled buttons explain why.
4. Accessibility: semantics labels on icon buttons, 44px touch targets, text scaling up to 130% without breaking layouts.
5. Orientation: passenger, captain and office are portrait only; admin rotates and gets the sidebar on tablets.
6. App icons, splash screens, store screenshots (phone + iPad 12.9" and 11").

Done when: a screenshot pass of every screen in ar/en, light/dark, phone/tablet shows no layout or contrast problems.
```

**شرح:**
- **الترجمة الكاملة** للعربي والإنكليزي والكردي، والإنكليزي من اليسار.
- **الوضع الليلي** بكل الشاشات بالألوان المصممة، والصور والعلم والخرائط والـ QR تبقى طبيعية.
- **حالات الفراغ والتحميل والخطأ** بكل مكان.
- **سهولة الاستخدام:** أزرار بحجم مناسب، ويتحمل تكبير الخط.
- **التدوير:** المسافر والكابتن والمكاتب عمودي، والإدارة تتدور.
- **الأيقونات والسبلاش وصور المتجر.**

**تعتبر خالصة لما:** تمر على صور كل الشاشات بالعربي والإنكليزي، وبالفاتح والليلي، وبالتلفون والآيباد، وما تلگى مشكلة بالترتيب أو الألوان.

---

## Phase 11 — Security, testing and performance

```text
Phase 11: hardening.

1. Security review: auth and role checks on every endpoint (write tests that a passenger can't reach captain/office/admin endpoints), IDOR checks (users only see their own bookings), input validation, upload checks (type, size, virus-scan hook), signed URLs for documents, CORS, HTTPS only, secure headers, secrets in env, refresh-token rotation, OTP brute-force limits, admin audit log.
2. Privacy: document what personal data is stored, data retention, account deletion removes personal data, privacy policy page.
3. Tests: backend coverage ≥ 80% on services; Flutter integration tests for register → book → pay → ticket → board → rate, and for captain and office flows; admin-web tests for approvals and coupons.
4. Load test (locust): 500 concurrent searches and 50 concurrent bookings on one trip, with no double-booked seat.
5. Monitoring: Sentry for api, apps and admin; request metrics; alerts for payment callback failures.

Done when: the security tests pass, the load test shows zero double bookings, and Sentry receives test errors.
```

**شرح:**
- **فحص أمني:**
  - كل مستخدم يشوف بس بياناته.
  - المسافر ما يگدر يوصل لصفحات الكابتن أو الإدارة.
  - فحص الملفات المرفوعة.
  - روابط موقّعة للمستمسكات.
  - حماية من تخمين الرموز.
- **الخصوصية:** شنو نخزن، وحذف الحساب يمسح البيانات الشخصية.
- **اختبارات شاملة** للمسارات كلها.
- **اختبار ضغط:** 500 بحث بنفس الوقت، و50 شخص يحجزون نفس الرحلة، والمطلوب صفر حجز مكرر لنفس المقعد.
- **مراقبة الأخطاء** بـ Sentry، وتنبيه إذا فشل رد الدفع.

**تعتبر خالصة لما:** اختبارات الأمان تعدي، واختبار الضغط ما بيه ولا حجز مكرر، وSentry يوصله الخطأ التجريبي.

---

## Phase 12 — Deploy and release

```text
Phase 12: production.

1. Server: a VPS (or managed Postgres + Redis) with docker-compose.prod.yml, nginx + Let's Encrypt, automated daily Postgres backups with a tested restore, zero-downtime deploy from GitHub Actions on tag.
2. Environments: staging and production with separate databases, Firebase projects and payment sandbox/live keys.
3. admin-web deployed behind the same domain (admin.bdarbi.iq) with admin-only login.
4. Mobile: signed release builds; Google Play (internal testing → closed testing → production) and App Store (TestFlight → review), with the account-deletion and privacy requirements met; store listings in Arabic with the screenshots.
5. Runbook in docs/RUNBOOK.md: deploy, rollback, restore backup, rotate keys, handle a payment provider outage.

Done when: staging and production are live, both apps are in testing tracks, and the runbook steps were tried once.
```

**شرح:**
- **سيرفر حقيقي:** شهادة أمان HTTPS، ونسخ احتياطي يومي لقاعدة البيانات ومجرب استرجاعه، ونشر تلقائي من GitHub بدون توقف.
- **بيئتين:** تجريبية وحقيقية، كل وحدة بقاعدة بياناتها ومفاتيحها.
- **لوحة الإدارة على دومين خاص.**
- **رفع التطبيقين** على Google Play وApp Store، من الاختبار الداخلي للنشر الكامل، ويا شروط الخصوصية وحذف الحساب.
- **دليل تشغيل:** النشر، والرجوع لنسخة قديمة، واسترجاع النسخة الاحتياطية، والتعامل ويا عطل الدفع.

**تعتبر خالصة لما:** البيئتين شغالات، والتطبيقين بمرحلة الاختبار بالمتاجر، وخطوات الدليل انجربت مرة وحدة.

---

## Tips for working with Claude Code

- قبل كل مرحلة گله: `Read CLAUDE.md, docs/BUILD_PLAN.md and docs/PROGRESS.md, then start Phase N.`
- إذا المرحلة كبيرة گله: `Plan Phase N as small steps first, show me the plan, then build step by step.`
- بعد كل مرحلة گله: `Run all tests and linters, fix failures, update docs/PROGRESS.md, then commit.`
- إذا طلع شي يختلف عن الديمو گله: `Match the demo screen <name> in bdarbi-demo exactly.`
