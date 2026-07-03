# CafeConnect MVP - Project Memory

## 📋 Project Overview

**Project Name**: CafeConnect MVP  
**Type**: Full-stack food ordering platform  
**Architecture**: Monorepo (Turborepo + pnpm workspaces)  
**Status**: Phase 0-16 Complete, Frontend Redesign Complete, Testing Phase  
**Repository**: https://github.com/TanmayJare/CafeApp (pending push)

---

## 🏗️ Tech Stack

### Backend (apps/api)
- **Framework**: NestJS 10.x
- **Database**: PostgreSQL (Neon Cloud)
- **ORM**: Prisma 5.x
- **Authentication**: JWT with Passport.js
- **Real-time**: Socket.IO 4.x
- **Validation**: class-validator, class-transformer
- **Email**: Nodemailer (Ethereal for testing)
- **Payment**: Razorpay (integration in progress)

### Frontend - Customer Web (apps/customer-web)
- **Framework**: Next.js 15 (App Router)
- **React**: 19.x
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand with persist middleware
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

### Frontend - Staff Web (apps/staff-web)
- **Framework**: Next.js 15 (App Router)
- **React**: 19.x
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

### Shared Packages
- **packages/database**: Prisma schema, migrations, seed data
- **packages/shared**: TypeScript types, enums, constants

---

## 🗂️ Project Structure

```
Cafeapp/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # JWT + OTP authentication
│   │   │   │   ├── menu/            # Menu items & categories
│   │   │   │   ├── cart/            # Shopping cart
│   │   │   │   ├── orders/          # Order management + Socket.IO
│   │   │   │   ├── address/         # Delivery addresses
│   │   │   │   ├── payments/        # Razorpay integration
│   │   │   │   └── prisma/          # Database service
│   │   │   ├── common/
│   │   │   │   ├── guards/          # JWT & Role guards
│   │   │   │   └── decorators/      # Custom decorators
│   │   │   └── main.ts              # Entry point (port 3000)
│   │   └── test/                     # E2E tests
│   │
│   ├── customer-web/                 # Customer App (port 3002)
│   │   ├── app/
│   │   │   ├── page.tsx             # Home (Figma redesign ✅)
│   │   │   ├── login/               # OTP login
│   │   │   ├── menu/[id]/           # Menu detail (Figma redesign ✅)
│   │   │   ├── cart/                # Cart (Figma redesign ✅)
│   │   │   ├── checkout/            # Checkout flow
│   │   │   ├── orders/[id]/         # Order tracking (Figma redesign ✅)
│   │   │   └── addresses/new/       # Add address
│   │   └── lib/
│   │       ├── api.ts               # Axios instance
│   │       ├── auth-store.ts        # Auth state
│   │       └── cart-store.ts        # Cart state (Zustand + persist)
│   │
│   └── staff-web/                    # Staff Dashboard (port 3001)
│       ├── src/app/
│       │   ├── (auth)/login/        # Staff login
│       │   └── (staff)/
│       │       ├── dashboard/       # Analytics
│       │       ├── orders/          # Order management
│       │       └── menu/            # Menu management
│       └── src/lib/
│           ├── api.ts               # Axios instance
│           └── auth-store.ts        # Auth state
│
├── packages/
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema
│   │   │   └── seed.ts              # Seed data
│   │   └── .env                     # DATABASE_URL
│   │
│   └── shared/
│       └── src/
│           ├── types.ts             # Shared TypeScript types
│           ├── enums.ts             # OrderStatus, UserRole, etc.
│           └── constants.ts         # App constants
│
├── test-phase1.ts                    # E2E test suite (100% pass rate)
├── restart-servers.ps1               # Server management script
└── README.md                         # Project documentation
```

---

## 🔑 Key Configuration

### Environment Variables

**Backend (.env in apps/api/)**
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

**Database (.env in packages/database/)**
```env
DATABASE_URL="postgresql://..."
```

### API Configuration
- **Base URL**: `http://localhost:3000/api`
- **CORS**: Enabled for localhost:3001, localhost:3002
- **Socket.IO Namespace**: `/orders`
- **JWT Expiry**: 7 days

### Frontend Configuration
- **Customer Web**: http://localhost:3002
- **Staff Web**: http://localhost:3001
- **API Base URL**: http://localhost:3000/api (configured in axios)

