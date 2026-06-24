# CaféConnect — Phased Build Plan (Micro-Tasks for AI Coding Agent)

> Derived from `IMPLEMENTATION.md`. Day-wise scheduling removed — restructured into
> **dependency-ordered phases**, each broken into **micro-tasks** scoped for a single
> AI coding agent (Qwen Coder) turn: one file, one module, or one endpoint at a time.

---

## How to use this file

- Work phases **top to bottom**. Each phase assumes all prior phases are complete.
- Each task is written to be pasted directly as a prompt to Qwen Coder.
- Each task lists: **Files touched**, **Depends on**, and **Done when** (a verifiable outcome).
- Tasks are intentionally small (~1 file or ~1 concern) so the agent has a narrow, checkable scope.
- Reference material (full Prisma schema, API table, Socket.IO events, fee logic) lives in
  `IMPLEMENTATION.md` — link back to specific sections in each prompt instead of re-pasting them.

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
- [Phase 12 — Orders Module (API)](#phase-12--orders-module-api)
- [Phase 13 — Realtime Layer (Socket.IO)](#phase-13--realtime-layer-socketio)
- [Phase 14 — Staff Web: Orders Dashboard](#phase-14--staff-web-orders-dashboard)
- [Phase 15 — Rider App Foundation](#phase-15--rider-app-foundation)
- [Phase 16 — Rider Location + Delivery Flow](#phase-16--rider-location--delivery-flow)
- [Phase 17 — Customer Order Tracking + Map](#phase-17--customer-order-tracking--map)
- [Phase 18 — Payments (Razorpay Test Mode)](#phase-18--payments-razorpay-test-mode)
- [Phase 19 — Admin Panel](#phase-19--admin-panel)
- [Phase 20 — Deployment](#phase-20--deployment)
- [Phase 21 — End-to-End Verification](#phase-21--end-to-end-verification)

---

## Phase 0 — Repo & Tooling Foundation

**Goal:** Empty monorepo skeleton that installs and runs `turbo` with no errors.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 0.1 | Init pnpm workspace + Turborepo config at repo root | `package.json`, `pnpm-workspace.yaml`, `turbo.json` | — | `pnpm install` succeeds at root |
| 0.2 | Create empty `apps/` and `packages/` directories with placeholder `.gitkeep` | `apps/.gitkeep`, `packages/.gitkeep` | 0.1 | Folder structure matches `IMPLEMENTATION.md` §4 |
| 0.3 | Add root `.gitignore`, `.editorconfig`, `tsconfig.base.json` | repo root | 0.1 | Files exist, TS base config has `strict: true` |
| 0.4 | Create `packages/shared` with `enums.ts` (UserRole, OrderStatus, AddressType, PaymentMethod, PaymentStatus, OptionType, DiscountType, ZoneType, RejectReason) | `packages/shared/src/enums.ts`, `packages/shared/package.json` | 0.1 | Package builds standalone with `tsc --noEmit` |
| 0.5 | Add `packages/shared/src/types.ts` with shared interfaces (Order, MenuItem, User, Address, CartItem) | `packages/shared/src/types.ts` | 0.4 | Types compile, exported from `index.ts` |
| 0.6 | Add `packages/shared/src/constants.ts` (ORDER_STATUS_LABELS, status transition map from Appendix A) | `packages/shared/src/constants.ts` | 0.4 | Exports `ALLOWED_TRANSITIONS` matching Appendix A exactly |

---

## Phase 1 — Database Layer

**Goal:** Prisma schema migrated against Neon, seed script populates demo data.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 1.1 | Scaffold `packages/database` with Prisma init | `packages/database/prisma/schema.prisma`, `package.json` | 0.1 | `npx prisma init` output present |
| 1.2 | Add Auth models: `User`, `OtpVerification` (per IMPLEMENTATION.md §5) | `schema.prisma` | 1.1 | `npx prisma validate` passes |
| 1.3 | Add `CafeConfig` singleton model + `SocietyTower` model | `schema.prisma` | 1.2 | Validates; matches §5 field-for-field |
| 1.4 | Add `Address` model with society + external fields | `schema.prisma` | 1.3 | Validates |
| 1.5 | Add Menu models: `Category`, `MenuItem`, `MenuItemOption`, `DailySpecial`, `Banner` | `schema.prisma` | 1.4 | Validates |
| 1.6 | Add Cart models: `Cart`, `CartItem`, `CartItemOption`, `Coupon` | `schema.prisma` | 1.5 | Validates |
| 1.7 | Add Order models: `Order`, `OrderItem`, `OrderStatusHistory` | `schema.prisma` | 1.6 | Validates, enums match §5 exactly |
| 1.8 | Add Payment + Rider models: `Payment`, `RiderProfile`, `RiderLocation` | `schema.prisma` | 1.7 | Validates |
| 1.9 | Add `Notification` model | `schema.prisma` | 1.8 | Validates |
| 1.10 | Run first migration against Neon (`prisma migrate dev --name init`) | `prisma/migrations/` | 1.9 | Migration applies cleanly, tables visible in Neon dashboard |
| 1.11 | Create `packages/database/src/index.ts` exporting a singleton `PrismaClient` | `src/index.ts` | 1.10 | Importable from another package without re-instantiating client |
| 1.12 | Write `seed.ts`: 4 test users (staff/rider/admin/customer) | `prisma/seed.ts` | 1.11 | `npx ts-node prisma/seed.ts` inserts 4 `User` rows |
| 1.13 | Extend `seed.ts`: `CafeConfig` row + 4 `SocietyTower` rows | `prisma/seed.ts` | 1.12 | Config + towers present in DB |
| 1.14 | Extend `seed.ts`: 7 categories + ~15 menu items with size/add-on options | `prisma/seed.ts` | 1.13 | `MenuItem` count ≥ 15, each linked to a category |
| 1.15 | Extend `seed.ts`: 2 daily specials (today's date) + 3 banners + optional `FLAT20` coupon | `prisma/seed.ts` | 1.14 | Seed script runs idempotently end-to-end with no errors |

---

## Phase 2 — API Bootstrap

**Goal:** NestJS app boots, connects to DB, exposes a health check.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 2.1 | Scaffold `apps/api` with NestJS CLI, link `packages/database` and `packages/shared` as workspace deps | `apps/api/**` | 1.11 | `pnpm --filter api start:dev` boots without error |
| 2.2 | Create `PrismaModule` + `PrismaService` wrapping the shared client | `src/common/prisma/prisma.service.ts`, `prisma.module.ts` | 2.1 | Service injectable, `onModuleInit` connects |
| 2.3 | Add `GET /health` controller returning `{ status: 'ok' }` | `src/modules/health/*` | 2.2 | `curl localhost:3001/api/health` returns 200 |
| 2.4 | Configure global `ValidationPipe` (whitelist + transform) in `main.ts` | `src/main.ts` | 2.1 | Invalid DTO payload returns 400 with field errors |
| 2.5 | Configure CORS using `CORS_ORIGINS` env var (comma-separated) | `src/main.ts` | 2.4 | Request from disallowed origin is blocked |
| 2.6 | Add `HttpExceptionFilter` for consistent error JSON shape | `src/common/filters/http-exception.filter.ts` | 2.4 | Thrown `NotFoundException` returns `{ statusCode, message, error }` |
| 2.7 | Add `.env.example` documenting all vars from IMPLEMENTATION.md §12 | `apps/api/.env.example` | 2.1 | File present, no secrets committed |

---

## Phase 3 — Auth Module (Email OTP)

**Goal:** Working OTP login issuing JWT access + refresh tokens, role-gated routes.

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

---

## Phase 5 — Staff Web Shell + Auth UI

**Goal:** Next.js 15 app with working OTP login, JWT stored, protected layout.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 5.1 | Scaffold `apps/staff-web` (Next.js 15, TS, Tailwind, App Router, `src/` dir) | `apps/staff-web/**` | 0.1 | `pnpm --filter staff-web dev` serves blank app |
| 5.2 | Install + init shadcn/ui, set up base theme tokens | `components.json`, `globals.css` | 5.1 | `npx shadcn add button` works |
| 5.3 | Create `lib/api.ts` axios instance with base URL from `NEXT_PUBLIC_API_URL`, auth header interceptor | `src/lib/api.ts` | 5.1 | Interceptor attaches `Authorization: Bearer <token>` from storage |
| 5.4 | Build `(auth)/login/page.tsx`: email input → call `POST /auth/send-otp` | `src/app/(auth)/login/page.tsx` | 5.3, 3.10 | Submitting valid email shows "OTP sent" state |
| 5.5 | Build OTP verification step (same page or sub-route): 6-digit input → `POST /auth/verify-otp` → store tokens | `login/page.tsx` | 5.4, 3.10 | On success, redirects to `/dashboard` with token persisted |
| 5.6 | Create `(staff)/layout.tsx` with sidebar nav + auth guard (redirect to login if no token) | `src/app/(staff)/layout.tsx` | 5.5 | Visiting `/dashboard` while logged out redirects to `/login` |
| 5.7 | Add logout button calling `POST /auth/logout` and clearing stored token | layout/header component | 5.6, 3.12 | Logout clears token and redirects to `/login` |

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

---

## Phase 9 — Customer App Foundation

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 9.1 | Scaffold `apps/customer-mobile` with Expo Router (tabs template) | `apps/customer-mobile/**` | 0.1 | `npx expo start` boots app in Expo Go |
| 9.2 | Create `lib/api.ts` (axios + `expo-secure-store` token injection) | `lib/api.ts` | 9.1 | Stored token attached to outgoing requests |
| 9.3 | Build `(auth)/login.tsx` — email input → `POST /auth/send-otp` | `app/(auth)/login.tsx` | 9.2, 3.10 | Calling API shows success state |
| 9.4 | Build `(auth)/verify-otp.tsx` — code input → `POST /auth/verify-otp` → persist tokens via `expo-secure-store` | `app/(auth)/verify-otp.tsx` | 9.3, 3.10 | On success navigates to `(tabs)/index` |
| 9.5 | Add auth-guard navigation (redirect to login if no stored token on app load) | `app/_layout.tsx` | 9.4 | Cold start with no token lands on login screen |

---

## Phase 10 — Customer App: Home, Menu, Cart UI

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 10.1 | Build `(tabs)/index.tsx` Home: banner carousel + category grid + today's specials | `app/(tabs)/index.tsx` | 9.5, 4.5, 4.4 | Renders live data from API, not mocks |
| 10.2 | Build `(tabs)/menu.tsx`: category filter chips + item card grid | `app/(tabs)/menu.tsx` | 10.1, 4.2 | Filtering by category narrows displayed items |
| 10.3 | Build `product/[id].tsx`: detail screen with size/add-on selectors and quantity stepper | `app/product/[id].tsx` | 10.2, 4.3 | Selecting options updates displayed price live |
| 10.4 | Wire "Add to cart" button to `POST /cart/items` | `product/[id].tsx` | 10.3, 7.2 | Item appears in `GET /cart` after tapping |
| 10.5 | Build `(tabs)/cart.tsx`: item list, qty stepper (PATCH), remove (DELETE), subtotal display | `app/(tabs)/cart.tsx` | 10.4, 7.3, 7.4 | Changing quantity reflects immediately and persists on reload |

---

## Phase 11 — Customer App: Address + Checkout

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 11.1 | Build `addresses/index.tsx`: list saved addresses, set default | `app/addresses/index.tsx` | 10.5, 8.4 | Lists addresses from API |
| 11.2 | Build `addresses/new.tsx`: society/external toggle with respective form fields | `app/addresses/new.tsx` | 11.1, 8.3 | Submitting society form and external form both succeed |
| 11.3 | Wire new-address form to `POST /addresses/validate` before save, surface 7km rejection clearly | `addresses/new.tsx` | 11.2, 8.6 | Out-of-range external address shows inline error, does not save |
| 11.4 | Build `checkout.tsx`: address selector, payment method (COD default), order summary from `GET /cart/preview` | `app/checkout.tsx` | 11.3, 7.6 | Summary totals match `GET /cart/preview` response exactly |
| 11.5 | Wire "Place order" button to `POST /orders` (COD path), clear cart on success | `checkout.tsx` | 11.4, 12.1 (see Phase 12) | New `Order` row created with status `PLACED`; cart empties |
| 11.6 | Build `(tabs)/orders.tsx`: list past orders with status badge | `app/(tabs)/orders.tsx` | 11.5, 12.2 | Newly placed order appears in list |

---

## Phase 12 — Orders Module (API)

**Goal:** Full order lifecycle enforcing the state machine from Appendix A.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 12.1 | `POST /orders` — snapshot cart into `Order` + `OrderItem[]`, compute fees via Appendix B, generate order number (`CC-YYYYMMDD-NNN`) | `src/modules/orders/orders.controller.ts`, `.service.ts` | 7.6, 8.6 | Created order's totals match cart preview; order number format correct |
| 12.2 | `GET /orders` — role-aware filtering (customer sees own, staff sees all, rider sees assigned) | `orders.controller.ts` | 12.1, 3.9 | Each role sees correct subset |
| 12.3 | `GET /orders/:id` — full detail with `items`, `statusHistory` | `orders.controller.ts` | 12.2 | 404 for non-existent id; 403 if customer requests another's order |
| 12.4 | Build a shared `OrderStatusService.transition(orderId, newStatus)` enforcing `ALLOWED_TRANSITIONS` from `packages/shared` | `src/modules/orders/order-status.service.ts` | 0.6, 12.1 | Illegal transition (e.g. `PLACED → READY`) throws 400 |
| 12.5 | `PATCH /orders/:id/accept` (STAFF, PLACED→ACCEPTED) | `orders.controller.ts` | 12.4 | Status updates, `OrderStatusHistory` row appended |
| 12.6 | `PATCH /orders/:id/reject` (STAFF, PLACED→CANCELLED with `reason`) | `orders.controller.ts` | 12.4 | `rejectReason` field populated |
| 12.7 | `PATCH /orders/:id/status` (STAFF, ACCEPTED→PREPARING→READY) | `orders.controller.ts` | 12.4 | Sequential calls move through both states; skipping a state rejected |
| 12.8 | `PATCH /orders/:id/assign` (RIDER, READY→ASSIGNED) | `orders.controller.ts` | 12.4, 3.8 | `riderId` set to current user |
| 12.9 | `PATCH /orders/:id/pickup` (RIDER, ASSIGNED→OUT_FOR_DELIVERY) | `orders.controller.ts` | 12.8 | Only assigned rider can call this (403 otherwise) |
| 12.10 | `PATCH /orders/:id/deliver` (RIDER, OUT_FOR_DELIVERY→DELIVERED) | `orders.controller.ts` | 12.9 | Sets `deliveredAt` timestamp |

---

## Phase 13 — Realtime Layer (Socket.IO)

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 13.1 | Create `OrdersGateway` with JWT auth on socket handshake | `src/modules/gateway/orders.gateway.ts` | 3.7, 12.1 | Unauthenticated socket connection is rejected |
| 13.2 | Implement room joining: `order:{orderId}`, `staff`, `rider:{riderId}` based on user role/order | `orders.gateway.ts` | 13.1 | Client joins correct room(s) on connect |
| 13.3 | Emit `order:new` to `staff` room on order creation (hook into 12.1) | `orders.gateway.ts`, `orders.service.ts` | 13.2 | Staff-connected socket receives event immediately after order placed |
| 13.4 | Emit `order:status` to `order:{orderId}` room on every status transition (hook into 12.4) | `order-status.service.ts` | 13.2 | Status change broadcasts payload `{ orderId, status, updatedAt }` |
| 13.5 | Emit `rider:assigned` to customer + rider on `assign` (12.8) | `orders.gateway.ts` | 13.4, 12.8 | Both parties receive rider info |
| 13.6 | Handle inbound `rider:location` from rider client → persist `RiderLocation` → broadcast to `order:{orderId}` | `orders.gateway.ts` | 13.2, 1.8 | Customer-side listener receives forwarded coordinates |
| 13.7 | Emit `notification` event for in-app toasts (order accepted, rider assigned, delivered) | `orders.gateway.ts` | 13.4 | Each lifecycle milestone fires exactly one notification event |

---

## Phase 14 — Staff Web: Orders Dashboard

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 14.1 | Create `useSocket.ts` hook connecting to API with stored JWT | `src/hooks/useSocket.ts` | 5.5, 13.1 | Hook exposes connected socket instance |
| 14.2 | Build `dashboard/page.tsx`: status-tabbed order cards (Placed/Accepted/Preparing/Ready) | `src/app/(staff)/dashboard/page.tsx` | 14.1, 12.2 | Cards populate from `GET /orders` |
| 14.3 | Wire `order:new` socket event to prepend new orders + show toast | `dashboard/page.tsx` | 14.2, 13.3 | New order appears without page refresh |
| 14.4 | Build `orders/[id]/page.tsx` detail view with action buttons matching current status | `src/app/(staff)/orders/[id]/page.tsx` | 14.2, 12.3 | Buttons shown are exactly the legal next transitions |
| 14.5 | Wire Accept/Reject/Preparing/Ready buttons to respective PATCH endpoints | `orders/[id]/page.tsx` | 14.4, 12.5–12.7 | Clicking updates status and UI reflects new state |
| 14.6 | Add "today's revenue" counter to dashboard header, incrementing on delivered orders | `dashboard/page.tsx` | 14.2, 13.4 | Counter updates live as orders complete |

---

## Phase 15 — Rider App Foundation

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 15.1 | Scaffold `apps/rider-mobile` with Expo Router (tabs template) | `apps/rider-mobile/**` | 0.1 | App boots in Expo Go |
| 15.2 | Reuse/adapt `lib/api.ts` + OTP login/verify screens (mirror Phase 9 pattern) | `app/(auth)/login.tsx`, `verify-otp.tsx` | 15.1, 3.10 | Rider can log in with seeded `rider@cafe.test` |
| 15.3 | Build `(tabs)/index.tsx`: available orders list (`GET /riders/available-orders`) | `app/(tabs)/index.tsx` | 15.2, 12.2 | Lists orders in `READY` status |
| 15.4 | Build order card: pickup address (café), drop address, distance, payment type | `(tabs)/index.tsx` | 15.3, 8.1 | Distance computed via haversine from café to drop address |
| 15.5 | Wire "Accept" button to `PATCH /orders/:id/assign` | `(tabs)/index.tsx` | 15.4, 12.8 | Accepted order disappears from available list |

---

## Phase 16 — Rider Location + Delivery Flow

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 16.1 | `POST /riders/location` endpoint — persist `RiderLocation`, throttle 1 req/3s server-side | `src/modules/riders/riders.controller.ts` | 1.8, 3.7 | Rapid repeat calls beyond throttle are rejected/ignored |
| 16.2 | Update `RiderProfile.isOnline` on connect/disconnect | `riders.service.ts` | 16.1 | Flag flips correctly across socket lifecycle |
| 16.3 | Build `useLocation.ts` hook (`expo-location` foreground GPS, emits every 5s) | `app/hooks/useLocation.ts` | 15.1 | Hook emits `{ latitude, longitude, speed }` on interval |
| 16.4 | Build `(tabs)/active.tsx`: current order details + Pick Up / Complete buttons | `app/(tabs)/active.tsx` | 15.5, 12.9, 12.10 | Buttons call respective PATCH endpoints and advance status |
| 16.5 | Wire `useLocation` to emit `rider:location` socket event while in `OUT_FOR_DELIVERY` | `active.tsx` | 16.3, 13.6 | Location only streams during active delivery, not idle |
| 16.6 | `GET /riders/earnings` — SQL aggregate (today/week/month from delivered orders) | `riders.controller.ts` | 12.10 | Returns correct sums for known seeded/test orders |
| 16.7 | Build `(tabs)/earnings.tsx` displaying the three totals | `app/(tabs)/earnings.tsx` | 16.6 | Matches API response |
| 16.8 | Add click-to-call rider button (`Linking.openURL('tel:...')`) — applies to customer app, not rider app | `customer-mobile` order tracking screen | 17.x (Phase 17) | Tapping opens native phone dialer with rider's number |

---

## Phase 17 — Customer Order Tracking + Map

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 17.1 | Build `order/[id].tsx`: status stepper reflecting current `OrderStatus` | `app/order/[id].tsx` | 11.6, 12.3 | Stepper highlights correct stage for each status value |
| 17.2 | Subscribe to `order:status` socket event to update stepper live | `order/[id].tsx` | 17.1, 13.4 | Status changes from staff/rider reflect without refresh |
| 17.3 | Install and configure `react-native-maps` with OSM tiles (no API key) | `app/order/[id].tsx` | 17.1 | Map renders with café + delivery address pins |
| 17.4 | Subscribe to `rider:location` and animate rider marker | `order/[id].tsx` | 17.3, 13.6 | Marker moves when rider's coordinates update |
| 17.5 | Compute and display static ETA (`distanceKm / 20 * 60` minutes) | `order/[id].tsx` | 17.4, 8.1 | ETA recalculates as rider distance changes |
| 17.6 | Add call-rider button once `rider:assigned` event received | `order/[id].tsx` | 17.2, 13.5, 16.8 | Button only appears after a rider is assigned |

---

## Phase 18 — Payments (Razorpay Test Mode)

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 18.1 | Create Razorpay test account, store `RAZORPAY_KEY_ID`/`SECRET` in API env | `apps/api/.env` | 2.7 | Keys load via `ConfigService` |
| 18.2 | `POST /payments/razorpay/create` — create Razorpay order, persist `Payment` row (PENDING) | `src/modules/payments/payments.controller.ts` | 18.1, 12.1 | Returns Razorpay order id usable by client SDK |
| 18.3 | `POST /payments/razorpay/verify` — validate signature, mark `Payment` COMPLETED | `payments.controller.ts` | 18.2 | Valid signature flips status; invalid returns 400 |
| 18.4 | `POST /payments/webhook` — raw-body handler for Razorpay webhook events | `payments.controller.ts` | 18.3 | Webhook signature verified before processing |
| 18.5 | Wire customer checkout UI to offer Razorpay UPI option (test UPI `success@razorpay`) alongside COD | `customer-mobile/app/checkout.tsx` | 18.3, 11.4 | Selecting Razorpay completes test payment and order shows COMPLETED |
| 18.6 | Ensure COD orders get `Payment.status = COMPLETED` automatically on delivery (12.10 hook) | `orders.service.ts` | 18.2, 12.10 | COD order's payment status flips on delivery, not before |

---

## Phase 19 — Admin Panel

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 19.1 | `GET /admin/stats/today` (SUPER_ADMIN): order count, revenue, top 5 items | `src/modules/admin/admin.controller.ts` | 12.2, 3.8 | Aggregates match manual DB query for known test data |
| 19.2 | `GET /admin/users` + `PATCH /admin/users/:id` (activate/deactivate) | `admin.controller.ts` | 3.13 | Deactivated user fails subsequent OTP verify/login |
| 19.3 | `GET /admin/config` + `PATCH /admin/config` (zone, fees, hours) | `admin.controller.ts` | 1.3 | Updated `primaryDeliveryFee` reflected in next `cart/preview` call |
| 19.4 | Build `(admin)/overview/page.tsx`: stats cards + top-5 bar chart (recharts) | `src/app/(admin)/overview/page.tsx` | 19.1 | Chart renders live data |
| 19.5 | Build `(admin)/users/page.tsx`: table with role filter + active toggle | `src/app/(admin)/users/page.tsx` | 19.2 | Toggle calls PATCH and updates row state |
| 19.6 | Build `(admin)/settings/page.tsx`: café config form (location, fees, radius, hours) | `src/app/(admin)/settings/page.tsx` | 19.3 | Saved changes persist and reload correctly |

---

## Phase 20 — Deployment

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 20.1 | Create Neon production project, run `prisma migrate deploy` against it | — | 1.10 | Production schema matches dev schema |
| 20.2 | Deploy `apps/api` to Render (root dir `apps/api`, build/start commands per §12) | Render dashboard config | 2.1–2.7, 20.1 | `GET /health` returns 200 on Render URL |
| 20.3 | Set all production env vars on Render (DB, JWT secrets, SMTP, Razorpay, Cloudinary, café coords, CORS) | Render env vars | 20.2 | No missing-env errors in Render logs on boot |
| 20.4 | Deploy `apps/staff-web` to Vercel with `NEXT_PUBLIC_API_URL` pointed at Render | Vercel dashboard config | 20.2 | Staff web loads and OTP login succeeds against prod API |
| 20.5 | Point `customer-mobile` and `rider-mobile` `.env` at production API/socket URLs for Expo Go testing | `apps/customer-mobile/.env`, `apps/rider-mobile/.env` | 20.2 | Expo Go app on a phone connects successfully to prod API |
| 20.6 | Run production seed (test accounts + sample menu only, not full dev seed) | — | 20.1 | Prod DB has minimal demo-ready data, no junk test rows |
| 20.7 | Set up free cron ping (e.g. cron-job.org) hitting `/health` every 14 min to reduce Render cold starts | external cron config | 20.2 | Cron job configured and firing (check Render logs) |

---

## Phase 21 — End-to-End Verification

> Functional checklist only — re-run after any change touching auth, orders, or realtime.
> (Full checklist detail lives in `IMPLEMENTATION.md` §13; this phase just enumerates the
> task buckets so each can be assigned/verified independently.)

| # | Task | Depends on | Done when |
|---|------|------------|-----------|
| 21.1 | Auth flow verification (send/verify OTP, expiry, role gating) | Phase 3 | All sub-checks in §13 "Auth" pass |
| 21.2 | Menu flow verification (CRUD, availability, specials) | Phase 4, 6 | All sub-checks in §13 "Menu" pass |
| 21.3 | Customer ordering verification (cart → address → checkout → COD order) | Phase 7, 8, 11, 12 | All sub-checks in §13 "Customer ordering" pass |
| 21.4 | Staff operations verification (dashboard, realtime toast, status transitions) | Phase 13, 14 | All sub-checks in §13 "Staff operations" pass |
| 21.5 | Rider delivery verification (accept → pickup → GPS → complete) | Phase 15, 16 | All sub-checks in §13 "Rider delivery" pass |
| 21.6 | Customer tracking verification (stepper, live map, call button) | Phase 17 | All sub-checks in §13 "Customer tracking" pass |
| 21.7 | Admin verification (stats, deactivate user, fee update propagation) | Phase 19 | All sub-checks in §13 "Admin" pass |
| 21.8 | Payments verification (Razorpay test UPI, COD-on-delivery) | Phase 18 | All sub-checks in §13 "Payments" pass |
| 21.9 | Deployment verification (health check, prod OTP email, prod seed data) | Phase 20 | All sub-checks in §13 "Deployment" pass |

---

## Notes for prompting Qwen Coder

- Paste **one row at a time** (or a small contiguous group within the same phase) as a task — don't paste a whole phase at once.
- Always include the relevant schema/contract excerpt from `IMPLEMENTATION.md` (§5 for models, §6 for endpoint contracts, §7 for mail, Appendix A/B for business logic) in the prompt — this file intentionally doesn't repeat that detail per row.
- "Depends on" lists are the minimum prerequisite chain — if a task references a model or endpoint from an earlier phase, confirm it exists before assigning the next task.
- Each "Done when" is meant to be a literal acceptance check you can run (curl call, UI click, DB query) before marking the micro-task complete.
