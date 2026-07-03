# CaféConnect — v3 Feature Phases
## Daily Specials · User Profile & Addresses · Map Address Picker · Invoices · Realtime Overhaul

> **Picks up from `CAFECONNECT_V2_TASKS.md` Phase 33.**
> Phase numbering continues: 34 onwards.
> The full V2 loop (customer mobile + rider mobile, Phases 19–33) must be verified before starting here.
>
> **What this file builds — in dependency order:**
> - Phase 34 — Realtime overhaul (Socket.IO push everywhere, zero refresh dependency) — **do this first**, everything else benefits from it
> - Phase 35 — Daily Specials system (DB, API, staff panel, customer app — hot-swappable menu)
> - Phase 36 — User profile + Zomato/Swiggy-style address book (CRUD, defaults, labels)
> - Phase 37 — Map-based address picker (OSM, current location, society complex + 7km radius logic)
> - Phase 38 — Invoice system (customer PDF invoice, staff QR-code KOT that advances order status)
>
> **Puzzle piece contract:**
> `MVP:X.Y` = phase from `CAFECONNECT_MVP_TASKS.md`
> `V2:X.Y` = phase from `CAFECONNECT_V2_TASKS.md`
> `V3:X.Y` = phase in this file
> Nothing from prior files is re-built — only extended or wired.

---

## How to use this file

- Same Qwen Coder prompt discipline: one task row at a time, paste the "Done when" as the acceptance check.
- Every phase: **🤖 AI Testing** before you touch the UI, **🧪 Manual Test (you)** as the sign-off gate.
- Phase 34 (Realtime) is a prerequisite for Phases 35–38 because specials, profile, and invoice status all need live push. Build it first even if it feels like plumbing.

---

## Realtime Gap Analysis (why Phase 34 first)

Currently in the codebase, the following things only update after a manual page refresh:

| Surface | What's stale | Root cause |
|---|---|---|
| Staff dashboard | New orders, status changes | `GET /orders` not re-triggered by socket `order:new` / `order:status` |
| Customer tracking | Status stepper | `order:status` subscribed in V2:24.5 but `useQuery` cache not invalidated — store update works but QueryClient still has stale data |
| Staff menu page | Availability toggles from another session | No socket emission on menu PATCH |
| Home / specials | Daily special added/removed by staff | No socket emission on specials CRUD |
| Cart | Cart mutated from another device | No socket emission on cart changes |
| Order list | New order arriving | Not subscribed to `order:new` on customer side |

Phase 34 fixes all of these at the source. After it's done, every subsequent phase builds on a system where data is live by default.

---

## Phase 34 — Realtime Overhaul (Socket.IO Push + QueryClient Invalidation)

**Goal:** Every state change (menu, orders, specials, cart) propagates to all connected clients instantly without any manual refresh. This is a cross-cutting change touching API gateway, staff-web hooks, and customer-mobile hooks.

### 34A — API: Emit Missing Socket Events

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 34A.1 | In `MenuService.updateItem()` (PATCH /menu/items/:id), emit `menu:item_updated` to a global `menu` socket room with payload `{ menuItemId, isAvailable, updatedAt }`. Staff who update an item and other staff sessions both see the change | `src/modules/menu/menu.service.ts`, `src/modules/gateway/orders.gateway.ts` | MVP:4.9, MVP:13.1 | Toggling availability in one staff browser tab reflects in another tab within 2s without refresh |
| 34A.2 | In `MenuService.createSpecial()` and `updateSpecial()`, emit `menu:specials_updated` to the `menu` room with payload `{ action: 'created'\|'updated'\|'deleted', special }` | `menu.service.ts` | MVP:4.11 | Creating a daily special in staff panel appears on customer home screen within 2s without refresh |
| 34A.3 | In `OrdersGateway`, ensure `order:new` is emitted to the `staff` room AND to `customer:{customerId}` room (not just `staff`). Customer-side order list can then subscribe and prepend new orders | `src/modules/gateway/orders.gateway.ts` | MVP:13.3 | After placing an order, it appears in the customer's Orders tab list without refresh |
| 34A.4 | In `CartService`, after any mutation (`addItem`, `updateItem`, `removeItem`, `clearCart`, `applyCoupon`), emit `cart:updated` to `customer:{customerId}` room with the full updated cart payload. This lets multi-device cart sync work | `src/modules/cart/cart.service.ts` | MVP:7.2–7.5 | Adding item on one device reflects in cart on a second logged-in device within 2s |
| 34A.5 | Add a `menu` room to `OrdersGateway`: clients with STAFF role join `menu` room on socket connect alongside `staff` room. Clients with CUSTOMER role join `customer:{userId}` room | `orders.gateway.ts` | MVP:13.2 | Staff socket is in both `staff` and `menu` rooms on connect; customer socket is in `customer:{userId}` |

