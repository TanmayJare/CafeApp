# CaféConnect — Mobile App Implementation Phases

> Agent guide for `apps/rider-mobile` and `apps/customer-mobile`.
> All API contracts, DB schema, status transitions, fee logic, and env vars
> are defined in `IMPLEMENTATION.md` — this document references it throughout.
> Work phases top-to-bottom. Do not advance past a phase until its gate passes.

---

## Cross-cutting rules (apply to every phase)

- **API base URL:** `EXPO_PUBLIC_API_URL` from `.env` — never hardcode.
- **Auth storage:** `expo-secure-store` only. Never `AsyncStorage`.
- **HTTP client:** `lib/api.ts` Axios instance with Bearer interceptor + 401 auto-refresh (see IMPLEMENTATION.md §6).
- **Types/enums:** import from `packages/shared` — `OrderStatus`, `UserRole`, `PaymentMethod`, `ZoneType`, etc.
- **Status transitions:** enforced server-side via `ALLOWED_TRANSITIONS` (IMPLEMENTATION.md Appendix A). Client only calls the right endpoint; never manually patch status.
- **Design tokens:** all colours, radii, fonts, and spacing from `lib/tokens.ts` — no hardcoded hex values anywhere.
- **Haversine:** `haversineKm()` from `packages/shared/src/utils/haversine.ts` — same function as the API uses.
- **Dev OTP bypass:** `123456` works when `NODE_ENV=development`.
- **Socket.IO:** connect with `io(EXPO_PUBLIC_SOCKET_URL, { auth: { token }, transports: ['websocket'] })`. Room naming: `order:{orderId}`, `rider:{riderId}`, `staff`.

---

## PART 1 — RIDER APP (`apps/rider-mobile`)

---

### Phase R1 — Scaffold + Auth

**What to build:** Project skeleton, font loading, navigation shell, login → OTP screens, auth store, role gate.

**Files:**
- `lib/tokens.ts` — copy `C`, `R`, `F`, `S` token constants from customer app (or from `packages/shared` if extracted). Rider accent: lean on matcha `#3D6B4A` as primary action colour; espresso `#1C0F08` for structural elements.
- `lib/api.ts` — Axios instance. `baseURL = process.env.EXPO_PUBLIC_API_URL`. Request interceptor: attach `Authorization: Bearer <accessToken>` from SecureStore. Response interceptor: on 401 → `POST /auth/refresh` with refreshToken → retry; on refresh fail → clear tokens + redirect to login.
- `stores/auth.store.ts` — Zustand. Fields: `user`, `isLoading`. Actions: `login(accessToken, refreshToken, user)` (persists to SecureStore), `logout()` (clears SecureStore, nulls user), `hydrate()` (reads token from SecureStore → `GET /users/me` → sets user; sets `isLoading: false` when done).
- `app/_layout.tsx` — Load fonts (DM Serif Display, Inter, DM Mono via `@expo-google-fonts/*`). Call `hydrate()` on mount. Block render with `<SplashScreen>` until fonts loaded AND `isLoading === false`. Route: if `user` → `(tabs)`, else → `(auth)`.
- `app/(auth)/login.tsx` — Top espresso hero: "Rider Portal" badge, "Deliver smarter with CaféConnect" subtitle. Bottom white card: email input (regex validated client-side before API call), "Send OTP" CTA with loading spinner → `POST /auth/send-otp` → navigate to verify-otp passing email as param.
- `app/(auth)/verify-otp.tsx` — 6 individual `TextInput` boxes (44×52px, espresso border on focus). Auto-advance on digit; backspace retreats. 5-min resend countdown. "Verify code" disabled until 6 digits. On submit: `POST /auth/verify-otp` → `auth.store.login()` → **assert `user.role === 'RIDER'`**; if not RIDER → show error "This account is not registered as a rider." → call `auth.store.logout()`.
- `components/ui/Button.tsx`, `Pill.tsx`, `Toast.tsx`, `SkeletonLoader.tsx`

