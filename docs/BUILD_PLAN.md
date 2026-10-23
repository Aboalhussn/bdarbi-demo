# Bdarbi (بدربي) — Production Build Plan for Claude Code

This plan builds the **launch-ready** version of Bdarbi, step by step. It's a real product, not a demo.

How to use it:
- Run one phase at a time, in order.
- Each phase has a prompt to paste into Claude Code and a "Done when" check. Don't start the next phase until the current one passes its check.
- Paste the **Shared context** at the start of every new Claude Code session.

---

## Shared context (paste at the start of every session)

```text
You are building the production, launch-ready version of بدربي (Bdarbi), an Iraqi intercity trip-booking platform. This is NOT a demo.

REFERENCE
The public repo Aboalhussn/bdarbi-demo is a working React prototype of every screen and rule. Use it only as the UI/UX and behaviour spec: layouts, Iraqi-Arabic copy, flows and rules. Don't copy its code structure, its localStorage approach, or its demo data.

STACK
- backend/   Python 3.12, Flask (app factory + blueprints), SQLAlchemy 2 + Alembic, PostgreSQL 16, Redis (cache, OTP, rate limits, seat holds, RQ queues), Flask-SocketIO for live updates, JWT auth (access 15 min + rotating refresh 30 days), Pydantic schemas, pytest.
- mobile/    Flutter 3, one codebase with two flavors:
             "passenger" → app name بدربي, id iq.bdarbi.app
             "partner"   → app name كابتن بدربي, id iq.bdarbi.partner (captains, travel offices, office drivers, admin)
             Riverpod, go_router, dio, freezed/json_serializable, flutter_secure_storage, firebase_messaging, maps, mobile_scanner, qr_flutter.
- admin-web/ React + TypeScript + Vite, TanStack Query, React Router, RTL, sidebar website layout.
- infra/     docker-compose for dev and prod, nginx, GitHub Actions CI/CD.

NO FAKE DATA — LAUNCH-READY RULES
- Never create demo, sample or seed content: no fake trips, garages, hotels, users, bookings, reviews, ratings, coupons or numbers. Every list starts empty and shows its empty state. All content is created by real users and by the admin.
- Only static reference data is allowed: Iraq's governorates/cities, payment method names, document types.
- The ONLY seeded record is the admin account, created by a management command from environment variables:
    ADMIN_NAME, ADMIN_PHONE, ADMIN_PASSWORD
  The values come from the owner's .env, never from code, tests or git. The admin signs in to the partner app (كابتن بدربي) and to admin-web.
- No fake or "console" providers in staging/production. Test doubles live only inside the test suite. If a real provider's credentials are missing, the app must fail at startup with a clear message saying which variable is missing, not silently fake it.

ASK THE OWNER FOR ANYTHING EXTERNAL
Whenever a step needs something you can't create yourself, STOP and ask the owner, listing exactly what you need. This covers API keys, merchant accounts, SMS gateway, Firebase project files, maps keys, a domain, a server, store accounts, signing keys, legal text, the logo and other brand assets, and business decisions. For each item give:
  1. what it is and why it's needed
  2. where to get it (official site / console page)
  3. the exact env variable or file path it goes into
Add every variable to .env.example with a comment. Never invent keys, URLs or account details. Never commit secrets.

PRODUCT RULES (never break these)
- Arabic RTL first, Iraqi dialect in all UI text; English and Kurdish (ckb) via i18n. 12-hour times with ص/م. Money as 25,000 د.ع.
- Login is phone + password with no OTP. OTP only at sign-up (to verify the phone) and in forgot-password.
- Roles: passenger, captain, office, office_driver, admin.
- A solo traveller books 1 seat; a family booking takes several seats together. Each seat gets a passenger name. Ladies' seats are locked for men.
- A captain has one active trip at a time; an office can run many at once.
- A captain registers their vehicle once; it's locked after approval. Captains upload driving licence (front + back) and the vehicle's annual registration, then wait for admin approval. Offices also need admin approval.
- Commission: 5% on electronic payments only, none on cash.
- Captains see only their overall rating; the rating ranks trips in search.
- Hotels: no in-app booking yet. The book button opens WhatsApp or a call to the hotel's own number.
- Every screen has empty, loading, error and success states. Dark mode is a designed palette (see the prototype's src/dark-manual.css), never colour inversion. Photos, the flag, maps and QR codes keep natural colours.
- Passenger, captain and office screens are portrait-only; only the admin part rotates, with a sidebar on tablets.

WORKING RULES
- Small, reviewable steps. Run tests and linters before saying a step is done.
- Keep a root CLAUDE.md with the stack, commands and these rules.
- At the end of each phase, update docs/PROGRESS.md with:
  - what was built
  - how to run it
  - what's left
  - what you still need from the owner
```