### 34B — Staff Web: Subscribe and Invalidate

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 34B.1 | In `useSocket.ts` (staff-web), subscribe to `order:new` → call `queryClient.setQueryData(QK.orders, (old) => [newOrder, ...old])` AND show a toast. No more polling or manual refresh needed for new orders | `src/hooks/useSocket.ts`, `src/app/(staff)/dashboard/page.tsx` | MVP:14.1, 34A.3 | New order appears on staff dashboard within 1s of placement, no refresh |
| 34B.2 | Subscribe to `order:status` in staff order detail page → call `queryClient.setQueryData(QK.order(id), ...)` to update the status in-place. Action buttons re-render to show next valid transitions | `src/app/(staff)/orders/[id]/page.tsx` | MVP:14.4, MVP:13.4 | Status updated by another staff session reflects in the detail view within 1s |
| 34B.3 | Subscribe to `menu:item_updated` in staff menu page → call `queryClient.setQueryData(QK.menuItems, ...)` to flip the availability toggle in-place. No full list re-fetch | `src/app/(staff)/menu/page.tsx` | 34A.1, MVP:6.2 | Availability change by one staff session reflects in another staff session's menu page within 2s |
| 34B.4 | Subscribe to `menu:specials_updated` in staff specials page → `queryClient.invalidateQueries(QK.specials)`. Specials list re-fetches automatically | `src/app/(staff)/menu/specials/page.tsx` | 34A.2 | New special created in one tab appears in another tab's specials list within 2s |
| 34B.5 | Add a global `revenue:updated` event: emit from `OrdersService` when an order reaches `DELIVERED` with `{ delta: order.grandTotal, newTotal: todayTotal }`. Staff dashboard subscribes and increments the revenue counter without re-fetching stats | `orders.service.ts`, `orders.gateway.ts`, `dashboard/page.tsx` | MVP:14.6, 34A.5 | Revenue counter on dashboard ticks up within 1s of marking an order delivered |

### 34C — Customer Mobile: Subscribe and Invalidate

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 34C.1 | In `useOrderTracking.ts` (V2:24.5), when `order:status` arrives: BOTH update `orderStore` (already done) AND call `queryClient.setQueryData(QK.order(id), (old) => ({ ...old, status: newStatus }))`. This ensures the order detail query cache is also fresh | `hooks/useOrderTracking.ts` | V2:24.5, V2:24.6 | After status change, `GET /orders/:id` response from cache is also up-to-date (no stale data if user backgrounds and returns) |
| 34C.2 | In `(tabs)/orders.tsx`, subscribe to `order:new` event on the `customer:{userId}` room → prepend new order to `queryClient` cache for `QK.orders`. New order appears in list without re-fetch | `app/(tabs)/orders.tsx` | 34A.3 | Placing an order from checkout navigates to tracking; orders list tab shows it immediately without a separate refresh |
| 34C.3 | In `(tabs)/index.tsx` (Home), subscribe to `menu:specials_updated` → call `queryClient.invalidateQueries(QK.specials)`. Today's specials section refreshes within 2s of staff adding a special | `app/(tabs)/index.tsx` | 34A.2 | Staff adds a daily special → customer home screen shows it within 2s without pull-to-refresh |
| 34C.4 | Subscribe to `cart:updated` event on `customer:{userId}` room → call `queryClient.setQueryData(QK.cart, payload.cart)` and `cartStore.setFromServer(payload.cart)`. Multi-device cart sync | `app/(tabs)/cart.tsx` | 34A.4 | Adding an item on the web (if customer web exists) reflects in the mobile cart tab within 2s |
| 34C.5 | Add pull-to-refresh (`<RefreshControl>`) to Home, Menu, Orders list, and Cart as a fallback for when socket reconnects after a long background. This is the safety net — the primary path is always socket push | `app/(tabs)/index.tsx`, `app/(tabs)/menu.tsx`, `app/(tabs)/orders.tsx`, `app/(tabs)/cart.tsx` | 34C.1–34C.4 | Pull-to-refresh works on all 4 screens; no screen requires it under normal conditions |

**🤖 AI Testing**
- Two staff browser tabs open: toggle an item's availability in Tab A → assert the toggle reflects in Tab B within 2s without any user action.
- Place an order as a customer → assert it appears in staff dashboard within 1s AND in customer orders list within 1s.
- Accept an order from staff → assert customer tracking stepper updates without `GET /orders/:id` being called again (confirm via network tab — no refetch).
- Assert `queryClient.getQueryData(QK.order(id))` returns updated status after `order:status` socket event (not just the store).
- `order:new` emitted: assert it arrives in BOTH `staff` room AND `customer:{customerId}` room simultaneously.

**🧪 Manual Test (you)**
1. Open staff-web dashboard and customer mobile orders tab side-by-side.
2. Place an order on customer mobile — confirm it appears on staff dashboard AND customer orders tab within 1s, no refresh.
3. Accept the order on staff — confirm customer tracking stepper moves to "Accepted" within 1s, no refresh.
4. On staff, toggle a menu item unavailable — open a second staff tab, confirm toggle reflects without refresh.
5. Add a daily special from staff — confirm it appears on customer home screen within 2s.
6. Pull-to-refresh on customer home — confirm it still works as a fallback.