---

## 🔐 Authentication System

### Flow
1. User enters email → `POST /api/auth/send-otp`
2. System generates 6-digit OTP, stores in DB with 10min expiry
3. OTP sent via email (Ethereal for testing)
4. User verifies OTP → `POST /api/auth/verify-otp`
5. System returns JWT token with user data
6. Token stored in localStorage
7. Token sent in `Authorization: Bearer <token>` header

### JWT Payload
```typescript
{
  sub: string;      // User ID
  email: string;
  role: UserRole;   // CUSTOMER | STAFF | RIDER | ADMIN
  name: string;
  iat: number;
  exp: number;
}
```

### Protected Routes
- JWT Guard: Validates token
- Roles Guard: Checks user role
- Strategy returns: `{ id, email, role, name }`

---

## 📊 Database Schema (Prisma)

### Core Models
- **User**: Authentication, profile
- **OTP**: One-time passwords for login
- **Category**: Menu categories
- **MenuItem**: Food items with pricing
- **DailySpecial**: Featured items
- **Cart**: User shopping cart
- **CartItem**: Items in cart
- **Address**: Delivery addresses
- **Order**: Customer orders
- **OrderItem**: Items in order
- **Payment**: Payment records

### Key Relations
- User → Cart (1:1)
- User → Address (1:N)
- User → Order (1:N)
- Order → OrderItem (1:N)
- Order → Payment (1:1)
- MenuItem → CartItem (1:N)
- MenuItem → OrderItem (1:N)

---

## 🔄 Order Status Flow

```
PLACED → ACCEPTED → PREPARING → READY → ASSIGNED → OUT_FOR_DELIVERY → DELIVERED
```

### Role Permissions
- **CUSTOMER**: Can create orders, view own orders
- **STAFF**: Can update status up to READY
- **RIDER**: Can update to OUT_FOR_DELIVERY and DELIVERED
- **ADMIN**: Full access

### Real-time Updates (Socket.IO)
- **Namespace**: `/orders`
- **Events**:
  - `new-order`: Emitted to staff room when order placed
  - `order-status-update`: Emitted to order room when status changes
- **Rooms**:
  - `staff`: All staff members
  - `order-{orderId}`: Specific order tracking

---

## 🎨 Frontend Design System (Figma-based)

### Completed Pages
1. ✅ **Home Page** (apps/customer-web/app/page.tsx)
   - Hero section with CTA
   - Featured categories
   - Daily specials carousel
   - Popular items grid

2. ✅ **Menu Item Detail** (apps/customer-web/app/menu/[id]/page.tsx)
   - Item image and details
   - Customization options
   - Add to cart functionality
   - Related items

3. ✅ **Cart Page** (apps/customer-web/app/cart/page.tsx)
   - Cart items list
   - Quantity controls
   - Price breakdown
   - Checkout button

4. ✅ **Order Tracking** (apps/customer-web/app/orders/[id]/page.tsx)
   - Real-time status updates
   - Order timeline
   - Item details
   - Delivery info

### Design Tokens
- **Colors**: Primary, secondary, accent, neutral palette
- **Typography**: Font families, sizes, weights
- **Spacing**: 4px base unit system
- **Shadows**: Elevation levels
- **Border Radius**: Consistent rounding

---

## 🐛 Known Issues & Fixes

### Issue 1: Staff Panel 404 Error ✅ FIXED
**Problem**: Double `/api` prefix in API calls  
**Cause**: axios baseURL already includes `/api`  
**Fix**: Removed `/api` prefix from endpoint paths  
**File**: `apps/staff-web/src/app/(staff)/orders/page.tsx` (line 138)

### Issue 2: Address Creation 500 Error ✅ FIXED
**Problem**: `req.user.userId` undefined  
**Cause**: JWT strategy returns `id`, not `userId`  
**Fix**: Changed all `req.user.userId` to `req.user.id`  
**Files**: `apps/api/src/modules/address/address.controller.ts` (lines 25, 30, 35, 44, 49)

### Issue 3: Order Creation 400 Error ✅ FIXED
**Problem**: Validation error - `customizations` field not in DTO  
**Cause**: Frontend sending unsupported field  
**Fix**: Removed `customizations` from order payload  
**File**: `apps/customer-web/app/checkout/page.tsx` (line 91)

