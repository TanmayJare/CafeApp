# CaféConnect — Delivery & Maps System Build Plan (Single Café Scope)
## Leaflet Map · OpenStreetMap Tiles · OpenRouteService Integration · Live Rider Tracking

This file continues the phased implementation of CafeConnect features, building upon the core v3 feature set, tailored specifically for a single-café application with delivery, in-café management, and billing.

---

## Technical Stack & Configuration

1. **Leaflet & OpenStreetMap**:
   - `leaflet` & `react-leaflet` are used in the customer web app for vector layers, markers, circles, and routes.
   - Map tiles are loaded from OpenStreetMap (OSM) public tile servers: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
   - **Next.js SSR Safety**: Since Leaflet accesses the browser's `window` and `document` objects immediately, all Leaflet components MUST be dynamically imported in Next.js using `next/dynamic` with `{ ssr: false }`.

2. **OpenRouteService (ORS)**:
   - **Geocoding**: `/geocode/search` transforms text queries into coordinates.
   - **Directions/Routing**: `/v2/directions/driving-car` returns route polylines, travel distance, and duration (ETA).
   - **Backend Proxy**: To hide API keys and avoid client-side CORS issues, the frontend (`customer-web`) queries the backend (`apps/api`), which proxies requests to OpenRouteService using the secret `OPENROUTESERVICE_API_KEY`.

3. **Database Configuration**:
   - The application targets a single café branch.
   - The coordinates (Latitude & Longitude) and delivery radius limit are loaded dynamically from the existing `CafeConfig` model (id = "default").

---

## Phase 39 — Database Verification & Seeding

**Goal:** Ensure the existing `CafeConfig` table is populated with accurate coordinates (latitude/longitude) and delivery radius, and verify the DB seed scripts.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 39.1 | Verify the `CafeConfig` model in `packages/database/prisma/schema.prisma` contains `latitude` Float, `longitude` Float, and `deliveryRadiusKm` Float | `packages/database/prisma/schema.prisma` | V3:38A.1 | Fields are present in schema |
| 39.2 | Update the seed file `packages/database/prisma/seed.ts` to ensure the default `CafeConfig` (id: 'default') is populated with correct latitude and longitude (e.g. 19.0760, 72.8777) and deliveryRadiusKm (e.g. 7.0) | `packages/database/prisma/seed.ts` | 39.1 | Seeding creates/updates `CafeConfig` default row |
| 39.3 | Run seed command to populate the local database | none (command run) | 39.2 | Running `pnpm --filter database db:seed` executes cleanly and configures the default café coordinates in DB |

---

## Phase 40 — Backend OpenRouteService Proxy & Configuration

**Goal:** Implement backend endpoints to proxy OpenRouteService geocoding and routing requests safely, and update the address validation logic using `CafeConfig`.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 40.1 | Add `OPENROUTESERVICE_API_KEY` environment variable placeholder to `.env` | `apps/api/.env` | 39.3 | Key is loaded and readable via `process.env.OPENROUTESERVICE_API_KEY` |
| 40.2 | Create `OpenRouteService` in a dedicated NestJS module `maps/` that queries ORS REST API: `/geocode/search?text=...` and `/v2/directions/driving-car?start=...&end=...` with rate-limiting fallback | `apps/api/src/modules/maps/ors.service.ts` | 40.1 | Service successfully fetches data from ORS API using mock/test key |
| 40.3 | Create `MapsModule` (controller, service) with endpoints `GET /maps/geocode?text=...` and `POST /maps/route` (accepts `{ startLat, startLng, endLat, endLng }` and returns polyline GeoJSON, distance, and duration) | `apps/api/src/modules/maps/maps.controller.ts`, `maps.module.ts` | 40.2 | Endpoint responses match standard ORS JSON structures |
| 40.4 | Verify/Update location validation inside `AddressService.validateLocation()`: load the café coordinates and delivery radius from `CafeConfig`, query ORS routing for path distance and duration, compare distance with `deliveryRadiusKm`, and determine availability | `apps/api/src/modules/address/address.service.ts` | 39.3, 40.3 | Validate endpoint returns `{ zoneType, distanceKm, durationSec, allowed: boolean, cafeCoords: { lat, lng }, deliveryRadiusKm }` |

---

## Phase 41 — Leaflet Map Setup in Customer Web

**Goal:** Install map libraries and scaffold a Leaflet React component with browser geolocation capabilities safely integrated with Next.js SSR.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 41.1 | Add `leaflet`, `react-leaflet`, and `@types/leaflet` dependencies to `customer-web` package | `apps/customer-web/package.json` | 40.4 | Dependencies installed without conflict |
| 41.2 | Import Leaflet CSS in `apps/customer-web/app/globals.css` and configure default icon paths/markers mapping (resolves missing leaflet marker icon assets bug) | `apps/customer-web/app/globals.css` | 41.1 | CSS is imported; leaflet custom pin graphics configure correctly |
| 41.3 | Build dynamically imported `MapContainerWrapper` in `apps/customer-web/components/maps/MapPicker.tsx` using `next/dynamic` with `{ ssr: false }` | `apps/customer-web/components/maps/MapPicker.tsx` | 41.2 | Map picks up and renders on client side without "window is not defined" error |
| 41.4 | Add browser geolocation trigger using `navigator.geolocation.getCurrentPosition()`. "Use My Current Location" button centers the map to user coords | `apps/customer-web/components/maps/MapPicker.tsx` | 41.3 | Tapping button requests geolocation permission, centers map, and shows user pin |