---

## Phase 35 — Daily Specials System

**Goal:** Staff can push a hot "today's menu" section to the top of the customer home screen at any time. Each special is independent of the main menu — a temporary spotlight with its own price, image, and description. Customer sees it live within 2s of staff publishing it (Phase 34 already handles the push).

### 35A — Database

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 35A.1 | Extend `DailySpecial` model in Prisma schema: add `imageUrl String?`, `badgeText String?` (e.g. "Chef's pick", "Limited time"), `originalPrice Decimal?` (for crossed-out price), `discountedPrice Decimal`, `availableFrom DateTime` (default `00:00` today), `availableUntil DateTime` (default `23:59` today), `isActive Boolean @default(true)`, `sortOrder Int @default(0)`. `availableOn` is replaced by the range of `availableFrom`–`availableUntil` | `packages/database/prisma/schema.prisma` | MVP:1.5 | `npx prisma validate` passes; `npx prisma migrate dev --name daily-special-v2` applies cleanly |
| 35A.2 | Run migration. Backfill existing `DailySpecial` rows: set `availableFrom = availableOn 00:00`, `availableUntil = availableOn 23:59`, `discountedPrice = price from linked MenuItem`, `isActive = true` | `prisma/migrations/`, `prisma/seed.ts` | 35A.1 | Existing specials still appear in `GET /menu/specials/today`; no data loss |

### 35B — API

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 35B.1 | Update `GET /menu/specials/today` query: filter where `availableFrom <= now() AND availableUntil >= now() AND isActive = true`. Order by `sortOrder ASC`. Include `badgeText`, `imageUrl`, `originalPrice`, `discountedPrice` in response | `src/modules/menu/menu.service.ts` | 35A.1, MVP:4.4 | Response includes new fields; a special with `availableUntil` in the past is excluded without any manual action |
| 35B.2 | `POST /menu/specials` (STAFF) — create a `DailySpecial` with optional `linkedMenuItemId`. If linked, inherit `imageUrl` and name from the menu item but allow override. Validate `availableFrom < availableUntil` | `menu.controller.ts`, `menu.service.ts` | MVP:4.11 | Created special immediately appears in `GET /menu/specials/today` if time range includes now |
| 35B.3 | `PATCH /menu/specials/:id` (STAFF) — update any field including toggling `isActive`. Emit `menu:specials_updated` (Phase 34A.2 already covers this — just confirm the service calls the gateway) | `menu.controller.ts` | 35B.2, 34A.2 | Deactivating a special (`isActive: false`) removes it from customer-facing endpoint immediately |
| 35B.4 | `DELETE /menu/specials/:id` (STAFF) — hard delete or set `isActive = false`. Emit `menu:specials_updated` | `menu.controller.ts` | 35B.3 | Deleted special no longer in `GET /menu/specials/today` |
| 35B.5 | `PATCH /menu/specials/reorder` (STAFF) — accepts `[{ id, sortOrder }]` array, bulk updates `sortOrder`. Emit `menu:specials_updated` | `menu.controller.ts` | 35B.3 | Reorder reflects in customer home within 2s |

### 35C — Staff Web Panel

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 35C.1 | Build `(staff)/menu/specials/page.tsx` — header: "Daily Specials" title, "Today's specials update live on the customer app" subtitle, "Add special" primary CTA. Below: drag-to-reorder list (use `@dnd-kit/sortable`) of active specials for today, each card showing badge text, name, original + discounted price, time range, active toggle, edit + delete icons | `src/app/(staff)/menu/specials/page.tsx` | MVP:5.6, 35B.1 | Page renders; specials load from API |
| 35C.2 | Specials list card design: left = coloured badge chip (`badgeText`), item name in `DM Serif Display` 15px, strikethrough `originalPrice` in ink3, `discountedPrice` in espresso. Right: time range ("10:00 AM – 2:00 PM"), green/grey availability dot, edit icon, delete icon. Drag handle on left edge | `src/app/(staff)/menu/specials/page.tsx` | 35C.1 | Cards render all fields; drag handle visible |
| 35C.3 | Build add/edit special form (slide-in sheet or modal): fields — name (text), badge text (text, 20 char max, e.g. "Chef's pick"), original price (number, optional — for showing a strikethrough), discounted price (number, required), image URL (text, optional), "Link to menu item" dropdown (optional — auto-fills name + image), available from (time picker), available until (time picker), is active toggle | `src/app/(staff)/menu/specials/sheet.tsx` | 35C.1, 35B.2 | Form submits correctly; new special appears in list immediately via 34B.4 socket update |
| 35C.4 | Wire drag-to-reorder: on drop, call `PATCH /menu/specials/reorder` with new sort order array. Optimistic UI: reorder list before API responds | `src/app/(staff)/menu/specials/page.tsx` | 35C.1, 35B.5 | Dragging a card updates order; customer home reflects new order within 2s |
| 35C.5 | Add "Specials" link to the staff sidebar nav (between Menu and Banners). Add a badge showing count of active specials for today | `src/app/(staff)/layout.tsx` | 35C.1 | Sidebar link navigates to specials page; badge shows live count |

