// Re-export Prisma Client and all generated types
export * from '@prisma/client';

// Explicitly re-export Prisma-generated enums for type safety
export {
  UserRole,
  AddressType,
  OrderStatus,
  RejectReason,
  PaymentMethod,
  PaymentStatus,
  OptionType,
  DiscountType,
  ZoneType,
  PrismaClient,
  Prisma,
} from '@prisma/client';

// Made with Bob