---

## Phase 0 — Project setup

```text
Phase 0: set up the monorepo.

1. Folders: backend/, mobile/, admin-web/, infra/, docs/.
2. infra/docker-compose.yml (dev): postgres 16, redis 7, api (gunicorn + eventlet for SocketIO), worker (RQ + scheduler), minio (S3-compatible storage for dev only), nginx. Healthchecks. A Makefile with: up, down, migrate, create-admin, test, lint.
3. backend/:
   - Flask app factory, with config read from env per environment (dev / test / staging / prod).
   - Startup validation that refuses to run in staging/prod if a required variable is missing.
   - /health endpoint.
   - JSON logging.
   - Error format {"error": {"code", "message", "fields"}} with Arabic messages.
   - ruff, mypy and pytest set up.
4. Management command `flask create-admin` that reads ADMIN_NAME, ADMIN_PHONE, ADMIN_PASSWORD from env and creates or updates the single admin user (role admin, phone normalised to +964). It is idempotent and prints no password.
5. mobile/: Flutter project with the passenger and partner flavors (names, ids, icons, separate Firebase config files per flavor), RTL Arabic by default, flutter_localizations, portrait lock for both flavors (the admin screens unlock rotation later).
6. admin-web/: Vite React TS, RTL, router, login page.
7. GitHub Actions:
   - backend lint + tests with Postgres/Redis services
   - admin-web build
   - Flutter analyze + test + build both flavors
8. .env.example for backend, mobile (via --dart-define) and admin-web, every variable commented.
9. Root CLAUDE.md, docs/PROGRESS.md.

Then list what you need from the owner for later phases (Firebase projects, domain, etc.) in docs/PROGRESS.md under "Needed from owner".

Done when:
- `make up` runs everything.
- `make create-admin` creates the admin from .env.
- CI is green.
- Both app flavors build.
```

---

## Phase 1 — Accounts and authentication

```text
Phase 1: users and auth in backend/.

Models:
- User: id, phone (unique, E.164 +964), name, password_hash (argon2), role, status [active, pending_review, rejected, suspended, deleted], gender, avatar_url, lang, dark_mode, notif_on, created_at.
- Device: user_id, fcm_token, platform, last_seen.
- OTP codes in Redis only: phone, purpose [register, reset], hashed code, attempts, 5-minute expiry.

Endpoints under /api/v1/auth:
- POST /register/start {name, phone, password} → sends OTP. Password rules: ≥6 chars, upper, lower, digit, symbol.
- POST /register/verify {phone, code} → creates the user, returns tokens.
- POST /login {phone, password} → tokens. No OTP. Clear Arabic error on wrong password.
- POST /forgot/start {phone}, POST /forgot/verify {phone, code} → reset token, POST /forgot/reset {reset_token, new_password}.
- POST /refresh (rotating refresh tokens, reuse detection), POST /logout.
- GET/PATCH /me (name, avatar, gender, lang, dark_mode, notif_on).
- DELETE /me {"confirm": "احذف"} → anonymise personal data, cancel and refund future bookings.

SMS: an SmsProvider interface with one real implementation for an Iraqi SMS/WhatsApp OTP gateway.
STOP and ask the owner which provider to use and for its credentials (SMS_PROVIDER, SMS_API_KEY, SMS_SENDER_ID…) before writing that implementation. Tests use a test double inside the test suite only.

Rate limits (Redis):
- 3 OTP sends per phone per 15 min
- 5 attempts per code
- 10 logins per minute per IP
- account lock after 10 failed logins

Role guard decorator require_role(...). Tests for every endpoint and every failure case.

Done when:
- All auth tests pass.
- docs/api.md documents the endpoints with examples.
- The admin from .env can log in.
```

---

## Phase 2 — Core domain: garages, vehicles, trips, seats, bookings