### 35D — Customer App

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 35D.1 | Redesign the specials section on `(tabs)/index.tsx` (Home): move it to the **very top** of the scrollable content, just below the nav bar (above the hero banner). Use a horizontal `FlashList` with `ItemSeparatorComponent`. Each special card is 160×200px with the item image or emoji placeholder, badge chip (`badgeText`) in the top-left corner, name in `F.serif` 15px, crossed-out original price + discounted price in `F.monoMd` | `app/(tabs)/index.tsx`, `components/home/SpecialCard.tsx` | V2:21.9 | Specials appear at top of home; empty section hidden if no specials today |
| 35D.2 | `SpecialCard` component: props `special: DailySpecial`. Card: `expo-image` for imageUrl (falls back to emoji placeholder in cream bg), badge chip (espresso bg, white text, radius 20, absolute top-left 8px), name (`F.serif` 15px white, absolute bottom), price row (`F.mono` original strikethrough ink3, discounted white `F.monoMd`). Add (+) button bottom-right (matcha bg). Gradient overlay bottom half for text legibility | `components/home/SpecialCard.tsx` | F.1 | Card renders all states: with image, without image, with badge, without original price |
| 35D.3 | Tap on special card: if `linkedMenuItemId` → navigate to `product/[linkedMenuItemId]` with pre-selected `discountedPrice` override. If no link → add directly to cart with quantity 1 and `discountedPrice` | `components/home/SpecialCard.tsx` | V2:22.5, 35B.1 | Tapping linked special opens product detail at discounted price; unlinked special adds to cart directly |
| 35D.4 | Subscribe to `menu:specials_updated` (already wired in 34C.3) and add visual feedback: when specials list updates, animate new card sliding in from the right. Removed cards fade out | `app/(tabs)/index.tsx` | 34C.3 | New special published by staff animates in on customer home without any user action |

**🤖 AI Testing**
- Create a special via `POST /menu/specials` with `availableFrom: 1 minute ago, availableUntil: 1 hour from now` — assert `GET /menu/specials/today` returns it.
- Set `availableUntil` to 1 minute ago — assert it disappears from `GET /menu/specials/today` without any admin action.
- Set `isActive: false` — assert removed from customer endpoint.
- Drag reorder in staff UI (or call `PATCH /menu/specials/reorder`) — assert `sortOrder` in DB matches new positions.
- `menu:specials_updated` socket event: assert customer home `QK.specials` cache invalidates and re-fetches.

**🧪 Manual Test (you)**
1. Go to staff specials page — confirm it loads and shows today's specials.
2. Add a new special with badge "Chef's pick", original ₹280, discounted ₹220, available now until midnight.
3. On customer mobile home — confirm the special appears at the top within 2s.
4. Drag it below another special in staff — confirm order changes on customer home within 2s.
5. Toggle the special inactive — confirm it disappears from customer home within 2s.
6. Delete it — confirm gone from staff list and customer home.

---

## Phase 36 — User Profile + Zomato/Swiggy-Style Address Book

**Goal:** Customer profile screen with full address management: add, edit, delete, set default, label (Home/Work/Other). Addresses persist, are visible across sessions, and update live.

### 36A — API Extensions

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 36A.1 | Extend `Address` model: add `label AddressLabel @default(HOME)` (enum: `HOME`, `WORK`, `OTHER`, `CUSTOM`), `customLabel String?` (for OTHER with custom text), `isDefault Boolean @default(false)`, `nickname String?` (optional short name like "Mom's place"). Add `AddressLabel` enum to `packages/shared/src/enums.ts` | `schema.prisma`, `packages/shared/src/enums.ts` | MVP:1.4 | `npx prisma validate` passes; migration applies |
| 36A.2 | Update `POST /addresses` to accept `label`, `customLabel`, `nickname`. When `isDefault: true` is set, atomically set all other addresses for this user to `isDefault: false` (Prisma transaction) | `addresses.controller.ts`, `addresses.service.ts` | MVP:8.3 | Setting a new address as default un-defaults the previous one in the same transaction |
| 36A.3 | Add `PATCH /addresses/:id` full update support: all fields editable including `label`, `isDefault`, coordinates. If `isDefault: true`, run the same un-default transaction | `addresses.controller.ts` | MVP:8.5 | Editing an address updates all fields; setting it as default correctly flips others |
| 36A.4 | Add `PATCH /addresses/:id/set-default` — shortcut endpoint that sets `isDefault: true` for one address and `false` for all others. Returns the updated address list | `addresses.controller.ts` | 36A.3 | Calling this endpoint once is sufficient to set a default without a full PATCH |
| 36A.5 | Update `GET /users/me` to include `addresses` (full list with `isDefault`, `label`, `nickname`) and `defaultAddress` (the single `isDefault: true` address, or null). Used to pre-fill the location pill in the home nav bar | `users.controller.ts`, `users.service.ts` | MVP:3.13 | `GET /users/me` response includes `addresses` array and `defaultAddress` object |