**API used:** `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `GET /users/me`

**Env vars needed:**
```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=http://localhost:3001
EXPO_PUBLIC_CAFE_LAT=<from CafeConfig seed>
EXPO_PUBLIC_CAFE_LNG=<from CafeConfig seed>
```

**Gate:**
- `npx expo-doctor` passes, `tsc --noEmit` zero errors
- Login with `rider@cafe.test` + bypass `123456` → tab shell renders
- Login with `customer@test.com` → error shown, redirected back to login

---

### Phase R2 — Tab Shell + Online Toggle + Available Orders

**What to build:** Bottom tab bar, online/offline state, available orders list with polling, order card UI.

**Files:**
- `stores/delivery.store.ts` — Zustand. Fields: `activeOrder: Order | null`, `isOnline: boolean`, `lastLocation: { latitude, longitude } | null`. Actions: `setActiveOrder`, `setOnline`, `setLocation`.
- `lib/haversine.ts` — re-export `haversineKm(a, b)` from `packages/shared`. Used for client-side distance on order cards.
- `hooks/useAvailableOrders.ts` — TanStack Query: `GET /riders/available-orders` (returns READY orders, rider-scoped). `refetchInterval: 15_000`. Only active when `isOnline === true`.
- `app/(tabs)/_layout.tsx` — 4 tabs: Available (`map-pin`), Active (`truck`), Earnings (`dollar-sign`), Profile (`user`). Active tab colour matcha. Badge on Available = count of READY orders. Dot badge on Active when `activeOrder !== null`.
- `app/(tabs)/index.tsx` (Available orders):
  - `isOnline === false` → full-screen offline state: grey illustration, "You're offline", "Go online to see orders" subtext, green "Go online" CTA (calls `PATCH /riders/online` + `delivery.store.setOnline(true)`).
  - Online + no orders → "No orders yet" empty state + spinner.
  - Online + orders → list of `<AvailableOrderCard>`, newest first.
  - If `activeOrder` in store → hide list, show "You have an active delivery" banner linking to Active tab.
- `components/orders/AvailableOrderCard.tsx` — order number (DM Mono 11px), time ago, `[READY]` pill, pickup address (always "CaféConnect, Sunshine Society"), drop address + distance (computed via `haversineKm(cafeCoords, dropAddress.coords)` using `EXPO_PUBLIC_CAFE_LAT/LNG`), item summary line (e.g. "2× Hazelnut Latte · 1× Grilled Veg Melt"), total + payment badge (COD = amber pill, UPI = blue pill), "View details" + "Accept delivery" buttons.

**API used:** `GET /riders/available-orders`, `PATCH /riders/online`

**Gate:**
- Go online → READY orders appear within 15 s
- Go offline → list clears and offline state renders
- Distance on each card is computed correctly client-side from café env coords + order drop coords

---

### Phase R3 — Accept Order + Order Detail

**What to build:** Accept action, order detail read-only screen, transition to active tab.

**Files:**
- Accept action wired in `AvailableOrderCard.tsx`: tap "Accept delivery" → `PATCH /orders/:id/assign` (READY → ASSIGNED per IMPLEMENTATION.md Appendix A) → on success: `delivery.store.setActiveOrder(order)` → navigate to `(tabs)/active`.
- `app/order/[id].tsx` — read-only detail (full-screen or bottom sheet). Shows: order number, status pill, items list (qty + name + selected options), pickup address (always café), drop address, distance + ETA estimate (`Math.ceil((distKm / 20) * 60)` min), payment type + total. "Close" button only — no action CTAs here. Reached via "View details" on the card.

**API used:** `PATCH /orders/:id/assign`, `GET /orders/:id`

**Gate:**
- Accept → `GET /orders/:id` returns `status === 'ASSIGNED'` and `riderId === currentRider.id`
- Order disappears from available list within next poll cycle
- Order detail screen shows correct items, addresses, and total

---

### Phase R4 — Active Screen State A (ASSIGNED)

**What to build:** Active delivery tab showing the rider-heading-to-café state.

**Files:**
- `app/(tabs)/active.tsx` — reads `activeOrder` from `delivery.store`. If null → "No active delivery" placeholder with link to Available tab.
- **State A layout (status === ASSIGNED):**
  - Header: "Picking up order" + `[ASSIGNED]` status pill
  - Subtext: "Head to the café first"
  - Café address block (pickup — static from `CafeConfig` or env)
  - Items list: each item with qty + name + options. Label: "Verify items before leaving."
  - Full-width matcha CTA: "Items picked up — Start delivery" (wired in next phase)
- `components/delivery/DeliveryHeader.tsx` — status label + ETA display (ETA blank in State A)
- `components/delivery/ActionButton.tsx` — primary CTA, matcha background, white text, 52px height

**API used:** none (reads from store)

**Gate:**
- Active tab shows café address and correct items for an ASSIGNED order
- CTA is rendered and tappable (action wired in Phase R5)

---

### Phase R5 — Pickup + GPS Streaming + Map (State B)

**What to build:** Pickup PATCH, GPS streaming via `expo-location`, socket emit, OSM map with 3 pins.

**Files:**
- `lib/location.ts`:
  ```ts
  // startTracking(onLocation): request foreground permission → Location.watchPositionAsync
  // accuracy: Balanced, timeInterval: 5000, distanceInterval: 15
  // stopTracking(): remove subscription
  ```
- `lib/socket.ts` — `getSocket()` / `disconnectSocket()` singleton. `socket.io-client`. Auth: `{ token }` from SecureStore. `transports: ['websocket']`, `reconnectionAttempts: 5`.
- `hooks/useActiveDelivery.ts`:
  - `handlePickup()`: `PATCH /orders/:id/pickup` (ASSIGNED → OUT_FOR_DELIVERY) → `startTracking()` → on each GPS tick: `delivery.store.setLocation(coords)`, emit `rider:location` `{ orderId, latitude, longitude, speed }` via socket, also `POST /riders/location` `{ orderId, latitude, longitude, speed }` as REST fallback (fire-and-forget).
  - `handleDeliver()`: `PATCH /orders/:id/deliver` (OUT_FOR_DELIVERY → DELIVERED) → `stopTracking()` → `delivery.store.setActiveOrder(null)`.
- `components/orders/DeliveryMap.tsx` — `react-native-maps` with `PROVIDER_DEFAULT` (OSM). `UrlTile` at `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Props: `cafeCoords`, `dropCoords`, `riderCoords?`. Café pin espresso, drop pin matcha, rider pin blue. `initialRegion` centred between café and drop.
- **State B layout in `active.tsx` (status === OUT_FOR_DELIVERY):**
  - Header: "Delivering now" + `[OUT FOR DELIVERY]` pill + ETA (`~N min · X km remaining`). ETA recomputed on every GPS tick: `Math.ceil((haversineKm(riderCoords, dropCoords) / 20) * 60)`.
  - `<DeliveryMap>` with all 3 pins — rider pin moves as GPS updates.
  - Drop address block + customer name + 📞 Call button (`Linking.openURL('tel:${order.customer.phone}')`).
  - COD banner (persistent in State B if `paymentMethod === 'COD'`): "Collect ₹XXX".
  - Full-width matcha CTA: "Mark as delivered".