```text
Phase 2: core booking domain in backend/. No seed data except static governorates/cities.

Models:
- Garage: name, city, address, lat, lng, is_24h, opens_at, closes_at, phone, services[], active. Created by the admin only.
- Vehicle: owner_type captain|office, owner_id, kind [باص, كوستر, سيارة, VIP], model, plate, seats, color, year, seat_layout json, locked_at.
- Trip: operator_type captain|office, operator_id, driver_id, vehicle_id, from_city, to_city, garage_id, end_garage_id, depart_at, arrive_at, price, platform, status [scheduled, started, arrived, cancelled], delay_min, started_at, arrived_at, ladies_seats int[].
- Booking: code (6 chars, unique), trip_id, user_id, seats int[], passengers [{seat, name, gender}], is_family, subtotal, discount, total, pay_method [cash, zaincash, card, wallet], pay_status, status [pending_payment, confirmed, cancelled], cancelled_by, boarded_at, created_at.
- Seat holds in Redis: trip_id + seat → user_id, 7-minute TTL.

Rules, in a BookingService with tests:
- Solo = exactly 1 seat; family = 2+ seats. Each seat needs a passenger name.
- Men can't take ladies' seats. Booked or held seats can't be taken. Use DB row locks so two people can't book the same seat.
- A captain can't have two active trips; an office can, with overlap checks per vehicle and per driver.
- Search hides departed trips (now > depart_at − 10 min) and full trips.
- Cancellation:
  - A passenger can cancel until departure; the refund goes back to the same method.
  - A captain or office cancelling a trip cancels and refunds every booking on it, and notifies every passenger.

Endpoints /api/v1:
- GET /cities, GET /garages
- GET /trips/search?from&to&date → bookable trips, sorted by operator overall rating desc, then time
- GET /trips/{id} → includes the seat map
- POST/DELETE /trips/{id}/hold
- POST /bookings
- GET /bookings/mine?tab=upcoming|past|cancelled
- GET /bookings/{code}
- POST /bookings/{code}/cancel
- GET /bookings/{code}/ticket → the QR payload is HMAC-signed (code, trip, seats, exp) so captains can verify offline. Key in TICKET_HMAC_SECRET.

Done when:
- Every rule has a test, including concurrent booking of one seat.
- The database starts empty apart from cities and the admin.
```

---

## Phase 3 — Passenger app (Flutter, passenger flavor)

```text
Phase 3: the passenger app بدربي. Match the prototype's screens and Iraqi-Arabic copy exactly (run the prototype in a browser to compare).

1. Design system (lib/theme):
   - Light and dark colour tokens taken from the prototype (styles.css :root and src/dark-manual.css).
   - Fonts: Alexandria + IBM Plex Sans Arabic.
   - Components: AppButton (primary/light/ghost/soft), Chip, Pill (ok/bad/info/warn), Card, BottomSheet, TopBar, Hero header with the pattern, floating tab bar, Toast (violet with white text), PhoneField (+964 with flag), OtpPad, Switch, plus empty/error/loading widgets.
   - Brand assets (logo, mascot, app icons): STOP and ask the owner for the final files.
2. Screens:
   - Start: splash → onboarding (location, notifications) → login (phone + password, «نسيت كلمة السر؟») → register → OTP.
   - Home: greeting, rewards card, city chips, today's trips, hotels banner, coaster, garages.
   - Pick trip: city chips and day chips in the same style; only available trips, best rated first.
   - Booking: seats (solo/family, legend, ladies' seats) → checkout (name per seat, gender, coupon, payment method) → ticket (QR, save image, share, track).
   - After booking: my trips (upcoming / past / cancelled) → live tracking map → rate trip.
   - Account: profile, personal info, wallet, rewards & coupons, notifications, settings (language, notifications + test, dark mode, delete account), help & support (FAQ, report a problem, round chat button), privacy policy, terms.
3. Error screens:
   - global "no internet" overlay
   - trip cancelled
   - seat just taken (from a 409 response)
4. Data layer:
   - dio with JWT refresh
   - Riverpod repositories
   - cache the last tickets for offline viewing
   - API base URL from --dart-define
5. Maps: STOP and ask the owner for the maps provider choice and key (GOOGLE_MAPS_API_KEY or a tile provider).
6. Tests: widget tests for the booking flow; golden tests of the ticket and seat map in light and dark.

Done when:
- A real user can register, book, see the ticket and cancel against the backend.
- Every list shows a proper empty state when there's no data.
- The APK builds in CI.
```