### 36B — Customer App: Profile Screen

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 36B.1 | Rebuild `(tabs)/profile.tsx` — top section: avatar (initials, espresso bg, 64px circle), name (`F.serif` 22px ink), email (`F.sans` 13px ink3), phone (`F.sans` 13px ink3), "Edit" ghost button top-right that opens a bottom sheet for name + phone PATCH. Sections list below | `app/(tabs)/profile.tsx` | MVP:3.13 | Profile renders all fields; "Edit" opens sheet; saving calls `PATCH /users/me` and updates display |
| 36B.2 | Profile sections list: "My Addresses" (with count badge), "Order History", "Payment Methods" (placeholder — "Coming soon" badge), "Help & Support" (placeholder), "About" (version, placeholder). "Log out" danger button at very bottom (red text, hairline border) | `app/(tabs)/profile.tsx` | 36B.1 | All rows render; tapping "My Addresses" navigates to address book |

### 36C — Customer App: Address Book (Zomato/Swiggy Style) ✅ COMPLETE

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 36C.1 ✅ | Build `addresses/index.tsx` address book screen — header: "Saved addresses", back arrow, "Add new" text button top-right. Three label-grouped sections: "Home" (addresses labelled HOME), "Work" (WORK), "Other" (OTHER + CUSTOM). Each section visible only if it has addresses | `app/addresses/index.tsx` | 36A.5 | Address book renders; addresses grouped by label |
| 36C.2 ✅ | Address card design (Zomato-inspired): left = label icon chip (🏠/💼/📍 in cream square 36×36), right column = nickname or auto-name in `F.sansMd` 13px, full address in `F.sans` 12px ink3, "Default" matcha pill if `isDefault`. Far right = `⋮` context menu button (edit, set as default, delete) | `components/addresses/AddressCard.tsx` | 36C.1 | Card renders all states; "Default" pill shows correctly; `⋮` menu opens |
| 36C.3 ✅ | Context menu on `⋮`: three options — "Edit" (opens address form), "Set as default" (calls `PATCH /addresses/:id/set-default`, optimistically updates list), "Delete" (confirmation bottom sheet then `DELETE /addresses/:id`). Optimistic UI for all three: update local cache before API responds, rollback on error | `components/addresses/AddressCard.tsx` | 36A.3, 36A.4 | All three actions work; "Set as default" flips the default pill without full list re-fetch |
| 36C.4 ✅ | "Add new address" flow — selection screen: two large tappable cards — "📍 Use map to pick location" (primary card, espresso border, navigates to map picker Phase 37) and "🏢 I'm inside the society" (matcha border, navigates to society form). Below both cards: "Save a Work or Other address too" hint text | `app/addresses/new-choice.tsx` | 36C.1 | Selection screen renders; both cards navigate to correct form |
| 36C.5 ✅ | Society form (from V2:23.2 — extend it): add `Label` selector at top (Home/Work/Other chips — if Other, show a text field for custom label). Add `Nickname` text input (optional, e.g. "Dad's flat"). On save: `POST /addresses` with all new fields | `app/addresses/new-society.tsx` | V2:23.2, 36A.2 | Society address saves with label and optional nickname |
| 36C.6 ✅ | Edit address screen (reuse add form in edit mode): pre-fill all fields from existing address. "Save changes" calls `PATCH /addresses/:id`. Back button confirms "Discard changes?" if form is dirty | `app/addresses/edit.tsx` | 36C.5, 36A.3 | Edit pre-fills all fields; dirty check on back; save updates address in list |
| 36C.7 ✅ | Default address displayed in home nav bar location pill (`(tabs)/index.tsx`): queries `GET /address` (staleTime 5 min, shares `['addresses']` cache), picks `isDefault` address, formats it as "Tower A, Flat 501" (society) or first address-line segment (external). Pill is tappable → navigates to address book. Falls back to user name if no addresses saved | `app/(tabs)/index.tsx` | 36A.5, V2:21.5 | Nav bar shows default address name; tapping it navigates to address book |

**🤖 AI Testing**
- Create two addresses for a user, set both as default in sequence (separate API calls): assert only the second is `isDefault: true` in DB.
- `GET /users/me`: assert `defaultAddress` matches the one marked `isDefault: true`.
- Delete the default address: assert another address does NOT automatically become default (user must manually set).
- Context menu "Set as default": assert optimistic update shows new default immediately; API call confirms; no flash on success.

