# CaféConnect — MVP Build Plan (Customer + Staff Only)

> Scoped down from the full build plan to ship the **MVP first**: customer ordering app +
> staff operations panel. Rider app, live map tracking, and admin panel are **deferred**
> (see [Deferred Scope](#deferred-scope-not-in-this-file) at the bottom — they slot back in
> later without rework, since the full DB schema is still built up front).

---

## MVP scope decisions

- **No rider app for v1.** Staff transitions orders straight from `READY → DELIVERED`
  themselves (delivery is coordinated manually, outside the app — phone call, walk it over,
  whatever). The `ASSIGNED` / `OUT_FOR_DELIVERY` states and rider-specific fields still exist
  in the schema (so nothing has to be migrated later), they're just **not used** in this MVP's
  status flow.
- **Payments: COD + Razorpay test mode both included.** Not deferred.
- **No live map / GPS tracking.** Customer sees a status stepper only, no rider pin (there's no
  rider to track yet).
- **No admin panel.** Café config (delivery fees, hours, etc.) gets set once via direct DB/seed
  edit or Prisma Studio, not a UI. Staff still gets the operational dashboard (orders, menu).

### Simplified order lifecycle for MVP

```
PLACED → ACCEPTED → PREPARING → READY → DELIVERED
            ↘ CANCELLED (reject, from PLACED)
```

`ALLOWED_TRANSITIONS` in `packages/shared` should still define the full state machine from
`IMPLEMENTATION.md` Appendix A (so future rider-app work doesn't require touching this file again),
but **only this subset of PATCH endpoints gets built now**: `accept`, `reject`, `status`
(PREPARING/READY), and a new `deliver` endpoint that's STAFF-callable and goes `READY → DELIVERED`
directly (skipping `ASSIGNED`/`OUT_FOR_DELIVERY`).

---

## How to use this file

- Work phases **top to bottom**. Each phase assumes all prior phases are complete.
- Each task is written to be pasted directly as a prompt to Qwen Coder.
- Each task lists: **Files touched**, **Depends on**, and **Done when** (a verifiable outcome).
- Reference material (full Prisma schema, API table, fee logic) lives in `IMPLEMENTATION.md` —
  link back to specific sections in each prompt instead of re-pasting them.
- **Every phase ends with two blocks:**
  - **🤖 AI Testing** — instruct Qwen Coder to write/run these checks itself *before* declaring
    the phase complete.
  - **🧪 Manual Test (you)** — a short numbered script for *you* to click through by hand once AI
    testing passes. This is the human sign-off gate before moving to the next phase.

---

## Table of Contents

- [Phase 0 — Repo & Tooling Foundation](#phase-0--repo--tooling-foundation)
- [Phase 1 — Database Layer](#phase-1--database-layer)
- [Phase 2 — API Bootstrap](#phase-2--api-bootstrap)
- [Phase 3 — Auth Module (Email OTP)](#phase-3--auth-module-email-otp)
- [Phase 4 — Menu Module](#phase-4--menu-module)
- [Phase 5 — Staff Web Shell + Auth UI](#phase-5--staff-web-shell--auth-ui)
- [Phase 6 — Staff Web Menu Management UI](#phase-6--staff-web-menu-management-ui)
- [Phase 7 — Cart Module](#phase-7--cart-module)
- [Phase 8 — Address Module + Zone Validation](#phase-8--address-module--zone-validation)
- [Phase 9 — Customer App Foundation](#phase-9--customer-app-foundation)
- [Phase 10 — Customer App: Home, Menu, Cart UI](#phase-10--customer-app-home-menu-cart-ui)
- [Phase 11 — Customer App: Address + Checkout](#phase-11--customer-app-address--checkout)
- [Phase 12 — Orders Module (API, MVP lifecycle)](#phase-12--orders-module-api-mvp-lifecycle)
- [Phase 13 — Realtime Layer (Socket.IO, customer + staff only)](#phase-13--realtime-layer-socketio-customer--staff-only)
- [Phase 14 — Staff Web: Orders Dashboard](#phase-14--staff-web-orders-dashboard)
- [Phase 15 — Customer Order Tracking (stepper, no map)](#phase-15--customer-order-tracking-stepper-no-map)
- [Phase 16 — Payments (Razorpay Test Mode)](#phase-16--payments-razorpay-test-mode)
- [Phase 17 — Deployment](#phase-17--deployment)
- [Phase 18 — End-to-End Verification](#phase-18--end-to-end-verification)
- [Deferred Scope (not in this file)](#deferred-scope-not-in-this-file)

---

## Phase 0 — Repo & Tooling Foundation

**Goal:** Empty monorepo skeleton that installs and runs `turbo` with no errors.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 0.1 | Init pnpm workspace + Turborepo config at repo root | `package.json`, `pnpm-workspace.yaml`, `turbo.json` | — | `pnpm install` succeeds at root |
| 0.2 | Create empty `apps/` and `packages/` directories with placeholder `.gitkeep` (only `api`, `customer-mobile`, `staff-web` planned for now — `rider-mobile` folder not created yet) | `apps/.gitkeep`, `packages/.gitkeep` | 0.1 | Folder structure matches MVP scope |
| 0.3 | Add root `.gitignore`, `.editorconfig`, `tsconfig.base.json` | repo root | 0.1 | Files exist, TS base config has `strict: true` |
| 0.4 | Create `packages/shared` with `enums.ts` (full set, including rider/zone enums — schema stays future-proof even though UI doesn't use all of them yet) | `packages/shared/src/enums.ts`, `package.json` | 0.1 | Package builds standalone with `tsc --noEmit` |
| 0.5 | Add `packages/shared/src/types.ts` with shared interfaces (Order, MenuItem, User, Address, CartItem) | `packages/shared/src/types.ts` | 0.4 | Types compile, exported from `index.ts` |
| 0.6 | Add `packages/shared/src/constants.ts` — full `ALLOWED_TRANSITIONS` map from Appendix A (all 8 states), even though MVP only drives a subset of them | `packages/shared/src/constants.ts` | 0.4 | Exports `ALLOWED_TRANSITIONS` matching Appendix A exactly |

**🤖 AI Testing**
- Run `pnpm install` and `pnpm -r exec tsc --noEmit` at root; both must exit 0.
- Assert `ALLOWED_TRANSITIONS` has exactly 8 keys matching `OrderStatus` enum values (full schema, not just the MVP subset).

**🧪 Manual Test (you)**
1. Clone the repo fresh, run `pnpm install`.
2. Confirm `packages/shared` enums match `IMPLEMENTATION.md` §5 exactly.
3. Confirm only `apps/api`, `apps/customer-mobile`, `apps/staff-web` are scaffolded (no `rider-mobile` yet).

---

## Phase 1 — Database Layer

**Goal:** Prisma schema migrated against Neon, seed script populates demo data. Full schema built now (including rider/payment models) so no migration rework is needed when rider app and admin panel are added later — only the MVP phases below actually *use* the rider fields.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 1.1 | Scaffold `packages/database` with Prisma init | `packages/database/prisma/schema.prisma`, `package.json` | 0.1 | `npx prisma init` output present |
| 1.2 | Add Auth models: `User`, `OtpVerification` | `schema.prisma` | 1.1 | `npx prisma validate` passes |
| 1.3 | Add `CafeConfig` singleton model + `SocietyTower` model | `schema.prisma` | 1.2 | Validates; matches §5 field-for-field |
| 1.4 | Add `Address` model with society + external fields | `schema.prisma` | 1.3 | Validates |
| 1.5 | Add Menu models: `Category`, `MenuItem`, `MenuItemOption`, `DailySpecial`, `Banner` | `schema.prisma` | 1.4 | Validates |
| 1.6 | Add Cart models: `Cart`, `CartItem`, `CartItemOption`, `Coupon` | `schema.prisma` | 1.5 | Validates |
| 1.7 | Add Order models: `Order`, `OrderItem`, `OrderStatusHistory` | `schema.prisma` | 1.6 | Validates, enums match §5 exactly |
| 1.8 | Add `Payment` model (needed for MVP) + `RiderProfile`/`RiderLocation` (schema only, unused by MVP UI) | `schema.prisma` | 1.7 | Validates |
| 1.9 | Add `Notification` model | `schema.prisma` | 1.8 | Validates |
| 1.10 | Run first migration against Neon (`prisma migrate dev --name init`) | `prisma/migrations/` | 1.9 | Migration applies cleanly, tables visible in Neon dashboard |
| 1.11 | Create `packages/database/src/index.ts` exporting a singleton `PrismaClient` | `src/index.ts` | 1.10 | Importable from another package without re-instantiating client |
| 1.12 | Write `seed.ts`: 3 test users — staff, admin (for direct DB config edits only, no admin UI), customer. **Skip seeding a rider user for now.** | `prisma/seed.ts` | 1.11 | `npx ts-node prisma/seed.ts` inserts 3 `User` rows |
| 1.13 | Extend `seed.ts`: `CafeConfig` row (set real café lat/lng, fees, hours here since there's no admin UI yet) + 4 `SocietyTower` rows | `prisma/seed.ts` | 1.12 | Config + towers present in DB |
| 1.14 | Extend `seed.ts`: 7 categories + ~15 menu items with size/add-on options | `prisma/seed.ts` | 1.13 | `MenuItem` count ≥ 15, each linked to a category |
| 1.15 | Extend `seed.ts`: 2 daily specials (today's date) + 3 banners + optional `FLAT20` coupon | `prisma/seed.ts` | 1.14 | Seed script runs idempotently end-to-end with no errors |

**🤖 AI Testing**
- Run `npx prisma validate` and `npx prisma format --check` — both must pass.
- Run `npx ts-node prisma/seed.ts` twice in a row; second run must not error or duplicate rows.
- Assert `MenuItem` count ≥ 15, `User` count == 3, `DailySpecial` count == 2, `SocietyTower` count == 4.

**🧪 Manual Test (you)**
1. Open the Neon dashboard → Tables. Confirm every model exists, including unused-for-now `RiderProfile`/`RiderLocation` (schema future-proofing).
2. Run `npx prisma studio`, confirm `staff@cafe.test`, `admin@cafe.test`, `customer@test.com` exist with correct roles.
3. Open `CafeConfig` — confirm real café coordinates, delivery fees, and hours are set correctly (this is your only way to configure these for MVP).
4. Spot-check `MenuItem` has nested options, `DailySpecial.availableOn` is today.

---

## Phase 2 — API Bootstrap

**Goal:** NestJS app boots, connects to DB, exposes a health check.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 2.1 | Scaffold `apps/api` with NestJS CLI, link `packages/database` and `packages/shared` as workspace deps | `apps/api/**` | 1.11 | `pnpm --filter api start:dev` boots without error |
| 2.2 | Create `PrismaModule` + `PrismaService` wrapping the shared client | `src/common/prisma/prisma.service.ts`, `prisma.module.ts` | 2.1 | Service injectable, `onModuleInit` connects |
| 2.3 | Add `GET /health` controller returning `{ status: 'ok' }` | `src/modules/health/*` | 2.2 | `curl localhost:3001/api/health` returns 200 |
| 2.4 | Configure global `ValidationPipe` (whitelist + transform) in `main.ts` | `src/main.ts` | 2.1 | Invalid DTO payload returns 400 with field errors |
| 2.5 | Configure CORS using `CORS_ORIGINS` env var — only needs to allow staff-web and Expo dev origins for MVP (no rider app origin) | `src/main.ts` | 2.4 | Request from disallowed origin is blocked |
| 2.6 | Add `HttpExceptionFilter` for consistent error JSON shape | `src/common/filters/http-exception.filter.ts` | 2.4 | Thrown `NotFoundException` returns `{ statusCode, message, error }` |
| 2.7 | Add `.env.example` documenting all vars from IMPLEMENTATION.md §12 (still include Razorpay vars; skip nothing payments-related) | `apps/api/.env.example` | 2.1 | File present, no secrets committed |

**🤖 AI Testing**
- Boot the API, `curl -i localhost:3001/api/health`, assert HTTP 200 and `{ "status": "ok" }`.
- Send a malformed POST body to any DTO-validated route, assert 400 with field-level errors.
- `grep` `.env.example` against every `process.env.*` usage — flag any var used but missing from the example file.

**🧪 Manual Test (you)**
1. Run `pnpm --filter api start:dev`, confirm no DB connection errors in console.
2. Hit `http://localhost:3001/api/health` in a browser — confirm `{"status":"ok"}`.
3. Confirm CORS blocks an unrelated localhost origin.

---

## Phase 3 — Auth Module (Email OTP)

**Goal:** Working OTP login issuing JWT access + refresh tokens, role-gated routes. Only `CUSTOMER` and `STAFF` roles are actually exercised in this MVP (RIDER/SUPER_ADMIN role-gating code can stay in for forward-compat, just isn't tested by app UI).

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 3.1 | Create `MailService` with Nodemailer transporter (env-driven host/port/auth) | `src/modules/auth/mail.service.ts` | 2.7 | Unit-testable; sending logs preview URL in dev |
| 3.2 | Add Ethereal fallback path for local dev (auto test account when `SMTP_HOST` unset) | `mail.service.ts` | 3.1 | Running with no SMTP env vars still "sends" mail via Ethereal |
| 3.3 | Build OTP HTML email template (per IMPLEMENTATION.md §7) | `mail.service.ts` | 3.1 | Rendered email contains 6-digit code, "5 minutes" notice |
| 3.4 | Create `AuthService.sendOtp(email)`: generate 6-digit code, invalidate prior codes, persist with 5-min TTL, send mail | `src/modules/auth/auth.service.ts` | 3.3, 1.12 | `OtpVerification` row created; previous rows for that email deleted |
| 3.5 | Create `AuthService.verifyOtp(email, otp, name?, phone?)`: validate code, upsert `User`, issue tokens | `auth.service.ts` | 3.4 | Valid OTP returns `{ accessToken, refreshToken, user }`; invalid returns 401 |
| 3.6 | Add dev bypass: `NODE_ENV=development` + `otp === '123456'` skips DB check | `auth.service.ts` | 3.5 | Bypass works only when `NODE_ENV=development` |
| 3.7 | Create `JwtStrategy` + `JwtAuthGuard` | `src/modules/auth/jwt.strategy.ts`, `src/common/guards/jwt-auth.guard.ts` | 3.5 | Protected route rejects requests with no/invalid token |
| 3.8 | Create `@Roles()` decorator + `RolesGuard` | `src/common/decorators/roles.decorator.ts`, `src/common/guards/roles.guard.ts` | 3.7 | Route with `@Roles('STAFF')` rejects CUSTOMER-role JWT with 403 |
| 3.9 | Create `@CurrentUser()` param decorator | `src/common/decorators/current-user.decorator.ts` | 3.7 | Decorator returns decoded user payload in controller |
| 3.10 | Add `AuthController`: `POST /auth/send-otp`, `POST /auth/verify-otp` | `src/modules/auth/auth.controller.ts` | 3.6, 3.5 | Both endpoints respond per IMPLEMENTATION.md §6 contract |
| 3.11 | Add `POST /auth/refresh` (rotate access token from refresh token) | `auth.controller.ts`, `auth.service.ts` | 3.10 | Valid refresh token returns new access token; expired returns 401 |
| 3.12 | Add `POST /auth/logout` (JWT-protected, client-side token discard or denylist stub) | `auth.controller.ts` | 3.7 | Returns `{ message: 'OK' }` for authenticated request |
| 3.13 | Add `GET /users/me` and `PATCH /users/me` | `src/modules/users/users.controller.ts` | 3.9 | GET returns current user; PATCH updates name/phone only |

**🤖 AI Testing**
- Script: `send-otp` for `customer@test.com` → `verify-otp` with dev bypass `123456` → assert tokens returned → `GET /users/me` returns correct email.
- Assert wrong/expired OTP returns 401.
- Assert no-token request returns 401; CUSTOMER token on a STAFF-only route returns 403.
- Assert `123456` bypass is rejected when `NODE_ENV` is `production`.

**🧪 Manual Test (you)**
1. Call `POST /auth/send-otp` with your own real email — confirm you receive the email (or see the Ethereal preview link).
2. Call `POST /auth/verify-otp` with the real code — confirm tokens return.
3. Repeat using `123456` — confirm dev bypass works too.
4. Call `GET /users/me` with the token — confirm correct user data.
5. Call `GET /users/me` with no header — confirm 401.

---

## Phase 4 — Menu Module

**Goal:** Public read endpoints + staff-only write endpoints for menu data.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 4.1 | `GET /menu/categories` (public, active only) | `src/modules/menu/menu.controller.ts`, `.service.ts` | 2.3, 1.14 | Returns seeded categories sorted by `sortOrder` |
| 4.2 | `GET /menu/items` with optional `?categoryId=` filter (public, available only) | `menu.controller.ts` | 4.1 | Filter narrows results correctly |
| 4.3 | `GET /menu/items/:id` with options included | `menu.controller.ts` | 4.2 | 404 on missing id; includes `MenuItemOption[]` |
| 4.4 | `GET /menu/specials/today` (filters `availableOn = today`) | `menu.controller.ts` | 4.1 | Only returns specials dated today |
| 4.5 | `GET /banners` (public, active only, sorted) | `src/modules/menu/banners.controller.ts` | 4.1 | Returns seeded banners |
| 4.6 | `POST /menu/categories` (STAFF only) | `menu.controller.ts` | 3.8, 4.1 | Non-staff JWT → 403; staff JWT → 201 |
| 4.7 | `PATCH /menu/categories/:id` (STAFF only) | `menu.controller.ts` | 4.6 | Updates name/sortOrder/isActive |
| 4.8 | `POST /menu/items` with nested options array (STAFF only) | `menu.controller.ts` | 4.6 | Creates item + `MenuItemOption[]` in one transaction |
| 4.9 | `PATCH /menu/items/:id` (STAFF only, includes availability toggle) | `menu.controller.ts` | 4.8 | Toggling `isAvailable: false` excludes item from 4.2 |
| 4.10 | `DELETE /menu/items/:id` — soft delete (`isAvailable=false`), not hard delete | `menu.controller.ts` | 4.9 | Row still exists in DB after call |
| 4.11 | `POST /menu/specials` and `PATCH /menu/specials/:id` (STAFF only) | `menu.controller.ts` | 4.6 | Created special appears in 4.4 when dated today |

**🤖 AI Testing**
- Call every `GET /menu/*` route with no auth header — assert 200 (public).
- Call every write route with a CUSTOMER token — assert 403.
- Create an item with 2 options, fetch it, assert both options present.
- Toggle `isAvailable: false`, assert excluded from list; soft-delete, assert row still exists via direct Prisma query.

**🧪 Manual Test (you)**
1. Hit `GET /menu/categories` and `GET /menu/items` with no login — confirm seeded data appears.
2. As staff, create a new item with one size and one add-on option.
3. Confirm options nest correctly on `GET /menu/items/:id`.
4. Toggle availability off, confirm it disappears from the public list.
5. Add a daily special dated today, confirm it shows in `GET /menu/specials/today`.

---

## Phase 5 — Staff Web Shell + Auth UI

**Goal:** Next.js 15 app with working OTP login, JWT stored, protected layout.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 5.1 | Scaffold `apps/staff-web` (Next.js 15, TS, Tailwind, App Router, `src/` dir) | `apps/staff-web/**` | 0.1 | `pnpm --filter staff-web dev` serves blank app |
| 5.2 | Install + init shadcn/ui, set up base theme tokens | `components.json`, `globals.css` | 5.1 | `npx shadcn add button` works |
| 5.3 | Create `lib/api.ts` axios instance with base URL from `NEXT_PUBLIC_API_URL`, auth header interceptor | `src/lib/api.ts` | 5.1 | Interceptor attaches `Authorization: Bearer <token>` from storage |
| 5.4 | Build `(auth)/login/page.tsx`: email input → call `POST /auth/send-otp` | `src/app/(auth)/login/page.tsx` | 5.3, 3.10 | Submitting valid email shows "OTP sent" state |
| 5.5 | Build OTP verification step: 6-digit input → `POST /auth/verify-otp` → store tokens | `login/page.tsx` | 5.4, 3.10 | On success, redirects to `/dashboard` with token persisted |
| 5.6 | Create `(staff)/layout.tsx` with sidebar nav (Dashboard, Menu — no Admin link for MVP) + auth guard | `src/app/(staff)/layout.tsx` | 5.5 | Visiting `/dashboard` while logged out redirects to `/login` |
| 5.7 | Add logout button calling `POST /auth/logout` and clearing stored token | layout/header component | 5.6, 3.12 | Logout clears token and redirects to `/login` |

**🤖 AI Testing**
- Run `pnpm --filter staff-web build` — zero type errors.
- Scripted flow: load `/login`, submit email, submit OTP `123456`, assert redirect to `/dashboard` and token present in storage.
- Assert visiting `/dashboard` with storage cleared redirects to `/login`.

**🧪 Manual Test (you)**
1. Run dev server, open `/login`, log in as `staff@cafe.test` with `123456`.
2. Confirm you land on `/dashboard` and the sidebar only shows Dashboard + Menu (no Admin section).
3. Refresh — confirm still logged in.
4. Clear storage, visit `/dashboard` directly — confirm redirect to `/login`.
5. Log out — confirm redirected and can't navigate back without logging in again.

---

## Phase 6 — Staff Web Menu Management UI

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 6.1 | Build `menu/page.tsx`: table of items (name, category, price, availability toggle) | `src/app/(staff)/menu/page.tsx` | 5.6, 4.2 | Table renders seeded items from API |
| 6.2 | Wire availability toggle to `PATCH /menu/items/:id` | `menu/page.tsx` | 6.1, 4.9 | Toggling updates DB and reflects on reload |
| 6.3 | Build `menu/new/page.tsx`: add-item form (name, price, category select, image URL, description) | `menu/new/page.tsx` | 6.1, 4.8 | Submit creates item, redirects to list |
| 6.4 | Add options builder to the item form (repeatable size/add-on rows) | `menu/new/page.tsx` | 6.3 | Submitted options appear nested under created item |
| 6.5 | Build `menu/[id]/edit/page.tsx` reusing the form from 6.3 in edit mode | `menu/[id]/edit/page.tsx` | 6.4, 4.9 | Editing and saving updates existing item, not a duplicate |
| 6.6 | Build daily specials list + add-special form with date picker | `src/app/(staff)/menu/specials/page.tsx` | 6.1, 4.11 | Created special with today's date appears in customer-facing `GET /menu/specials/today` |

**🤖 AI Testing**
- Build check plus scripted flow: log in as staff, create an item with 2 options, confirm it appears in the table, toggle availability, confirm a re-fetch reflects the change.
- Assert editing an item updates the same `id` (no duplicate row).

**🧪 Manual Test (you)**
1. Log in to staff-web, go to Menu — confirm seeded items render.
2. Toggle availability on one item — confirm it persists after refresh.
3. Add a new item with options via the form — confirm it appears in the table.
4. Edit that item's price — confirm it updates, no duplicate created.
5. Add a daily special dated today — confirm it's reflected via the customer-facing API.

---

## Phase 7 — Cart Module

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 7.1 | `GET /cart` (CUSTOMER, auto-create empty cart if none exists) | `src/modules/cart/cart.controller.ts` | 3.7, 1.15 | First call for a user creates a `Cart` row |
| 7.2 | `POST /cart/items` — add item with options array | `cart.controller.ts` | 7.1, 4.3 | Adding same `menuItemId` twice updates quantity, not duplicate row |
| 7.3 | `PATCH /cart/items/:id` — update quantity | `cart.controller.ts` | 7.2 | Quantity `0` removes the line item |
| 7.4 | `DELETE /cart/items/:id` and `DELETE /cart` (clear all) | `cart.controller.ts` | 7.2 | Cart empty after clear call |
| 7.5 | `POST /cart/apply-coupon` — validate code against `Coupon` table | `cart.controller.ts` | 7.1, 1.15 | Invalid/expired code returns 400 with reason |
| 7.6 | `GET /cart/preview` — implement fee calculation per Appendix B | `cart.service.ts` | 7.5 | Output matches `calculateFees()` formula exactly for a known cart |

**🤖 AI Testing**
- Script: add same item twice, assert quantity is 2 not duplicated; `PATCH` quantity to 0, assert item removed.
- Apply `FLAT20` to qualifying/non-qualifying carts, assert correct accept/reject behavior.
- Manually compute expected fee breakdown for a fixed cart, assert `GET /cart/preview` matches exactly.

**🧪 Manual Test (you)**
1. `GET /cart` as a fresh customer — confirm empty cart auto-creates.
2. Add 2 items, then re-add one — confirm quantity increments, not duplicated.
3. Check `GET /cart/preview` math against Appendix B by hand.
4. Apply `FLAT20` if eligible — confirm discount reflects.
5. Clear cart — confirm empty.

---

## Phase 8 — Address Module + Zone Validation

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 8.1 | Implement `haversineKm()` utility exactly per Appendix/§6 | `src/utils/haversine.ts` | 2.1 | Unit test: known two-point distance matches expected km within 0.01 |
| 8.2 | `GET /addresses/society-options` — towers/wings/floors from `SocietyTower` | `src/modules/addresses/addresses.controller.ts` | 1.13 | Returns seeded tower data |
| 8.3 | `POST /addresses` — create society OR external address (discriminated by `type`) | `addresses.controller.ts` | 3.7, 1.13 | Society address requires tower/wing/floor/flat; external requires line/pincode |
| 8.4 | `GET /addresses` and `DELETE /addresses/:id` (CUSTOMER, own addresses only) | `addresses.controller.ts` | 8.3 | User cannot fetch/delete another user's address (403/404) |
| 8.5 | `PATCH /addresses/:id` | `addresses.controller.ts` | 8.3 | Updates only fields provided |
| 8.6 | `POST /addresses/validate` — society → PRIMARY zone; external → haversine vs `CafeConfig` coords | `addresses.controller.ts` | 8.1, 8.3 | External address >7km returns 400; ≤7km returns `{ zoneType: 'SECONDARY', deliveryFee }` |

**🤖 AI Testing**
- Unit test `haversineKm()` against a known coordinate pair — assert within 0.01km tolerance.
- Cross-user address access attempt — assert 403/404.
- Submit incomplete society address and out-of-range external address — assert both 400.

**🧪 Manual Test (you)**
1. Add a society address — confirm `PRIMARY` zone + correct fee on validate.
2. Add an external address <7km away — confirm `SECONDARY` zone + correct fee.
3. Add an external address >7km away — confirm clear rejection.
4. Confirm one customer can't access another's saved address.

---

## Phase 9 — Customer App Foundation

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 9.1 | Scaffold `apps/customer-mobile` with Expo Router (tabs template) | `apps/customer-mobile/**` | 0.1 | `npx expo start` boots app in Expo Go |
| 9.2 | Create `lib/api.ts` (axios + `expo-secure-store` token injection) | `lib/api.ts` | 9.1 | Stored token attached to outgoing requests |
| 9.3 | Build `(auth)/login.tsx` — email input → `POST /auth/send-otp` | `app/(auth)/login.tsx` | 9.2, 3.10 | Calling API shows success state |
| 9.4 | Build `(auth)/verify-otp.tsx` — code input → `POST /auth/verify-otp` → persist tokens via `expo-secure-store` | `app/(auth)/verify-otp.tsx` | 9.3, 3.10 | On success navigates to `(tabs)/index` |
| 9.5 | Add auth-guard navigation (redirect to login if no stored token on app load) | `app/_layout.tsx` | 9.4 | Cold start with no token lands on login screen |

**🤖 AI Testing**
- Config sanity check (`expo-doctor` equivalent).
- Verify token is read fresh from secure store per request, not cached in a stale variable.

**🧪 Manual Test (you)**
1. Run via Expo Go, log in as `customer@test.com`.
2. Confirm you land on the home tab after OTP verify.
3. Force-close/reopen — confirm still logged in.
4. Clear app data — confirm cold start returns to login.

---

## Phase 10 — Customer App: Home, Menu, Cart UI

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 10.1 | Build `(tabs)/index.tsx` Home: banner carousel + category grid + today's specials | `app/(tabs)/index.tsx` | 9.5, 4.5, 4.4 | Renders live data from API, not mocks |
| 10.2 | Build `(tabs)/menu.tsx`: category filter chips + item card grid | `app/(tabs)/menu.tsx` | 10.1, 4.2 | Filtering by category narrows displayed items |
| 10.3 | Build `product/[id].tsx`: detail screen with size/add-on selectors and quantity stepper | `app/product/[id].tsx` | 10.2, 4.3 | Selecting options updates displayed price live |
| 10.4 | Wire "Add to cart" button to `POST /cart/items` | `product/[id].tsx` | 10.3, 7.2 | Item appears in `GET /cart` after tapping |
| 10.5 | Build `(tabs)/cart.tsx`: item list, qty stepper (PATCH), remove (DELETE), subtotal display | `app/(tabs)/cart.tsx` | 10.4, 7.3, 7.4 | Changing quantity reflects immediately and persists on reload |

**🤖 AI Testing**
- Assert Home screen makes real network calls (no hardcoded placeholder data left in components).
- Script: select a size option on product detail, assert displayed price updates correctly; add to cart, assert `GET /cart` reflects it.

**🧪 Manual Test (you)**
1. Open Home — confirm banners/categories/specials are real seeded data.
2. Filter Menu by category — confirm grid narrows.
3. Open a product, change options — confirm price updates live.
4. Add to cart — confirm it appears correctly in the Cart tab.
5. Change quantity — confirm subtotal updates and persists on reload.

---

## Phase 11 — Customer App: Address + Checkout

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 11.1 | Build `addresses/index.tsx`: list saved addresses, set default | `app/addresses/index.tsx` | 10.5, 8.4 | Lists addresses from API |
| 11.2 | Build `addresses/new.tsx`: society/external toggle with respective form fields | `app/addresses/new.tsx` | 11.1, 8.3 | Submitting society form and external form both succeed |
| 11.3 | Wire new-address form to `POST /addresses/validate` before save, surface 7km rejection clearly | `addresses/new.tsx` | 11.2, 8.6 | Out-of-range external address shows inline error, does not save |
| 11.4 | Build `checkout.tsx`: address selector, payment method selector (COD + Razorpay — see Phase 16 for Razorpay wiring), order summary from `GET /cart/preview` | `app/checkout.tsx` | 11.3, 7.6 | Summary totals match `GET /cart/preview` response exactly |
| 11.5 | Wire "Place order" button to `POST /orders` (COD path first), clear cart on success | `checkout.tsx` | 11.4, 12.1 (see Phase 12) | New `Order` row created with status `PLACED`; cart empties |
| 11.6 | Build `(tabs)/orders.tsx`: list past orders with status badge | `app/(tabs)/orders.tsx` | 11.5, 12.2 | Newly placed order appears in list |

**🤖 AI Testing**
- Script: submit out-of-range external address, assert inline error state reachable.
- Script: full path cart → address → COD checkout → assert cart empties and order appears with status `PLACED`.

**🧪 Manual Test (you)**
1. Add a society address via the app — confirm it saves and can be set default.
2. Try an out-of-range external address — confirm clear in-app error.
3. Go to checkout — confirm summary matches the cart.
4. Place a COD order — confirm success + cart empties.
5. Check Orders tab — confirm new order with "Placed" status.

---

## Phase 12 — Orders Module (API, MVP lifecycle)

**Goal:** Order lifecycle for MVP: `PLACED → ACCEPTED → PREPARING → READY → DELIVERED`,
staff-operated throughout (no rider handoff states used).

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 12.1 | `POST /orders` — snapshot cart into `Order` + `OrderItem[]`, compute fees via Appendix B, generate order number (`CC-YYYYMMDD-NNN`) | `src/modules/orders/orders.controller.ts`, `.service.ts` | 7.6, 8.6 | Created order's totals match cart preview; order number format correct |
| 12.2 | `GET /orders` — role-aware filtering (customer sees own, staff sees all) | `orders.controller.ts` | 12.1, 3.9 | Each role sees correct subset |
| 12.3 | `GET /orders/:id` — full detail with `items`, `statusHistory` | `orders.controller.ts` | 12.2 | 404 for non-existent id; 403 if customer requests another's order |
| 12.4 | Build `OrderStatusService.transition(orderId, newStatus)` enforcing `ALLOWED_TRANSITIONS` from `packages/shared` (full state machine validated, even though MVP only drives a subset) | `src/modules/orders/order-status.service.ts` | 0.6, 12.1 | Illegal transition (e.g. `PLACED → READY`) throws 400 |
| 12.5 | `PATCH /orders/:id/accept` (STAFF, PLACED→ACCEPTED) | `orders.controller.ts` | 12.4 | Status updates, `OrderStatusHistory` row appended |
| 12.6 | `PATCH /orders/:id/reject` (STAFF, PLACED→CANCELLED with `reason`) | `orders.controller.ts` | 12.4 | `rejectReason` field populated |
| 12.7 | `PATCH /orders/:id/status` (STAFF, ACCEPTED→PREPARING→READY) | `orders.controller.ts` | 12.4 | Sequential calls move through both states; skipping a state rejected |
| 12.8 | **MVP-only:** `PATCH /orders/:id/deliver` (STAFF, READY→DELIVERED directly — bypasses ASSIGNED/OUT_FOR_DELIVERY). Add this as an explicit allowed transition for the MVP flow even though Appendix A's full map routes `READY` through rider states. | `orders.controller.ts` | 12.7 | Sets `deliveredAt` timestamp; staff token required |

**🤖 AI Testing**
- Script the full MVP happy path: `PLACED → ACCEPTED → PREPARING → READY → DELIVERED`, asserting `OrderStatusHistory` gains a row each step.
- Attempt illegal transitions (e.g. `PLACED → READY`, `PLACED → DELIVERED`) — assert 400.
- Attempt `deliver` with a CUSTOMER token — assert 403.
- Assert order number format matches `CC-YYYYMMDD-NNN` via regex; two same-day orders get sequential `NNN`.

**🧪 Manual Test (you)**
1. Place a test order as customer, note the order number format.
2. As staff, `accept` it — confirm status flips and history row added.
3. Try jumping `accepted → ready` directly (skip `preparing`) — confirm rejected.
4. Move correctly through `preparing → ready`.
5. As staff, call `deliver` — confirm `deliveredAt` is set and status is `DELIVERED`.
6. Try calling `deliver` as a customer — confirm blocked.

---

## Phase 13 — Realtime Layer (Socket.IO, customer + staff only)

**Goal:** Live order updates between customer and staff. No rider room/events for MVP.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 13.1 | Create `OrdersGateway` with JWT auth on socket handshake | `src/modules/gateway/orders.gateway.ts` | 3.7, 12.1 | Unauthenticated socket connection is rejected |
| 13.2 | Implement room joining: `order:{orderId}` (customer + staff), `staff` (all staff) — **no `rider:{riderId}` room for MVP** | `orders.gateway.ts` | 13.1 | Client joins correct room(s) on connect |
| 13.3 | Emit `order:new` to `staff` room on order creation (hook into 12.1) | `orders.gateway.ts`, `orders.service.ts` | 13.2 | Staff-connected socket receives event immediately after order placed |
| 13.4 | Emit `order:status` to `order:{orderId}` room on every status transition, including the new MVP `deliver` step (hook into 12.4) | `order-status.service.ts` | 13.2 | Status change broadcasts payload `{ orderId, status, updatedAt }` |
| 13.5 | Emit `notification` event for in-app toasts (order accepted, ready, delivered) | `orders.gateway.ts` | 13.4 | Each lifecycle milestone fires exactly one notification event |

**🤖 AI Testing**
- Test script: connect with no token → assert rejected; connect with valid staff token → place order via REST → assert `order:new` arrives on staff socket.
- Place an order, run it through to `delivered`, assert `order:status` fires exactly once per transition (no duplicates, no drops).

**🧪 Manual Test (you)**
1. Open staff-web dashboard in one tab.
2. Place a new order from a separate session.
3. Confirm new-order toast/update appears live, no refresh needed.
4. Accept and move through statuses — confirm a customer tracking screen (if open in parallel) updates live too.

---

## Phase 14 — Staff Web: Orders Dashboard

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 14.1 | Create `useSocket.ts` hook connecting to API with stored JWT | `src/hooks/useSocket.ts` | 5.5, 13.1 | Hook exposes connected socket instance |
| 14.2 | Build `dashboard/page.tsx`: status-tabbed order cards (Placed/Accepted/Preparing/Ready) | `src/app/(staff)/dashboard/page.tsx` | 14.1, 12.2 | Cards populate from `GET /orders` |
| 14.3 | Wire `order:new` socket event to prepend new orders + show toast | `dashboard/page.tsx` | 14.2, 13.3 | New order appears without page refresh |
| 14.4 | Build `orders/[id]/page.tsx` detail view with action buttons matching current status, including the MVP **"Mark Delivered"** button on `READY` orders | `src/app/(staff)/orders/[id]/page.tsx` | 14.2, 12.3 | Buttons shown are exactly the legal next transitions for the MVP flow |
| 14.5 | Wire Accept/Reject/Preparing/Ready/Deliver buttons to respective PATCH endpoints | `orders/[id]/page.tsx` | 14.4, 12.5–12.8 | Clicking updates status and UI reflects new state |
| 14.6 | Add "today's revenue" counter to dashboard header, incrementing on delivered orders | `dashboard/page.tsx` | 14.2, 13.4 | Counter updates live as orders complete |

**🤖 AI Testing**
- Build check plus scripted browser test: load dashboard, place order via REST, assert new card appears live.
- Assert detail page shows "Mark Delivered" only on `READY` orders, not earlier statuses.

**🧪 Manual Test (you)**
1. Open dashboard — confirm orders grouped by status correctly.
2. Place a test order — confirm live toast/card appears.
3. Open order detail — confirm only valid next-step buttons show (e.g. `PLACED` shows Accept/Reject only).
4. Click through Accept → Preparing → Ready → **Mark Delivered** — confirm each step updates correctly.
5. Confirm revenue counter increments after delivery.

---

## Phase 15 — Customer Order Tracking (stepper, no map)

**Goal:** Customer sees live status updates via a stepper. No map/GPS — there's no rider sending location yet.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 15.1 | Build `order/[id].tsx`: status stepper reflecting current `OrderStatus` (Placed → Accepted → Preparing → Ready → Delivered) | `app/order/[id].tsx` | 11.6, 12.3 | Stepper highlights correct stage for each status value |
| 15.2 | Subscribe to `order:status` socket event to update stepper live | `order/[id].tsx` | 15.1, 13.4 | Status changes from staff reflect without refresh |
| 15.3 | Show order items, totals, and address summary on the tracking screen | `order/[id].tsx` | 15.1 | Matches data from `GET /orders/:id` |
| 15.4 | Add a simple "Cancelled" state view if `status === CANCELLED`, showing `rejectReason` if present | `order/[id].tsx` | 15.1 | Rejected orders render a clear cancelled state, not a broken stepper |

**🤖 AI Testing**
- Render the tracking screen for each MVP status value as a fixture (`PLACED`, `ACCEPTED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`), assert correct stepper/state rendering for each.
- Inject a live `order:status` socket event and assert the stepper updates without a manual re-fetch.

**🧪 Manual Test (you)**
1. Place an order, open its tracking screen — confirm "Placed" stage shown.
2. From staff-web, move it through statuses — confirm the stepper updates live on the customer side.
3. Mark it delivered from staff — confirm tracking screen shows "Delivered" state clearly.
4. Place a second order and reject it from staff with a reason — confirm the customer sees a clear cancelled state with the reason shown.

---

## Phase 16 — Payments (Razorpay Test Mode)

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 16.1 | Create Razorpay test account, store `RAZORPAY_KEY_ID`/`SECRET` in API env | `apps/api/.env` | 2.7 | Keys load via `ConfigService` |
| 16.2 | `POST /payments/razorpay/create` — create Razorpay order, persist `Payment` row (PENDING) | `src/modules/payments/payments.controller.ts` | 16.1, 12.1 | Returns Razorpay order id usable by client SDK |
| 16.3 | `POST /payments/razorpay/verify` — validate signature, mark `Payment` COMPLETED | `payments.controller.ts` | 16.2 | Valid signature flips status; invalid returns 400 |
| 16.4 | `POST /payments/webhook` — raw-body handler for Razorpay webhook events | `payments.controller.ts` | 16.3 | Webhook signature verified before processing |
| 16.5 | Wire customer checkout UI to offer Razorpay UPI option (test UPI `success@razorpay`) alongside COD | `customer-mobile/app/checkout.tsx` | 16.3, 11.4 | Selecting Razorpay completes test payment and order shows COMPLETED |
| 16.6 | Ensure COD orders get `Payment.status = COMPLETED` automatically when staff marks `deliver` (12.8 hook) | `orders.service.ts` | 16.2, 12.8 | COD order's payment status flips on delivery, not before |

**🤖 AI Testing**
- Call `POST /payments/razorpay/create`, assert `Payment` row created with `PENDING` status and a Razorpay order id returned.
- Submit an invalid signature to `/payments/razorpay/verify`, assert 400 and status stays `PENDING`.
- Place a COD order, run through to `deliver` (Phase 12.8), assert `Payment.status` flips to `COMPLETED` only at that point.

**🧪 Manual Test (you)**
1. Place an order, choose Razorpay/UPI at checkout, complete with test UPI `success@razorpay`.
2. Confirm payment status shows COMPLETED (check via staff-web order detail).
3. Place a second order with COD — confirm payment status stays PENDING until staff marks it delivered, then flips to COMPLETED.

---

## Phase 17 — Deployment

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 17.1 | Create Neon production project, run `prisma migrate deploy` against it | — | 1.10 | Production schema matches dev schema |
| 17.2 | Deploy `apps/api` to Render (root dir `apps/api`) | Render dashboard config | 2.1–2.7, 17.1 | `GET /health` returns 200 on Render URL |
| 17.3 | Set all production env vars on Render (DB, JWT secrets, SMTP, Razorpay, café coords, CORS — no rider/admin-specific vars needed for MVP) | Render env vars | 17.2 | No missing-env errors in Render logs on boot |
| 17.4 | Deploy `apps/staff-web` to Vercel with `NEXT_PUBLIC_API_URL` pointed at Render | Vercel dashboard config | 17.2 | Staff web loads and OTP login succeeds against prod API |
| 17.5 | Point `customer-mobile` `.env` at production API/socket URLs for Expo Go testing | `apps/customer-mobile/.env` | 17.2 | Expo Go app on a phone connects successfully to prod API |
| 17.6 | Run production seed (staff + customer test accounts + sample menu only) | — | 17.1 | Prod DB has minimal demo-ready data, no junk test rows |
| 17.7 | Set up free cron ping (e.g. cron-job.org) hitting `/health` every 14 min to reduce Render cold starts | external cron config | 17.2 | Cron job configured and firing |

**🤖 AI Testing**
- `curl` the live Render `/health` URL, assert 200.
- Script a full OTP login against production API (real email, not dev bypass), assert tokens return.
- `prisma migrate status` against prod `DATABASE_URL` — assert no pending migrations.

**🧪 Manual Test (you)**
1. Visit live Vercel staff-web URL, log in as staff against production with a real OTP email.
2. Open Render health URL — confirm `{"status":"ok"}`.
3. Open customer app via Expo Go pointed at production — log in, browse menu, place a test order, confirm it appears on the live staff dashboard.
4. Wait ~16 minutes idle, hit the app again — confirm cron kept Render warm (fast response, not 30-60s cold start).

---

## Phase 18 — End-to-End Verification

**Goal:** Full MVP loop verified live: customer orders, staff fulfills, customer sees it through to delivered — no rider, no map, no admin UI involved.

| # | Task | Depends on | Done when |
|---|------|------------|-----------|
| 18.1 | Auth flow verification (send/verify OTP, expiry, role gating) | Phase 3 | OTP login works for both customer and staff roles; role gating enforced |
| 18.2 | Menu flow verification (CRUD, availability, specials) | Phase 4, 6 | Staff can manage menu; customer sees only available items + today's specials |
| 18.3 | Customer ordering verification (cart → address → checkout → COD + Razorpay) | Phase 7, 8, 11, 16 | Both payment paths complete an order successfully |
| 18.4 | Staff operations verification (dashboard, realtime toast, full status flow including Mark Delivered) | Phase 13, 14 | Staff can take an order from Placed to Delivered entirely from the dashboard |
| 18.5 | Customer tracking verification (stepper updates live, cancelled state) | Phase 15 | Tracking screen reflects every status change in real time |
| 18.6 | Deployment verification (health check, prod OTP email, prod seed data) | Phase 17 | Production environment passes the full loop with no dev shortcuts (no `123456` bypass) |

**🤖 AI Testing**
- Run every automated check accumulated from Phases 0–17 as one consolidated suite against the production-pointed environment.

**🧪 Manual Test (you)**
1. On production: log in as a customer with a real email, browse menu, add items, add an address, checkout with Razorpay test UPI.
2. Log in as staff on a separate device/browser, see the order arrive live, accept → prepare → ready → mark delivered.
3. Confirm the customer's tracking screen reflected every step live, ending on "Delivered."
4. If this completes with no developer console open and no manual DB edits mid-flow, the MVP is genuinely demo-ready.

---

## Deferred Scope (not in this file)

These were part of the original full build plan and slot back in later without schema rework,
since Phase 1 already includes their underlying tables:

- **Rider app** (`apps/rider-mobile`) — available orders, accept/pickup/deliver, GPS location streaming, earnings tab.
- **Live map tracking** for customers — rider pin, animated location, ETA calculation. Depends on the rider app existing.
- **Admin panel** (`staff-web` `/admin`) — today's stats dashboard, user management/deactivation, café config UI (location, fees, hours) instead of direct DB edit.
- **Full order lifecycle** — re-introducing `ASSIGNED` → `OUT_FOR_DELIVERY` states once a rider app exists, replacing the MVP's direct `READY → DELIVERED` staff transition.
- **Click-to-call rider** button on customer tracking screen (depends on rider existing).

When you're ready to build these, they follow the same phase + micro-task + AI-testing/manual-testing
pattern as this file — just pick up from `IMPLEMENTATION.md` §§ rider/admin sections.

---

## Notes for prompting Qwen Coder

- Paste **one row at a time** (or a small contiguous group within the same phase) as a task.
- Always include the relevant schema/contract excerpt from `IMPLEMENTATION.md` in the prompt.
- "Depends on" lists are the minimum prerequisite chain — confirm prior tasks exist before assigning the next.
- Each "Done when" is a literal acceptance check you can run before marking the micro-task complete.
- At the end of a phase, explicitly prompt Qwen Coder to **write and run the AI Testing checks** before moving on.
- Only after AI testing passes should you work through the **Manual Test** steps yourself.
