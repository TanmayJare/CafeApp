# CafeConnect Troubleshooting Guide

## Root Cause Analysis Summary

### Issues Identified and Fixed

#### 1. Missing Environment Configuration ✅ FIXED
**Problem:** No `.env` file existed in the project root, causing the API to fail on startup due to missing required environment variables.

**Root Cause:** 
- JWT_SECRET was undefined
- DATABASE_URL was not configured
- NODE_ENV was not set

**Solution:** Created `.env` file with all required configuration variables.

**Files Modified:**
- Created: `Desktop/Cafeapp/.env`

---

#### 2. Test Script Field Name Mismatch ✅ FIXED
**Problem:** `test-menu-api.ps1` was using incorrect field names for the verify-otp endpoint.

**Root Cause:**
- Test script used `otp` field, but DTO expects `code`
- Test script expected `access_token` in response, but API returns `accessToken`

**Solution:** Updated test script to use correct field names.

**Files Modified:**
- Modified: `Desktop/Cafeapp/test-menu-api.ps1` (lines 65, 71)

**Changes:**
```powershell
# Before:
otp = "123456"
$token = $authResponse.access_token

# After:
code = "123456"
$token = $authResponse.accessToken
```

---

#### 3. Database Not Initialized ⚠️ REQUIRES ACTION
**Problem:** Prisma client not generated and database schema not pushed.

**Root Cause:**
- Fresh clone/setup without running database initialization
- No seed data in database

**Solution:** Run database setup commands:
```powershell
pnpm --filter @cafeconnect/database db:generate
pnpm --filter @cafeconnect/database db:push
pnpm --filter @cafeconnect/database db:seed
```

Or use the automated setup script:
```powershell
.\setup.ps1
```

---

## API Route Configuration

The API is correctly configured with the following structure:

### Global Prefix
- **Prefix:** `/api`
- **Configured in:** `apps/api/src/main.ts` (line 30)

### Available Routes

#### Health Check (Public)
- `GET /api/health` - Returns API health status

#### Authentication Routes (Public)
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP and get JWT token
- `GET /api/auth/me` - Get current user profile (requires JWT)

#### Menu Routes (Public Read, Staff Write)
**Public Endpoints:**
- `GET /api/menu/categories` - Get all categories
- `GET /api/menu/categories/:id` - Get category by ID
- `GET /api/menu/items` - Get all menu items (optional: ?categoryId=xxx)
- `GET /api/menu/items/:id` - Get menu item by ID
- `GET /api/menu/daily-specials` - Get daily specials (optional: ?date=YYYY-MM-DD)

**Staff-Only Endpoints (require JWT + STAFF/SUPER_ADMIN role):**
- `POST /api/menu/categories` - Create category
- `PUT /api/menu/categories/:id` - Update category
- `DELETE /api/menu/categories/:id` - Delete category
- `POST /api/menu/items` - Create menu item
- `PUT /api/menu/items/:id` - Update menu item
- `DELETE /api/menu/items/:id` - Delete menu item
- `PATCH /api/menu/items/:id/toggle-availability` - Toggle item availability
- `POST /api/menu/daily-specials` - Create daily special
- `PUT /api/menu/daily-specials/:id` - Update daily special
- `DELETE /api/menu/daily-specials/:id` - Delete daily special

---

## Common Issues and Solutions

### Issue: 404 Errors on All Endpoints

**Symptoms:**
- All API endpoints return 404
- Test scripts fail with "Cannot GET /api/..."

**Possible Causes:**
1. API server not running
2. Wrong port (should be 3000)
3. Database connection failed
4. Missing environment variables

**Solutions:**
1. Start the API server:
   ```powershell
   cd apps/api
   pnpm start:dev
   ```

2. Check if server is running on correct port:
   - Should see: `🚀 API running on http://localhost:3000/api`

3. Verify `.env` file exists and contains DATABASE_URL