**🧪 Manual Test (you)**
1. Open Profile → My Addresses — confirm empty state with "Add new" option.
2. Add a Home address (society) — confirm it appears in the "Home" section with 🏠 icon.
3. Add a Work address — confirm it appears in the "Work" section.
4. Tap `⋮` on Home address, set as default — confirm "Default" pill moves.
5. Edit the Work address, change the nickname — confirm it updates in the list.
6. Delete Work address with confirmation — confirm it's removed.
7. Home screen — confirm default address name shows in nav bar location pill.

---

## Phase 37 — Map-Based Address Picker ✅ COMPLETE

**Goal:** Customer can drop a pin anywhere on a map to set their delivery location. The system enforces the café's delivery rules: society complex addresses = free delivery (PRIMARY zone), within 7km radius = paid delivery (SECONDARY zone), outside 7km = blocked. "Use current location" button with ±10m accuracy. Distance-from-user warning if pin is far from device.

### 37A — API ✅

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 37A.1 ✅ | `POST /address/validate` returns `{ zoneType, distanceFromCafeKm, distanceFromUserKm?, deliveryFee, estimatedTime, societyMatch? }` | `address.service.ts` | MVP:8.6 | Implemented in address.service.ts validateLocation() |
| 37A.2 ✅ | `latitude`/`longitude` already present on Address model from MVP:1.4 | `schema.prisma` | MVP:1.4 | Fields present with index |
| 37A.3 ✅ | `POST /address` accepts `{ latitude, longitude }` for EXTERNAL type | `address.service.ts` | 37A.2 | Required for EXTERNAL; society inherits if tower has coords |

### 37B — Customer App: Map Picker Screen ✅

| # | Task | Files touched | Done when |
|---|------|---------------|-----------|
| 37B.1 ✅ | `react-native-maps` already in package.json; OSM UrlTile configured | `package.json` | Installed |
| 37B.2–37B.8 ✅ | Full map-picker screen: OSM map, floating pin (absolute View over map centre), 500ms debounced validation, bottom sheet with all zone states, GPS ⊕ button (top-right), blue dot for device location, accuracy pill, society hint card, confirm CTA → map-details | `app/addresses/map-picker.tsx` | Implemented |
| 37B.9–37B.10 ✅ | map-details.tsx: non-interactive 130px map thumbnail + delivery fee badge, label chips, Building/Flat field, Landmark field, saves via `POST /address` with lat/lng, navigates to address book on success | `app/addresses/map-details.tsx` | Implemented |

**🤖 AI Testing**
- Drop pin at known society coordinates (within 200m of a `SocietyTower`): assert `societyMatch` populated and hint card renders.
- Drop pin at 3km from café: assert `SECONDARY` zone, correct delivery fee shown, CTA enabled.
- Drop pin at 8km from café: assert `OUT_OF_ZONE`, CTA disabled, cannot save.
- Current location accuracy >10m: assert amber accuracy label. ≤10m: matcha label.
- Pin placed 1km from user's actual location: assert amber distance warning in bottom sheet.

**🧪 Manual Test (you)**
1. Open "Use map to pick location" from address book.
2. Tap "Use current location" — confirm map animates to your position with blue dot.
3. Pan map to a location inside the café society — confirm "Free delivery" zone badge appears.
4. Pan map to ~3km away — confirm "₹XX delivery fee" zone badge appears.
5. Pan map to ~10km away — confirm "Out of delivery range" and CTA is disabled.
6. Pan to near a society tower — confirm "Looks like you're inside..." hint appears.
7. Confirm a valid location, fill in building + flat — confirm address saves and appears in list.
8. Add the address to checkout — confirm correct delivery fee applied in bill summary.

---

## Phase 38 — Invoice System ✅ COMPLETE

**Goal:** Every order generates a downloadable PDF invoice on the customer side and a staff-facing KOT (Kitchen Order Ticket) with a QR code that — when scanned — advances the order status to `OUT_FOR_DELIVERY` (only if status is currently `READY`). Both are accessible from the order detail screens.

### 38A — API ✅