---

## Phase 4 — Payments, wallet and commission

```text
Phase 4: real payments.

1. PaymentProvider interface with real implementations:
   - Cash: confirms the booking; no commission.
   - ZainCash: merchant API. Create transaction → user pays → signed callback → verify → confirm booking.
   - Card: Qi Card / Mastercard gateway.
   STOP and ask the owner for: ZainCash merchant ID, secret, MSISDN and the sandbox/live URLs; the card gateway choice and its credentials. Put them in .env (ZAINCASH_*, CARD_*).
2. Payment model: booking_id, provider, amount, status [pending, paid, failed, refunded], provider_ref, raw_callback, created_at.
   - Callbacks are idempotent.
   - A pending electronic booking holds its seats 7 minutes, then expires.
3. Refunds go through the same provider; cash refunds are recorded for the garage.
4. Ledger:
   - WalletAccount for each captain, office and the platform.
   - Double-entry LedgerEntry.
   - 5% commission on electronic payments only.
5. Captain/office wallet: a payout card must be added first; a Bdarbi card shows the balance; the withdraw button is fixed at the bottom. Withdraw requests are approved by the admin (Phase 7).
6. Passenger app payment screen: method → confirmation/OTP → processing → success or failure → receipt with transaction number.
7. Tests (with provider test doubles inside the test suite): paid, failed, double callback, refund, commission maths, ledger always balances.

Done when:
- A sandbox ZainCash payment confirms a booking end to end.
- The ledger balances.
- Production refuses to start without live payment keys.
```

---

## Phase 5 — Captain app (Flutter, partner flavor)

```text
Phase 5: captains in كابتن بدربي.

Backend:
- Captain sign-up: phone → OTP → personal info → vehicle (locked after approval) → documents (licence front + back, vehicle annual registration) → status pending_review.
  - Documents go to S3-compatible storage with private buckets and signed URLs.
  - STOP and ask the owner for the storage provider and keys (S3_ENDPOINT, S3_BUCKET, S3_KEY, S3_SECRET).
- Captain trips: create wizard (route, garages, date, time, price, platform); start / delay (minutes) / cancel / arrived. Every change notifies the trip's passengers.
- Manifest: passengers, seats, pay method, boarded state.
- POST /trips/{id}/board {code | qr_payload} → verifies the HMAC. Result: ok / already boarded (with time) / cancelled / wrong trip.
- Live location: POST every 10 s while started; broadcast on SocketIO room trip:{id}; last point kept in Redis.
- Earnings by day / week / month.
- Overall rating.
- Challenges (created by the admin): progress, then claim → credited to the wallet.

App (captain role):
- Login → pending screen until approved.
- Tabs:
  - Home: today's trip card with start / delay / cancel / arrived.
  - Passengers: list, plus new requests from the top button.
  - Scan: camera QR + manual code, then a result screen.
  - Achievements: gold amounts; ready ones turn green.
  - Profile: wallet, earnings, documents, settings, help.
- Background location while a trip is started (Android foreground-service notice and permissions).

Done when:
- A real captain registers, the admin approves them, they run a trip and scan a ticket from the passenger app.
- Passengers see the bus move live.
```

---

## Phase 6 — Travel offices and packages

```text
Phase 6: offices.

Backend:
- Office sign-up: phone → OTP → office info (name, manager, city, address, fleet size, password) → documents → pending_review.
- Fleet: vehicles.
- Office drivers: invited by phone. The driver sets a password, signs in to the partner app, sees only the trips assigned to him, and can scan their tickets.
- Office trips: many at once, each with a vehicle and a driver; overlap checks per vehicle and per driver.
- Packages (سفرات المكاتب):
  - Fields: title, type, up to 5 photos, from/to, meeting garage + note, date, nights, what's included (chips), day-by-day plan (day title + items), adult and child price, single supplement, seats, description.
  - Status: pending → published by the admin.
  - Package bookings: lead traveller, travellers count, payment.
- Office stats: today's sales, bookings per trip, weekly chart.

App:
- Office role tabs: home (sales) / today's trips with passengers / + (create trip or package) / fleet (+ add vehicle) / profile (office info, driver accounts, settings, help).
- Passenger app: «سفرات المكاتب» tab in pick-trip; package detail with what's included and the day-by-day plan; package booking and ticket.

Done when: an office publishes a package → the admin approves it → a passenger books and pays → the office's driver scans that passenger.
```

