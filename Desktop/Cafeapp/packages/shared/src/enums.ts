/**
 * User roles in the system
 */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  RIDER = 'RIDER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Address types for delivery
 */
export enum AddressType {
  SOCIETY = 'SOCIETY',
  EXTERNAL = 'EXTERNAL',
}

/**
 * Order status lifecycle
 * Full state machine including rider states (even though MVP only uses a subset)
 */
export enum OrderStatus {
  PLACED = 'PLACED',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

/**
 * Reasons for order rejection
 */
export enum RejectReason {
  ITEM_UNAVAILABLE = 'ITEM_UNAVAILABLE',
  KITCHEN_CLOSED = 'KITCHEN_CLOSED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

/**
 * Payment methods supported
 */
export enum PaymentMethod {
  COD = 'COD',
  UPI = 'UPI',
  CARD = 'CARD',
  NET_BANKING = 'NET_BANKING',
  WALLET = 'WALLET',
}

/**
 * Payment transaction status
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Menu item option types
 */
export enum OptionType {
  SIZE = 'SIZE',
  ADDON = 'ADDON',
}

/**
 * Coupon discount types
 */
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

/**
 * Delivery zone types with different fee structures
 */
export enum ZoneType {
  PRIMARY = 'PRIMARY',     // Residential society — lower delivery fee
  SECONDARY = 'SECONDARY', // Within 7 km — standard fee
}

// Made with Bob