| # | Task | Files touched | Done when |
|---|------|---------------|-----------|
| 38A.1 ✅ | `pdfmake` + `qrcode` added to `apps/api/package.json`. `InvoiceService.generateCustomerInvoice()` builds A5 PDF with PdfPrinter (Node-native, no browser canvas) | `invoice.service.ts`, `package.json` | Returns Buffer; PDF magic bytes %P |
| 38A.2 ✅ | A5 PDF: CaféConnect header, TAX INVOICE, INV-{orderNumber}, line items table, subtotal/delivery/CGST 2.5%/SGST 2.5%/grandTotal summary, footer | `invoice.service.ts` | GST breakdown correct |
| 38A.3 ✅ | `GET /orders/:id/invoice` — accepts JWT in Authorization header OR `?token=` query param (for Linking.openURL browser download). Streams `application/pdf` | `invoices.controller.ts` | Browser download works; token-as-query accepted |
| 38A.4 ✅ | `KotService.buildKotToken()` — HMAC-SHA256 signed `orderId:iat:sig16`, 1-hour expiry. `generateKOTQRCode()` wraps in QR code, returns base64 PNG | `kot.service.ts` | Token verified; QR PNG valid |
| 38A.5 ✅ | `GET /orders/:id/kot` (STAFF only) — returns `{ qrCodeBase64, orderNumber, items[], customer, address, total, issuedAt, expiresAt }` | `invoices.controller.ts` | STAFF gets data; CUSTOMER gets 403 |
| 38A.6 ✅ | `POST /orders/scan-kot` — rate-limited 10/min via `@nestjs/throttler`. Verifies HMAC token, checks READY status, transitions to OUT_FOR_DELIVERY, emits `order:status` socket event | `invoices.controller.ts` | Valid scan transitions; expired → 401; non-READY → 400 with currentStatus |

### 38B — Staff Web: KOT Screen ✅

| # | Task | Files touched | Done when |
|---|------|---------------|-----------|
| 38B.1 ✅ | "Print KOT" button added to orders page — visible for ACCEPTED/PREPARING/READY orders | `orders/page.tsx` | Button renders; click opens modal |
| 38B.2 ✅ | `KOTModal` component: CaféConnect header, KOT-{orderNumber}, timestamp, items (qty+name, no prices), delivery address, total, 200×200 QR image, "Scan to mark OUT FOR DELIVERY" caption, Print button → `window.print()` | `components/staff/KOTModal.tsx` | QR visible; print dialog works |
| 38B.3 ✅ | `@media print` CSS: hides sidebar/nav/backdrop/buttons; shows only `#kot-print-area` | `globals.css` | Print produces KOT-only output |
| 38B.4 ✅ | Socket event `order:status` from scan-kot already handled by 34B.2 in orders/page.tsx | existing | Live update confirmed by socket |

### 38C — Customer App: Invoice ✅

| # | Task | Files touched | Done when |
|---|------|---------------|-----------|
| 38C.1 ✅ | Using `Linking.openURL` path (38C.3 simpler path chosen); no additional packages needed | — | No peer dep issues |
| 38C.2–38C.3 ✅ | Invoice download: reads token from SecureStore (native) / localStorage (web), builds URL with `?token=`, opens via `Linking.openURL` | `order/[id].tsx` | PDF opens in browser; no crash |
| 38C.4 ✅ | Invoice card: espresso header accent, INV-{orderNumber}, issued date, total, "⬇ Download PDF" button. Visible only for DELIVERED orders | `order/[id].tsx` | Renders correctly |

### 38D — Rider App ✅ (scaffolded)

| # | Task | Files touched | Done when |
|---|------|---------------|-----------|
| 38D.1 ✅ | `expo-camera` with `onBarcodeScanned` in `apps/rider-mobile/package.json` | `package.json`, `app.json` | Camera permission declared |
| 38D.2 ✅ | Active delivery screen with "Scan KOT" button (ASSIGNED state). `CameraView` with `onBarcodeScanned` → `POST /orders/scan-kot`. Success transitions to OUT_FOR_DELIVERY state with toast | `app/active.tsx` | QR scan calls API; status updates |
| 38D.3 ✅ | 3 error cases handled: expired token → "QR code has expired — ask staff to regenerate"; order mismatch → "This QR is for order #X, your active order is #Y"; non-READY → "Order isn't ready yet — current status: {status}" | `app/active.tsx` | All error toasts confirmed |

**🤖 AI Testing**
- `generateCustomerInvoice(orderId)` — assert PDF buffer is valid (check `buffer[0] === 0x25 && buffer[1] === 0x50` — PDF magic bytes `%P`).
- `GET /orders/:id/invoice` — assert response `Content-Type: application/pdf`.
- `generateKOTQRCode(orderId)` — assert base64 PNG string is valid (decode and check PNG header bytes).
- `POST /orders/scan-kot` with valid READY order token — assert status flips to `OUT_FOR_DELIVERY` and `order:status` socket event fires.
- `POST /orders/scan-kot` with PREPARED (not READY) order token — assert 400 with `currentStatus` in response.
- `POST /orders/scan-kot` with expired token (manually set `iat` to 2 hours ago) — assert 401.
- Rider scans wrong-order QR: assert error toast fires and camera closes.

**🧪 Manual Test (you)**
1. Complete an order flow to DELIVERED. Open order tracking → tap "Download Invoice" — confirm PDF downloads and contains correct name, items, GST breakdown.
2. Get an order to READY in staff. Click "Print KOT" → confirm KOT modal opens with QR code and items list.
3. Print the KOT (or screenshot it). Open rider app, go to Active screen, tap "Scan KOT" — scan the QR.
4. Confirm order transitions to OUT_FOR_DELIVERY immediately; staff order detail page updates within 1s (via socket, no refresh).
5. Scan an expired QR (wait 1hr or modify expiry in test) — confirm "QR code has expired" toast.
6. Scan a QR for a different order number than the rider's active delivery — confirm mismatch toast.