**Socket events emitted:** `rider:location` `{ orderId, latitude, longitude, speed }`

**API used:** `PATCH /orders/:id/pickup`, `POST /riders/location`, `PATCH /orders/:id/deliver`

**Gate:**
- Pickup → `status === 'OUT_FOR_DELIVERY'`
- GPS mock emits `rider:location` socket events (confirm in server logs)
- Map renders café + drop + rider pins; rider pin updates on location change
- `POST /riders/location` server-side throttle: rapid-fire 10 calls/s → only ~3 persist in `RiderLocation` table (verify in DB)
- Customer tracking screen (if built) sees rider marker move

---

### Phase R6 — Complete Delivery (State C) + Socket Rooms

**What to build:** Delivered state screen, socket room join/leave lifecycle.

**Files:**
- **State C layout in `active.tsx` (status === DELIVERED):**
  - "✓ Delivered!" heading
  - Order number + grand total (from `Order.grandTotal`)
  - "Earnings: +₹XX (platform share)" — earnings figure from `GET /riders/earnings` today delta or hardcoded platform share for MVP
  - "Back to available orders" CTA → navigate to `(tabs)/index`, clear `activeOrder`
- Socket room management (wire in `useActiveDelivery.ts` or `app/(tabs)/_layout.tsx`):
  - On login / app start → join `rider:{userId}` room
  - On order accepted → join `order:{orderId}` room
  - On delivery complete → leave `order:{orderId}` room