---

## Phase 7 — Admin (website + admin inside the partner app)

```text
Phase 7: admin. The only admin is the account created from ADMIN_NAME / ADMIN_PHONE / ADMIN_PASSWORD. Admin endpoints require role admin, and every write goes to an audit log (who, what, before, after, when).

Backend /api/v1/admin:
- Overview: today's bookings, active trips, published packages, today's commission, a "needs attention" list, a weekly bookings chart. All computed from real data, zero when empty.
- Join requests (captains, offices) with documents: approve, or reject with a reason. The applicant is notified.
- Offices list and details.
- Bookings: search by booking code. The detail shows:
  - status timeline: booked → boarded → departed → arrived, or cancelled and by whom
  - route and garages
  - driver name, phone, vehicle and plate
  - passenger, seats, payment and rating
- Package review queue: publish or reject.
- Support inbox: threads from passengers, captains and offices; replies appear in the user's in-app chat.
- Finance: withdrawal requests (approve → paid), commission totals, exports to CSV.
- Challenges for captains (title, reward, target) → notification to captains.
- Garages: add/edit with a map pin, hours (24h or open/close), services.
- Hotels: add/edit with photo, city, landmark, address, booking phone + WhatsApp, stars, check-in/out times, amenities, rooms with prices, about, notes for guests.
- Coupons: code (typed or generated), percent or fixed amount, max discount, audience (all / new users / users with N+ trips / specific phones), expiry, active switch. Validated at checkout.
- Admin settings: language, dark mode, which alerts to receive (join requests, support, withdrawals, packages).

admin-web/:
- Website layout with a sidebar; Settings sits just above the account/logout card.
- Every section above, RTL, dark mode.
- Spec: the prototype's Admin screens and the iPad mockups.

Partner app, admin role:
- Phone layout with tabs (home, requests, support, finance, more).
- Sidebar layout on tablets.
- Only the admin part rotates.

Done when:
- The admin (from .env) can run every section from the website and from the phone.
- Every write appears in the audit log.
```

---

## Phase 8 — Notifications, live updates, support chat

```text
Phase 8: messaging.

1. Firebase Cloud Messaging for both flavors.
   STOP and ask the owner to create the Firebase project(s) and send:
   - google-services.json for each flavor
   - GoogleService-Info.plist for each flavor
   - the service-account JSON for the backend (FIREBASE_CREDENTIALS)
2. notify(user_ids, type, title, body, link):
   - Stores an in-app notification and sends a push.
   - Respects notif_on and the admin's alert settings.
   - Iraqi-Arabic templates for: booking confirmed, payment failed, trip delayed / started / arrived / cancelled, boarding confirmed, rate your trip, new challenge, request approved / rejected, withdrawal paid, support reply, package approved / rejected, new join request (admin).
3. Scheduled jobs (RQ scheduler):
   - reminders 2 h and 30 min before departure
   - expire unpaid bookings
   - rating prompt after arrival
   - daily earnings summary for captains
4. SocketIO rooms per trip (status + location) and per support thread; the apps reconnect with backoff.
5. Support chat: text + image messages, read state, the round chat button in Help. «بلّغ عن مشكلة» sends the category + booking code.
6. A notification centre in both apps, and a test-notification button in settings.

Done when: every event above reaches the right phone as a push and appears in the notification centre.
```

---

## Phase 9 — Hotels, coaster requests, rewards and coupons (passenger)

```text
Phase 9: passenger extras. All content comes from the admin; nothing is pre-filled.

1. Hotels:
   - List with city chips; detail page with photo, amenities, about, address, check-in/out, notes, rooms with prices, date range.
   - «أحجز الغرفة» opens WhatsApp to the hotel's number with a prefilled Iraqi-Arabic message, or calls the hotel. No in-app hotel booking.
2. Private coaster request (destination, date, people, round trip) → goes to the admin inbox.
3. Rewards: points per completed trip, progress to a free trip, eligible coupons list, apply at checkout.
4. Garages screen with the map and each garage's info and services.

Done when: hotels, garages and coupons the admin adds appear and work in the passenger app, and each list shows its empty state before the admin adds anything.
```

---

## Phase 10 — Polish