---

## Phase 42 — Geocoding Address Search & Radius Display

**Goal:** Display the single café with its delivery radius on the map, and support marker dragging and text geocoding search to pick delivery coordinates.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 42.1 | On map load, query `GET /address/validate` or a configuration endpoint to fetch the single café's coordinates and delivery radius. Render a Leaflet marker at the café coordinates | `apps/customer-web/components/maps/MapPicker.tsx` | 40.4, 41.4 | Café marker appears on map at exact coordinates |
| 42.2 | Draw a transparent Leaflet `Circle` around the café marker matching its `deliveryRadius` (color matches brand styling, e.g., Matcha Green) | `apps/customer-web/components/maps/MapPicker.tsx` | 42.1 | Delivery range circle renders correctly on the map |
| 42.3 | Render customer destination marker: support dragging the marker, or clicking anywhere on the map to re-position the marker. Update lat/lng state | `apps/customer-web/components/maps/MapPicker.tsx` | 41.4 | Customer pin coordinate values update dynamically on drag-end or map-click |
| 42.4 | Create Geocoding Address Search input field. Query `/api/maps/geocode?text=...` on keypress, display suggestions in a dropdown list | `apps/customer-web/components/maps/AddressSearch.tsx` | 40.3, 41.3 | Typing address displays list of matches |
| 42.5 | Handle search selection: pan the map to selected coordinates and move the customer pin there | `apps/customer-web/components/maps/MapPicker.tsx`, `AddressSearch.tsx` | 42.4 | Selecting a search item updates map center and pin coordinates |

---

## Phase 43 — Routing Polyline, ETA & Availability Checks

**Goal:** Fetch route path details between the café and customer location, draw the polyline route, and validate ordering availability.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 43.1 | Debounce coordinate updates (user pin movement) by 500ms. Call `/api/maps/route` with `{ startLat: cafe.lat, startLng: cafe.lng, endLat: user.lat, endLng: user.lng }` | `apps/customer-web/components/maps/MapPicker.tsx` | 40.3, 42.3 | API is queried on pin release with start and end coords |
| 43.2 | Render the road route coordinates returned by the API as a Leaflet `Polyline` connecting the café and customer pin | `apps/customer-web/components/maps/MapPicker.tsx` | 43.1 | Polyline displays on the map tracing road curves |
| 43.3 | Display route distance and ETA (converted from seconds to minutes) inside a floating widget below the map | `apps/customer-web/components/maps/MapPicker.tsx` | 43.2 | Summary shows e.g., "5.4 km - 14 mins" in real time |
| 43.4 | Perform dynamic validation: if distance > café's delivery range, show "Delivery Unavailable: out of range" notice in red; disable address saving | `apps/customer-web/components/maps/MapPicker.tsx` | 40.4, 43.3 | Saving is disabled and warning displays when customer pin is outside the range circle |
| 43.5 | On confirmation, save the geocoded address, building/flat details, and the selected lat/lng coordinates to the address list | `apps/customer-web/app/addresses/new/page.tsx` | 36C.5, 43.4 | Clicking Save saves to database and redirects to Checkout/Address list |

---

## Phase 44 — Live Rider Location Tracking

**Goal:** Establish a real-time order tracking map displaying the delivery rider's live position using Socket.IO events relative to the café and customer.

| # | Task | Files touched | Depends on | Done when |
|---|------|---------------|------------|-----------|
| 44.1 | Create a Leaflet-enabled order tracking page `apps/customer-web/app/orders/[id]/track/page.tsx` with dynamic imports | `apps/customer-web/app/orders/[id]/track/page.tsx` | 41.3 | Page loads tracking map cleanly |
| 44.2 | Connect to Socket.IO order tracking gateway and join `order:{orderId}` room on mounting | `apps/customer-web/app/orders/[id]/track/page.tsx` | V3:34A.5, 44.1 | Client successfully joins order socket room |
| 44.3 | Listen to `rider:location` updates. Keep a state for `riderCoords` containing `{ latitude, longitude, speed }` | `apps/customer-web/app/orders/[id]/track/page.tsx` | 44.2 | State updates automatically when coordinates are pushed |
| 44.4 | Render a custom rider marker (e.g. customized delivery vehicle marker icon) on the map and animate marker coordinates on update | `apps/customer-web/app/orders/[id]/track/page.tsx` | 44.3 | Rider marker moves smoothly across the map without page refreshes |

---

## E2E Verification Plan

### 🤖 Automated Tests
- Test `/api/maps/geocode` returns valid JSON with coordinate arrays.
- Test `/api/maps/route` returns a valid routing payload with polyline details, distance, and duration.
- Test `/api/address/validate` handles both in-range and out-of-range coordinates relative to `CafeConfig`.

### 🧪 Manual Verification Steps
1. Navigate to `/addresses/new` inside `customer-web`.
2. Verify "Use current location" centers map on user's browser location.
3. Search for a location in the search bar and verify map pans to coordinate.
4. Drag marker inside the café's delivery range circle. Verify circle renders, route polyline shows, ETA updates, and ordering is enabled.
5. Drag marker outside the café's delivery range circle. Verify "Delivery Unavailable" message renders and save button is disabled.
6. Place an order, navigate to tracking page `/orders/:id/track`. Connect rider mock simulator, push coordinate updates, and verify rider marker moves dynamically on the map.