- Listen for `notification` socket event → `showToast(payload.message)`

**API used:** `PATCH /orders/:id/deliver`

**Gate:**
- Deliver → `status === 'DELIVERED'`, `deliveredAt` set in DB
- No `rider:location` socket events emitted after deliver (confirm in logs)
- State C screen shows with correct order number and total

---

### Phase R7 — Earnings Screen

**What to build:** Today / week / month earnings summary with per-delivery breakdown.

**Files:**
- `hooks/useEarnings.ts` — TanStack Query: `GET /riders/earnings` → `{ today, week, month, deliveriesToday: Order[] }`. `staleTime: 30_000`.
- `app/(tabs)/earnings.tsx`:
  - "Earnings" header (DM Serif Display 20px)
  - Period selector pill strip: Today / This week / This month (active = espresso) — local state, no re-fetch on switch (all three periods returned in one API call)
  - Summary card: total in DM Mono 32px matcha, "X deliveries" subtext
  - Per-delivery list (Today period): order number (DM Mono 11px), customer drop address, time, earnings per delivery (DM Mono 13px matcha)
  - "Payment processed every Monday" footnote
- `components/earnings/EarningsSummary.tsx`

**API used:** `GET /riders/earnings`

**Gate:**
- Today total increments correctly after a completed test delivery
- Period switch shows correct aggregates with no additional network call

---

### Phase R8 — Profile + Online Toggle

**What to build:** Profile display, prominent online/offline toggle, logout.

**Files:**
- `app/(tabs)/profile.tsx`:
  - Avatar: initials in espresso bg circle, white text
  - Name (DM Serif Display 20px) + email + phone
  - Large online/offline toggle: matcha when online, grey when offline. Tap → `PATCH /riders/online` `{ isOnline: true/false }` + `delivery.store.setOnline(val)`.
  - Sections: Vehicle info (type + registration — read-only for MVP), Delivery history (link → earnings tab), Help (placeholder link)
  - Log out button (ghost style, espresso text): `POST /auth/logout` → `auth.store.logout()` → root re-routes to `(auth)`

**API used:** `PATCH /riders/online`, `POST /auth/logout`

**Gate:**
- Toggle OFF → available orders list goes to offline state
- Toggle ON → orders reappear
- Logout → cold restart lands on login screen

---

### Phase R9 — E2E Smoke Test

Before running this phase, confirm these API endpoints exist in `apps/api` (some were deferred from the Day 1–3 MVP build per IMPLEMENTATION.md §8):

| Endpoint | Notes |
|---|---|
| `GET /riders/available-orders` | Role-filtered READY orders |
| `PATCH /orders/:id/assign` | Sets `riderId`, READY → ASSIGNED |
| `PATCH /orders/:id/pickup` | Must be assigned rider; ASSIGNED → OUT_FOR_DELIVERY |
| `PATCH /orders/:id/deliver` | OUT_FOR_DELIVERY → DELIVERED, sets `deliveredAt` |
| `POST /riders/location` | Persist `RiderLocation`, server throttle 1/3 s |
| `PATCH /riders/online` | Flip `RiderProfile.isOnline` |
| `GET /riders/earnings` | SQL aggregate from DELIVERED orders |
| Socket `rider:location` inbound | Receive → persist → broadcast to `order:{id}` room |
| Socket `rider:assigned` outbound | Emit to customer when rider accepts |

> Also ensure `ALLOWED_TRANSITIONS` in `packages/shared` includes `READY → ASSIGNED` and `OUT_FOR_DELIVERY → DELIVERED`. The Day 3 MVP staff shortcut (`READY → DELIVERED`) can stay — both paths must work simultaneously.

**Full E2E sequence (matches IMPLEMENTATION.md §13 demo script steps 8–10):**
1. Customer places order → staff moves it to READY
2. Rider: go online → order appears in ≤15 s
3. Accept → ASSIGNED, order leaves list, Active tab activates
4. Active State A: café address + item list shown correctly
5. "Items picked up" → OUT_FOR_DELIVERY, GPS stream starts, map shows 3 pins
6. Simulate movement → rider pin updates on map AND customer tracking screen moves live
7. COD banner visible with correct total (if COD order)
8. Call button opens phone dialer with customer number pre-filled
9. "Mark as delivered" → DELIVERED, GPS stops, State C shown
10. Earnings tab: today total reflects the delivery just completed
11. `tsc --noEmit` zero errors