### Issue 4: Order Status Update 400 Error ✅ FIXED
**Problem**: Invalid enum value CONFIRMED  
**Cause**: Using wrong enum value  
**Fix**: Changed CONFIRMED to ACCEPTED  
**File**: `test-phase1.ts`

### Issue 5: Staff Role Permission Error ✅ FIXED
**Problem**: Staff can't set OUT_FOR_DELIVERY status  
**Cause**: Only RIDER role can set this status  
**Fix**: Limited staff test to READY status  
**File**: `test-phase1.ts`

### Issue 6: Socket.IO Connection Error ✅ FIXED
**Problem**: WebSocket connection errors in staff-web and customer-web
**Cause 1**: Client `transports` order was `['websocket', 'polling']` — Socket.IO must do polling handshake first
**Cause 2**: Gateway `@WebSocketGateway` was missing `methods` and `transports` config
**Fix**:
- Changed client transport order to `['polling', 'websocket']` + `withCredentials: true`
- Added `methods: ['GET', 'POST']` and `transports: ['polling', 'websocket']` to gateway decorator
**Files**:
- `apps/staff-web/src/app/(staff)/orders/page.tsx`
- `apps/customer-web/app/orders/[id]/page.tsx`
- `apps/api/src/modules/orders/orders.gateway.ts`

---

## 🧪 Testing

### Test Suite: test-phase1.ts
**Status**: ✅ 100% Pass Rate (16/16 tests)

**Test Coverage**:
1. ✅ Health check
2. ✅ Customer OTP send
3. ✅ Customer OTP verify
4. ✅ Staff OTP send
5. ✅ Staff OTP verify
6. ✅ Fetch menu categories
7. ✅ Fetch menu items
8. ✅ Create address
9. ✅ Create order
10. ✅ Fetch order details
11. ✅ Update order status (ACCEPTED)
12. ✅ Update order status (PREPARING)
13. ✅ Update order status (READY)
14. ✅ Customer web accessibility
15. ✅ Staff web accessibility
16. ✅ API health check

### Manual Testing Checklist
- [ ] Complete order flow (customer → staff → delivery)
- [ ] Real-time order updates
- [ ] Cart persistence
- [ ] Address management
- [ ] Menu item availability toggle
- [ ] Payment integration
- [ ] Mobile responsiveness

---

## 🚀 Development Workflow

### Starting Servers
```powershell
# Terminal 1 - API
cd apps/api
pnpm run start:dev

# Terminal 2 - Customer Web
cd apps/customer-web
pnpm run dev

# Terminal 3 - Staff Web
cd apps/staff-web
pnpm run dev
```

### Restarting Servers
```powershell
# Kill all Node processes
.\restart-servers.ps1

# Then restart manually
```

### Database Operations
```bash
# Generate Prisma Client
cd packages/database
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed database
pnpm prisma db seed

# Open Prisma Studio
pnpm prisma studio
```

### Running Tests
```bash
# E2E test suite
npx tsx test-phase1.ts

# API tests
cd apps/api
pnpm test:e2e
```

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP, get JWT
- `GET /api/auth/me` - Get current user (protected)

### Menu
- `GET /api/menu/categories` - List categories
- `GET /api/menu/categories/:id` - Get category
- `GET /api/menu/items` - List menu items (with filters)
- `GET /api/menu/items/:id` - Get menu item
- `GET /api/menu/daily-specials` - Get daily specials
- `POST /api/menu/categories` - Create category (staff)
- `POST /api/menu/items` - Create menu item (staff)
- `PUT /api/menu/items/:id` - Update menu item (staff)
- `PATCH /api/menu/items/:id/toggle-availability` - Toggle availability (staff)

### Cart
- `GET /api/cart` - Get user's cart (protected)
- `GET /api/cart/summary` - Get cart summary (protected)
- `POST /api/cart/items` - Add item to cart (protected)
- `PUT /api/cart/items/:id` - Update cart item (protected)
- `DELETE /api/cart/items/:id` - Remove cart item (protected)
- `DELETE /api/cart` - Clear cart (protected)

### Orders
- `POST /api/orders` - Create order (customer)
- `GET /api/orders` - List orders (filtered by role)
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status (staff/rider)
- `DELETE /api/orders/:id` - Cancel order (customer, if PLACED)

