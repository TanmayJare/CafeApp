# CafeConnect MVP

A full-stack food ordering platform built with modern web technologies.

## 🚀 Features

- **Customer Web App**: Browse menu, add items to cart, place orders, track delivery in real-time
- **Staff Dashboard**: Manage orders, update order status, view analytics
- **Real-time Updates**: Socket.IO integration for live order tracking
- **Authentication**: JWT-based auth with OTP verification
- **Payment Integration**: Razorpay payment gateway (in progress)
- **Modern UI**: Figma-based design system with Tailwind CSS v4

## 🏗️ Tech Stack

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: JWT with Passport
- **Real-time**: Socket.IO
- **Validation**: class-validator

### Frontend
- **Customer App**: Next.js 15, React 19
- **Staff Dashboard**: Next.js 15
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **UI Components**: shadcn/ui

### Monorepo
- **Build System**: Turborepo
- **Package Manager**: pnpm
- **Workspaces**: pnpm workspaces

## 📦 Project Structure

```
Cafeapp/
├── apps/
│   ├── api/                 # NestJS backend API
│   ├── customer-web/        # Customer-facing Next.js app
│   └── staff-web/           # Staff dashboard Next.js app
├── packages/
│   ├── database/            # Prisma schema and migrations
│   └── shared/              # Shared types, enums, constants
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # pnpm workspace config
└── turbo.json              # Turborepo config
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL database (or Neon account)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TanmayJare/Cafeapp.git
cd Cafeapp
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:

**Backend (`apps/api/.env`):**
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
RAZORPAY_KEY_ID="your-razorpay-key"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
```

**Database (`packages/database/.env`):**
```env
DATABASE_URL="postgresql://..."
```

4. Run database migrations:
```bash
cd packages/database
pnpm prisma migrate dev
pnpm prisma db seed
```

### Development

Run all apps in development mode:
```bash
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

Access the apps:
- API: http://localhost:3000/api
- Customer Web: http://localhost:3002
- Staff Web: http://localhost:3001

## 🧪 Testing

Run the Phase 1 test suite:
```bash
npx tsx test-phase1.ts
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP and get JWT token
- `GET /api/auth/me` - Get current user info

### Menu
- `GET /api/menu/categories` - Get all categories
- `GET /api/menu/items` - Get all menu items
- `GET /api/menu/items/:id` - Get menu item details
- `GET /api/menu/daily-specials` - Get daily specials

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status (staff only)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove cart item

### Address
- `GET /api/address` - Get user's addresses
- `POST /api/address` - Create new address
- `PUT /api/address/:id` - Update address
- `DELETE /api/address/:id` - Delete address

## 🎨 Design System

The UI follows a Figma-based design system with:
- Consistent color palette
- Typography scale
- Spacing system
- Component library

## 🔐 Authentication Flow

1. User enters email
2. System sends OTP via email
3. User verifies OTP
4. System returns JWT token
5. Token stored in localStorage
6. Token sent in Authorization header for protected routes

## 📊 Order Status Flow

```
PLACED → ACCEPTED → PREPARING → READY → ASSIGNED → OUT_FOR_DELIVERY → DELIVERED
```

## 🚧 Roadmap

- [x] Phase 0-16: Core functionality
- [x] Frontend redesign (Home, Menu, Cart, Order Tracking)
- [x] Bug fixes and testing
- [ ] Complete missing routes (/orders, /menu, /profile)
- [ ] Implement full Figma design system
- [ ] Integrate Razorpay payments
- [ ] Production deployment
- [ ] Mobile app (React Native)

## 👥 Team

- **Developer**: Built with Bob AI Assistant

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.