---

## PART 2 — CUSTOMER APP (`apps/customer-mobile`)

---

### Phase C1 — Scaffold + Auth + Design System

**What to build:** Project skeleton, font loading, navigation shell, login + OTP screens, auth store, full design token system.

**Files:**
- `lib/tokens.ts` — full token constants. Copy exactly from IMPLEMENTATION.md §Screen specs:
  ```ts
  C = { espresso, espressoDk, matcha, matchaLight, matchaDk, cream, surface, white,
        border, borderMd, ink, ink2, ink3, amberBg, amberText, greenBg, greenText,
        redBg, redText, blueBg, blueText }
  R = { sm:8, md:12, lg:16, xl:24, pill:32 }
  F = { serif, sans, sansMd, sansSb, mono, monoMd }
  S = { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32 }
  ```
  No hardcoded hex values anywhere else in the app.
- `lib/api.ts` — same pattern as rider app: Axios + Bearer interceptor + 401 auto-refresh.
- `stores/auth.store.ts` — Zustand: `user`, `isLoading`, `login()`, `logout()`, `hydrate()`. Tokens in SecureStore. `hydrate()` → `GET /users/me`.
- `app/_layout.tsx` — load fonts, `hydrate()`, SplashScreen guard, QueryClientProvider (`staleTime: 60_000, retry: 2, refetchOnWindowFocus: false`), route to `(auth)` or `(tabs)`.
- `app/(auth)/login.tsx` — top 40% espresso hero (brand mark 56×56 cream square radius-16, DM Serif Display 26px white, "Open · Closes 11 PM" matcha pill); bottom 60% white card (email input, "Send OTP" CTA, "or continue with Google" divider placeholder, terms footnote). Email regex validated before API call.
- `app/(auth)/verify-otp.tsx` — 6-box OTP (44×52px, espresso border on focus), auto-advance/retreat, 5-min resend countdown, "Verify code" disabled until 6 digits, dev bypass `123456`. Post-verify: if `user.name === null` → show bottom sheet to collect name + phone before proceeding.
- `components/ui/Button.tsx` — `variant="primary"` (espresso bg, white, 52px, radius-lg, full width), `variant="ghost"`.
- `components/ui/Pill.tsx`, `Divider.tsx`, `SkeletonLoader.tsx`, `Toast.tsx`

**API used:** `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `GET /users/me`

**Env vars needed:**
```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=http://localhost:3001
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

**Gate:**
- OTP flow works with real email and dev bypass `123456`
- Token stored → `GET /users/me` returns user → home tab shown
- Cold start with no token → login screen
- `tsc --noEmit` zero errors

---

### Phase C2 — Tab Shell + Home + Menu

**What to build:** 5-tab navigator, home screen (banners, categories, specials), menu screen (filter + items), floating cart pill.

**Files:**
- `app/(tabs)/_layout.tsx` — 5 tabs: Home, Menu, Cart, Orders, Profile. Espresso active state.
- `app/(tabs)/index.tsx` (Home):
  - Nav bar (white, 60px): brand name left, default-address location pill below in `ink3`, search icon + bell icon right.
  - Espresso hero (160px): "Free delivery" pill top-left, "Open" badge matcha top-right, "What are you craving today?" DM Serif Display 24px white, "Delivered in 20–35 min", search bar at bottom.
  - Banner strip: horizontal 3-card carousel (200×88px), auto-scroll. Data from `GET /banners`.
  - Category chips: horizontal scroll, active = espresso. Tap → navigate to menu with `categoryId` param. Data from `GET /menu/categories`.
  - "Today's Specials" section + See all. Data from `GET /menu/specials/today`.
  - Item rows: emoji thumbnail 64×64 rounded, name + description + price, add (+) espresso button.
  - Floating `<CartPill>` above tab bar when `cartStore.count > 0`.
- `app/(tabs)/menu.tsx` (Menu):
  - "Menu" nav bar + search icon.
  - Sticky category chip strip. Tap chip → `GET /menu/items?categoryId=`.
  - Section headers per category (DM Serif Display 17px).
  - Item rows (same `<ItemRow>` component).
  - Unavailable items (`isAvailable: false`) shown dimmed, add button disabled.