4. Check database connection:
   ```powershell
   pnpm --filter @cafeconnect/database db:push
   ```

---

### Issue: Prisma Client Not Found

**Symptoms:**
- Error: `Cannot find module '@prisma/client'`
- API fails to start

**Solution:**
```powershell
pnpm --filter @cafeconnect/database db:generate
```

---

### Issue: Database Connection Failed

**Symptoms:**
- Error: `Can't reach database server`
- API starts but crashes on first request

**Solutions:**
1. Ensure PostgreSQL is running on localhost:5432
2. Verify DATABASE_URL in `.env` file
3. Check database credentials
4. Create database if it doesn't exist:
   ```sql
   CREATE DATABASE cafeconnect;
   ```

---

### Issue: JWT Token Invalid

**Symptoms:**
- 401 Unauthorized on protected endpoints
- "Invalid token" errors

**Solutions:**
1. Verify JWT_SECRET is set in `.env`
2. Get a fresh token by calling `/api/auth/verify-otp`
3. Include token in Authorization header:
   ```
   Authorization: Bearer <your-token>
   ```

---

### Issue: OTP Verification Fails

**Symptoms:**
- "Invalid or expired OTP" error
- Cannot authenticate

**Solutions:**
1. In development, OTP is always `123456`
2. Ensure NODE_ENV=development in `.env`
3. Check that user exists in database (run seed script)
4. OTP expires after 10 minutes - request a new one

---

## Test Credentials

After running the seed script, these test users are available:

| Email | Role | OTP (dev) |
|-------|------|-----------|
| staff@cafe.test | STAFF | 123456 |
| rider@cafe.test | RIDER | 123456 |
| admin@cafe.test | SUPER_ADMIN | 123456 |
| customer@test.com | CUSTOMER | 123456 |

---

## Quick Start Commands

### Initial Setup
```powershell
# Run automated setup
.\setup.ps1

# OR manually:
pnpm install
pnpm --filter @cafeconnect/database db:generate
pnpm --filter @cafeconnect/database db:push
pnpm --filter @cafeconnect/database db:seed
```

### Start API Server
```powershell
cd apps/api
pnpm start:dev
```

### Run Tests
```powershell
# Basic API tests
.\test-api.ps1

# Menu API tests
.\test-menu-api.ps1

# Order flow tests
.\test-order-flow.ps1
```

### Database Management
```powershell
# Open Prisma Studio (database GUI)
pnpm --filter @cafeconnect/database db:studio

# Reset database
pnpm --filter @cafeconnect/database db:push --force-reset
pnpm --filter @cafeconnect/database db:seed
```

---

## Architecture Overview

### Monorepo Structure
```
CafeConnect/
├── apps/
│   ├── api/              # NestJS API server
│   ├── customer-web/     # Next.js customer app
│   └── staff-web/        # Next.js staff app
├── packages/
│   ├── database/         # Prisma schema & client
│   └── shared/           # Shared types & constants
└── tests/                # Integration tests
```

### Technology Stack
- **API:** NestJS + Express
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT + OTP (email-based)
- **Frontend:** Next.js 14 (App Router)
- **Package Manager:** PNPM (workspace)
- **Monorepo:** Turborepo

---

## Module Registration

All modules are properly registered in `apps/api/src/app.module.ts`:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,      // Database connection
    AuthModule,        // Authentication & OTP
    MenuModule,        // Menu management
    CartModule,        // Shopping cart
    AddressModule,     // Address management
    OrdersModule,      // Order processing
    PaymentsModule,    // Payment integration
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

All controllers are properly registered in their respective modules.

---

## Support

If issues persist after following this guide:

1. Check the console output for specific error messages
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is running and accessible
4. Try resetting the database and re-seeding
5. Check that all dependencies are installed (`pnpm install`)

For additional help, refer to:
- NestJS Documentation: https://docs.nestjs.com
- Prisma Documentation: https://www.prisma.io/docs
- Next.js Documentation: https://nextjs.org/docs