```text
Phase 10: polish across both apps and admin-web.

1. Full translations: ar / en / ckb, with an LTR layout for English. All strings in ARB/i18n files.
2. Dark mode on every screen with the designed palette:
   - Photos, flag, mascot, maps and QR keep their natural colours.
   - The status bar follows the screen and the theme.
3. Empty, loading-skeleton and error states everywhere. Inline form errors. Disabled buttons explain why.
4. Accessibility: semantic labels on icon buttons, 44px touch targets, text scaling up to 130% without breaking layouts.
5. Orientation: passenger / captain / office portrait-only; admin rotates and gets the sidebar on tablets.
6. App icons, splash, and store screenshots (phone, and iPad 12.9" and 11").
   STOP and ask the owner for the final logo, icon and brand files if they're not already in the repo.

Done when: a screenshot pass of every screen — ar/en, light/dark, phone/tablet — shows no layout or contrast problems.
```

---

## Phase 11 — Security, privacy, testing, performance

```text
Phase 11: hardening.

1. Security:
   - Role checks on every endpoint, with tests that a passenger can't reach captain / office / admin endpoints.
   - IDOR tests.
   - Input validation.
   - Uploads: type, size, malware-scan hook.
   - Private documents served via signed URLs.
   - CORS, HTTPS only, secure headers.
   - Refresh-token rotation, OTP and login brute-force limits.
   - Admin audit log.
   - Dependency scanning in CI.
2. Privacy:
   - Data inventory.
   - Retention rules.
   - Account deletion anonymises personal data.
   - Privacy policy and terms pages.
   STOP and ask the owner for the legal text, or approval of a draft you prepare.
3. Tests:
   - Backend service coverage ≥ 80%.
   - Flutter integration tests for passenger (register → book → pay → ticket → board → rate), captain, office and admin flows.
   - admin-web tests for approvals, coupons and hotels.
4. Load test (locust): 500 concurrent searches and 50 concurrent bookings on one trip, with zero double-booked seats.
5. Monitoring: Sentry in the API, both apps and admin-web, request metrics, and alerts on payment-callback failures.
   STOP and ask the owner for the Sentry DSNs (or approval to create the project).

Done when:
- The security tests pass.
- The load test shows zero double bookings.
- Monitoring receives test events.
```

---

## Phase 12 — Deploy and launch

```text
Phase 12: production launch.

STOP and ask the owner for each of these:
- Server/hosting choice and access (VPS or managed Postgres/Redis).
- Domain and DNS access (e.g. bdarbi.iq: api., admin.).
- Google Play developer account and Apple developer account.
- App signing keys: upload keystore and its passwords, or permission to generate them and where to store them safely.
- Live keys for SMS, payments, maps, Firebase and storage.
- Store listing text and the support email/phone.

Then:
1. docker-compose.prod.yml:
   - nginx + Let's Encrypt
   - daily Postgres backups to off-site storage, with one tested restore
   - zero-downtime deploy from GitHub Actions on a version tag
2. Two environments, staging and production, each with its own database, Firebase project and payment keys (sandbox for staging, live for production).
3. Run `flask create-admin` on production with the owner's ADMIN_NAME / ADMIN_PHONE / ADMIN_PASSWORD from the server's .env. No other data is seeded.
4. admin-web at admin.<domain>; admin login only.
5. Mobile releases:
   - Signed release builds of both flavors.
   - Google Play: internal → closed → production.
   - App Store: TestFlight → review.
   - Account deletion, privacy labels and permission explanations completed.
6. docs/RUNBOOK.md: deploy, rollback, restore a backup, rotate keys, handle a payment-provider outage, add a new admin.

Done when:
- Production is live and empty except for the admin.
- Both apps are in the store testing tracks.
- Every runbook step was tried once on staging.
```

---

## Phrases to use with Claude Code

- Start a phase: `Read CLAUDE.md, docs/BUILD_PLAN.md and docs/PROGRESS.md, then start Phase N.`
- Big phase: `Plan Phase N as small steps first, show me the plan, then build step by step.`
- End of a phase: `Run all tests and linters, fix failures, update docs/PROGRESS.md (including "Needed from owner"), then commit.`
- Screen differs from the prototype: `Match the prototype screen <name> in bdarbi-demo exactly.`
- Missing keys: `List everything you still need from me, with where to get each item and the exact env variable.`