- `components/home/BannerCarousel.tsx`, `CategoryStrip.tsx`, `ItemRow.tsx`
- `components/menu/ItemCard.tsx`, `CategoryChip.tsx`
- `components/cart/CartPill.tsx` — absolute, bottom = TAB_BAR_HEIGHT + 12, left/right 16. Espresso bg, radius-26, height 52px. Left: count box (white/12% bg, DM Mono 14px). Right: total (DM Mono 14px) + "›". Animate mount/unmount with `Animated.spring`.
- `stores/cart.store.ts` — Zustand: `count`, `total`. Synced from TanStack Query cart response.
- `hooks/useMenu.ts` — TanStack Query: `GET /menu/categories`, `GET /menu/items?categoryId=`, `GET /menu/specials/today`. Items `staleTime: 60_000`. Use `FlashList` (not FlatList) for item lists.

**API used:** `GET /banners`, `GET /menu/categories`, `GET /menu/items`, `GET /menu/specials/today`

**Gate:**
- Live data renders — no mock arrays
- Category chip filter works (correct items per category)
- Cart pill appears with correct count after adding an item

---

### Phase C3 — Product Detail + Cart

**What to build:** Product detail screen with live price, cart screen with bill summary.

**Files:**
- `app/product/[id].tsx`:
  - Hero 220px (emoji/image on cream bg, back arrow white circle, heart icon circle).
  - White card with radius-24 top corners slides over hero by 20px:
    - Name (DM Serif Display 22px) + price row (DM Mono 20px espresso) — price updates live: `basePrice + sum(selectedOptionPriceDeltas)`.
    - "SIZE" label (uppercase 10px `ink3`) + single-select size pills (espresso when selected).
    - "ADD-ONS" label + multi-select addon pills (`matchaLight` bg when selected).
    - Divider.
    - Qty row: label left, stepper (−/N/+) right, min 1 max 10.
    - "Add to cart · ₹XXX" full-width CTA (52px, espresso, radius-16) → `POST /cart/items` `{ menuItemId, quantity, optionIds }` → success toast → cart pill updates. If item already in cart: button text → "Update cart".
- `app/(tabs)/cart.tsx`:
  - "Your cart" + "from CaféConnect" header.
  - Cart item rows: thumbnail 48×48 cream bg, name + option text, mini stepper (`PATCH /cart/items/:id` optimistic), price. Qty → 0: `DELETE /cart/items/:id`.
  - Coupon bar: dashed matcha border, "Apply coupon or promo code" → bottom sheet → text input → `POST /cart/apply-coupon` → success adds discount line to bill.
  - `<BillSummary>`: Subtotal / Delivery fee / Platform fee / GST / **Total** — all DM Mono. Fee logic per IMPLEMENTATION.md Appendix B.
  - Sticky "Proceed to pay · ₹XXX" CTA (espresso) → navigate to `checkout.tsx`.
  - Empty state: illustration + "Your cart is empty" + "Browse menu" button.
- `components/product/OptionSelector.tsx`, `QtySteppers.tsx`
- `components/cart/CartItem.tsx`, `BillSummary.tsx`
- `hooks/useCart.ts` — TanStack Query: `GET /cart` (staleTime 0), `GET /cart/preview` (staleTime 0), mutations for add/patch/delete/coupon.

**API used:** `GET /menu/items/:id`, `POST /cart/items`, `GET /cart`, `GET /cart/preview`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `POST /cart/apply-coupon`

**Gate:**
- Price updates live as options are selected
- Adding same item twice → `CartItem.quantity` increments, not a new row
- Cart bill math matches `GET /cart/preview` grand total (per Appendix B formula)
- Coupon `FLAT20` applies 20% discount when subtotal ≥ ₹200

---

### Phase C4 — Addresses + Checkout (COD)

**What to build:** Saved addresses, society + external address forms with zone validation, checkout COD path.