### Address
- `POST /api/address` - Create address (protected)
- `GET /api/address` - List user addresses (protected)
- `GET /api/address/:id` - Get address (protected)
- `PUT /api/address/:id` - Update address (protected)
- `PATCH /api/address/:id/set-default` - Set default address (protected)
- `DELETE /api/address/:id` - Delete address (protected)

### Payments
- `POST /api/payments/create-order` - Create Razorpay order (protected)
- `POST /api/payments/verify` - Verify payment (protected)

---

## 🔧 Common Issues & Solutions

### Issue: Port Already in Use
```powershell
# Kill all Node processes
.\restart-servers.ps1
```

### Issue: Prisma Client Out of Sync
```bash
cd packages/database
pnpm prisma generate
```

### Issue: Database Connection Error
- Check DATABASE_URL in .env files
- Verify Neon database is accessible
- Check network/firewall settings

### Issue: JWT Token Invalid
- Check JWT_SECRET matches in .env
- Verify token expiry (7 days)
- Clear localStorage and re-login

### Issue: CORS Error
- Verify origin in main.ts CORS config
- Check frontend URL matches allowed origins

---

## 📋 TODO List

### High Priority
- [x] Fix Socket.IO connection errors in staff-web ✅
- [x] Create missing routes: /orders, /menu, /profile (customer-web) ✅
- [ ] Complete Razorpay payment integration
- [ ] Implement full Figma design system across all pages

### Medium Priority
- [ ] Add error boundaries
- [ ] Implement loading states
- [ ] Add form validation feedback
- [ ] Create 404 and error pages
- [ ] Add toast notifications
- [ ] Implement search functionality

### Low Priority
- [ ] Add unit tests
- [ ] Set up CI/CD pipeline
- [ ] Add API rate limiting
- [ ] Implement caching (Redis)
- [ ] Add analytics tracking
- [ ] Create admin dashboard

### Future Enhancements
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Advanced analytics
- [ ] Loyalty program

---

## 🎯 Phase Completion Status

- ✅ **Phase 0**: Project setup, monorepo configuration
- ✅ **Phase 1-5**: Database schema, Prisma setup
- ✅ **Phase 6-10**: Backend API (NestJS modules)
- ✅ **Phase 11-13**: Customer web app
- ✅ **Phase 14-15**: Staff web dashboard
- ✅ **Phase 16**: Real-time features (Socket.IO)
- ✅ **Frontend Redesign**: Home, Menu Detail, Cart, Order Tracking
- ✅ **Bug Fixes**: API paths, validation, enum values
- ✅ **Testing**: 100% pass rate on E2E tests
- 🔄 **Git Integration**: Repository initialized, pending push
- ⏳ **Payments**: Razorpay integration in progress
- ⏳ **Production**: Deployment pending

---

## 📞 Support & Resources

### Documentation
- NestJS: https://docs.nestjs.com
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Socket.IO: https://socket.io/docs
- Tailwind CSS: https://tailwindcss.com/docs

### Test Accounts
**Customer**:
- Email: customer@test.com
- OTP: Check Ethereal email

**Staff**:
- Email: staff@test.com
- OTP: Check Ethereal email

### Ethereal Email
- URL: https://ethereal.email
- Check console for preview links

---

## 📊 Project Metrics

- **Total Files**: 152
- **Lines of Code**: ~29,000+
- **Commits**: 2
- **Test Coverage**: 16/16 tests passing
- **Development Time**: Phase 0-16 complete
- **Tech Debt**: Low (recent refactoring)

---

## 🔄 Recent Changes (Last 24 Hours)

1. Fixed order creation validation error (removed customizations field)
2. Created comprehensive README.md
3. Initialized Git repository
4. Committed all project files
5. Identified Socket.IO connection issue in staff-web

---

## 💡 Best Practices

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write descriptive commit messages

### API Design
- RESTful endpoints
- Consistent error responses
- Proper HTTP status codes
- Request validation with DTOs

### Security
- JWT for authentication
- Role-based access control
- Input validation
- SQL injection prevention (Prisma)
- XSS protection

### Performance
- Database indexing
- Lazy loading
- Code splitting
- Image optimization
- Caching strategies

---

**Last Updated**: 2026-06-25  
**Maintained By**: Development Team  
**Version**: 1.0.0-beta