---

## Dependency Map for V3

```
V3 phases and their dependencies on MVP + V2:

Phase 34 (Realtime Overhaul)
├── Needs: MVP:13 (Socket.IO gateway), MVP:14.1 (useSocket), V2:24.5 (useOrderTracking)
└── Enables: ALL subsequent V3 phases (push updates for specials, profile changes, invoice status)

Phase 35 (Daily Specials)
├── Needs: MVP:1.5 (DailySpecial model), MVP:4.4 + 4.11 (specials API), V2:21.9 (home screen)
└── Needs: Phase 34 (for 2s live push to customer home)

Phase 36 (Profile + Address Book)
├── Needs: MVP:1.4 (Address model), MVP:8.3–8.5 (address API), V2:23.1–23.2 (address screens)
└── Enables: Phase 37 (map picker needs address book to save into)

Phase 37 (Map Address Picker)
├── Needs: Phase 36 (address book), MVP:8.6 (validate endpoint), V2:27.1 (react-native-maps)
└── Needs: F.2 (haversineKm in shared)

Phase 38 (Invoice + KOT QR)
├── Needs: MVP:12.4 (OrderStatusService), MVP:13.4 (order:status socket), V2:24.4 (order detail screen)
├── Needs: Phase 34 (QR scan must push status update live)
└── Needs: V2:30.2 (rider Active screen for scan button)

Full V3 E2E requires: Phase 34 → 35 → 36 → 37 → 38 in order
```

---

## Consolidated Testing — All V3 Features

### 🤖 AI Testing (run after all V3 phases complete)

- [ ] **Realtime**: All 5 socket events (`order:new`, `order:status`, `menu:item_updated`, `menu:specials_updated`, `cart:updated`) tested — each updates the relevant cache within 2s.
- [ ] **No refresh dependency**: Playwright or scripted test confirms staff dashboard, customer home, and order tracking never require `window.location.reload()` or pull-to-refresh during a normal flow.
- [ ] **Daily Specials**: Special with `availableUntil` in the past excluded from `GET /menu/specials/today` automatically.
- [ ] **Address book**: Setting a new default un-defaults the previous one atomically (check DB, not just API response).
- [ ] **Map picker**: Pin at 8.1km from café → `OUT_OF_ZONE`; pin at 3.2km → `SECONDARY` with correct fee; pin at society tower ±200m → `societyMatch` populated.
- [ ] **Invoice**: PDF passes PDF magic byte check; GST breakdown sums to correct total.
- [ ] **KOT QR**: Valid scan on READY order → `OUT_FOR_DELIVERY` + socket event; expired token → 401; non-READY order → 400 with status.

### 🧪 Manual Test (you) — Full V3 Flow

Run this once on production after all phases deployed:

1. **Realtime check**: Open staff dashboard + customer mobile side by side. Place order → confirm both update within 1s. Staff accepts → customer tracking updates within 1s. Staff adds daily special → customer home shows it within 2s. All without any refresh.

2. **Daily Specials**: Add a special in staff panel with badge "Today only", original ₹250, discounted ₹180. Drag it to top position. Confirm on customer home: correct position, badge shows, price shows correctly. Tap it → adds to cart at ₹180.

3. **Profile + Addresses**: Edit name from profile screen. Add a Home society address + a Work map-picked address. Set Work as default. Confirm home nav bar shows Work address. Delete Work → confirm default is cleared (no automatic re-default).

4. **Map picker**: Pick a location inside the society complex → "Free delivery" zone confirmed. Pick a location 4km away → delivery fee shown. Try to pick 9km away → blocked. Confirm distance-from-user warning when pin is 1km+ from actual device location. Save address, use it in checkout.

5. **Invoice + KOT**: Complete a full order. Download invoice on customer app — confirm PDF with correct items and GST. Print KOT on staff (or screenshot QR). Rider scans QR from printed KOT at café → order moves to OUT_FOR_DELIVERY live on staff dashboard.

6. **If all above passes on production with no developer tools open: CaféConnect v3 ships.**

---

## Notes for Qwen Coder

- Phase 34 must be fully verified (all 🤖 AI tests passing) before any other V3 phase starts. The realtime overhaul affects global behaviour.
- For Phase 37 (Map picker), the floating pin technique (absolute positioned View over MapView) is a known React Native pattern — Qwen Coder should implement it exactly as described, not use a `Marker` component for the draggable pin.
- For Phase 38 QR scan, `expo-barcode-scanner` is deprecated in newer Expo SDKs — use `expo-camera` with `onBarcodeScanned` prop. Specify this in the prompt.
- The `POST /orders/scan-kot` endpoint must be rate-limited (max 10 calls/min per IP) to prevent QR replay attacks. Add this to the 38A.6 prompt explicitly.