**Files:**
- `app/addresses/index.tsx` — list of saved address cards: map-pin icon in cream square, address text, "Default" pill if applicable. Tap → edit. Swipe-to-delete → confirmation bottom sheet → `DELETE /addresses/:id`. "Add new address" CTA.
- `app/addresses/new.tsx`:
  - "Society / External" segmented control.
  - **Society fields:** Tower dropdown (`GET /addresses/society-options` → `SocietyTower` list), Wing input, Floor input, Flat number, Label (Home/Work/Other).
  - **External fields:** Address line 1, line 2, Pincode, City (auto-filled "Pune"), Lat/Lng (device GPS or manual).
  - On submit: `POST /addresses/validate` first.
    - Society → always PRIMARY zone, `primaryDeliveryFee` (IMPLEMENTATION.md §6).
    - External → if haversine > `CafeConfig.deliveryRadiusKm` (7 km) → inline red card: "Sorry, this address is outside our delivery zone (7km)".
  - If valid: `POST /addresses` → navigate back.
- `app/checkout.tsx`:
  - "Checkout" header + back arrow.
  - "Deliver to": saved address radio list, pre-selects default; "Add new" option.
  - "Payment": COD pill (radio) + Razorpay UPI pill (radio).
  - Order summary card: items list + fee breakdown (`GET /cart/preview`).
  - "Place order · ₹XXX" CTA (espresso, 52px).
  - **COD path:** `POST /orders` `{ addressId, paymentMethod: 'COD' }` → on success: `DELETE /cart` (clear), invalidate cart query → navigate to `order/[id]`.
- `components/checkout/AddressSelector.tsx`, `PaymentMethodPicker.tsx`
- `hooks/useAddresses.ts` — TanStack Query: `GET /addresses`, `GET /addresses/society-options`, mutations for create/delete/validate.

**API used:** `GET /addresses`, `GET /addresses/society-options`, `POST /addresses/validate`, `POST /addresses`, `DELETE /addresses/:id`, `POST /orders`, `DELETE /cart`

**Gate:**
- Society address saves and appears in checkout selector
- External address > 7 km → validation rejects with inline distance error
- COD order places: cart empties, order in `GET /orders` with `status === 'PLACED'`

---

### Phase C5 — Orders List + Order Tracking (Realtime)

**What to build:** Orders list tab, order tracking screen with live status stepper, socket integration.

**Files:**
- `lib/socket.ts` — `getSocket()` / `disconnectSocket()` singleton. Same pattern as rider app.
- `stores/order.store.ts` — Zustand: `activeOrderStatus`, `updateOrderStatus(orderId, status)`.
- `hooks/useOrderTracking.ts`:
  ```ts
  // On mount: socket.emit('join:order', { orderId })
  // Listen 'order:status' → updateOrderStatus(orderId, payload.status)
  // Listen 'notification' → showToast(payload.message)
  // Cleanup: socket.off, socket.emit('leave:order', { orderId })
  ```
- `hooks/useOrders.ts` — TanStack Query: `GET /orders` (customer-scoped), `GET /orders/:id`.
- `app/(tabs)/orders.tsx`:
  - "Your orders" header.
  - Order cards: order number (DM Mono 11px), status pill (amber/blue/green/red per status), item count + first item name, date, total. Active orders at top, past below divider.
  - `order:status` socket event updates the status pill on active orders live.
  - Tap → `order/[id]`.
- `app/order/[id].tsx` (Order Tracking):
  - Back arrow header.
  - Order header card: order number + status name (DM Serif Display 22px) + ETA (DM Mono matcha).
  - `<StatusStepper>` — 5 steps: Placed → Accepted by café → Preparing your order → Ready for pickup → Delivered. Active step: espresso dot. Done: matcha dot + check. Pending: grey outline. CANCELLED variant: red dot + `rejectReason` in red card below.
  - Delivery address card.
  - Order summary card (items + grand total DM Mono).
  - Status `DELIVERED` → full-width "Order delivered!" success banner. No further updates.
  - Call `useOrderTracking(orderId)` — live updates without re-fetch.
- `components/orders/OrderCard.tsx`, `StatusStepper.tsx`

**API used:** `GET /orders`, `GET /orders/:id`

**Socket events listened:** `order:status`, `notification`, `rider:location` (wired in Phase C6)

**Gate:**
- New order appears in orders list after placement without manual refresh
- From staff-web: accept order → customer tracking stepper advances to "Accepted" live (no re-fetch)
- `notification` toast appears on status change (e.g. "Your order has been accepted")

---

### Phase C6 — Razorpay + Rider Map + Profile + Polish

**What to build:** Razorpay UPI checkout path, rider location pin on tracking map, profile screen, performance + error handling.

**Files:**
- `lib/razorpay.ts` — `openRazorpay(params)` wrapper around `react-native-razorpay`. Options: `key = EXPO_PUBLIC_RAZORPAY_KEY_ID`, `currency: 'INR'`, `theme: { color: '#1C0F08' }`. Returns `{ razorpayPaymentId, razorpayOrderId, razorpaySignature }`.
- Razorpay path in `checkout.tsx` (alongside existing COD path):
  1. `POST /payments/razorpay/create` → get `razorpayOrderId`
  2. `openRazorpay(...)` → on cancel: silent, stay on checkout. On failure: toast "Payment failed. Try again or use COD."
  3. On success: `POST /payments/razorpay/verify` `{ razorpayPaymentId, razorpayOrderId, razorpaySignature }`
  4. `POST /orders` → clear cart → navigate to `order/[id]`
- Rider location map in `app/order/[id].tsx`:
  - Install `react-native-maps`, OSM tiles (no Google Maps API key needed).
  - Show only when `status === 'OUT_FOR_DELIVERY'`.
  - Pins: café (espresso), drop address (matcha), rider (blue dot — moves on `rider:location` socket event).
  - Subscribe to `rider:location` in `useOrderTracking` → update rider marker coords.
- `app/(tabs)/profile.tsx`:
  - Avatar (initials, cream bg).
  - Name (DM Serif Display 20px) + email.
  - Sections: My Addresses → `addresses/index`; Order History → `(tabs)/orders`; Payment Methods (placeholder); Help (placeholder).
  - Log out (ghost, espresso text): `POST /auth/logout` → `auth.store.logout()`.
- Performance:
  - All item lists: `FlashList` from `@shopify/flash-list` (not FlatList).
  - Banner images: `expo-image` (aggressive caching).
  - Cart pill mount/unmount: `Animated.spring`.
- Error handling (matches IMPLEMENTATION.md §Error Handling table):

| Scenario | Handling |
|---|---|
| Network offline | Toast "No internet connection" + retry button |
| 401 expired | Auto-refresh silently; on refresh fail → logout |
| 400 from API | Inline field-level error (address validation, coupon) |
| 500 from API | Toast "Something went wrong, please try again" |
| Razorpay cancelled | Silent — stay on checkout |
| Razorpay failed | Toast with COD fallback suggestion |
| Out-of-zone address | Inline red card with distance shown |

**API used:** `POST /payments/razorpay/create`, `POST /payments/razorpay/verify`, `POST /auth/logout`

**Gate:**
- Razorpay test UPI `success@razorpay` completes → order created, cart cleared
- Rider pin appears on tracking map and moves live during OUT_FOR_DELIVERY
- Logout → cold restart lands on login
- `tsc --noEmit` zero errors across all customer app files
- `npx expo-doctor` passes
- Full IMPLEMENTATION.md §13 demo script runs end-to-end across both apps

---

## Shared reminders

- **Token extraction:** once both apps are scaffolded, move `lib/tokens.ts` to `packages/shared/src/tokens.ts` and import in both apps — no duplication.
- **Haversine:** single source at `packages/shared/src/utils/haversine.ts` — same function used by API (IMPLEMENTATION.md §6) and both mobile apps.
- **Socket singletons:** each app has its own `lib/socket.ts` singleton — do not share across apps.
- **`ALLOWED_TRANSITIONS`:** the canonical map lives in `packages/shared` (IMPLEMENTATION.md Appendix A). Both apps rely on the server to enforce it — never patch status client-side.
- **Fee logic:** canonical formula is in IMPLEMENTATION.md Appendix B. `GET /cart/preview` applies it server-side; the client displays the result, never recalculates it independently.
- **Seed accounts** for testing (IMPLEMENTATION.md §5 seed): `rider@cafe.test` (RIDER), `customer@test.com` (CUSTOMER), `staff@cafe.test` (STAFF). Dev OTP bypass: `123456`.
