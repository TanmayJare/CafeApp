import {
  UserRole,
  AddressType,
  OrderStatus,
  RejectReason,
  PaymentMethod,
  PaymentStatus,
  OptionType,
  DiscountType,
  ZoneType,
} from './enums';

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Address entity
 */
export interface Address {
  id: string;
  userId: string;
  type: AddressType;
  label: string;
  isDefault: boolean;
  // Society fields
  societyName?: string;
  tower?: string;
  wing?: string;
  floor?: string;
  flatNumber?: string;
  // External fields
  addressLine?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Menu item option
 */
export interface MenuItemOption {
  id: string;
  menuItemId: string;
  type: OptionType;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

/**
 * Menu item entity
 */
export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  options?: MenuItemOption[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category entity
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Cart item option (selected by customer)
 */
export interface CartItemOption {
  id: string;
  cartItemId: string;
  optionName: string;
  priceDelta: number;
}

/**
 * Cart item entity
 */
export interface CartItem {
  id: string;
  cartId: string;
  menuItemId: string;
  quantity: number;
  menuItem?: MenuItem;
  options?: CartItemOption[];
}

/**
 * Cart entity
 */
export interface Cart {
  id: string;
  userId: string;
  couponCode?: string;
  items: CartItem[];
  updatedAt: Date;
}

/**
 * Order item (snapshot at order time)
 */
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: Array<{ name: string; priceDelta: number }>;
  lineTotal: number;
}

/**
 * Order status history entry
 */
export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note?: string;
  createdAt: Date;
}

/**
 * Order entity
 */
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  riderId?: string;
  addressId: string;
  status: OrderStatus;
  rejectReason?: RejectReason;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  grandTotal: number;
  couponCode?: string;
  zoneType: ZoneType;
  paymentMethod: PaymentMethod;
  notes?: string;
  customer?: User;
  rider?: User;
  address?: Address;
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  payment?: Payment;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
}

/**
 * Payment entity
 */
export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Daily special entity
 */
export interface DailySpecial {
  id: string;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  availableOn: Date;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Banner entity
 */
export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkType?: string;
  linkId?: string;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Coupon entity
 */
export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiresAt?: Date;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
}

/**
 * Cafe configuration (singleton)
 */
export interface CafeConfig {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  taxRate: number;
  primaryDeliveryFee: number;
  secondaryDeliveryFee: number;
  deliveryRadiusKm: number;
  societyName: string;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
}

/**
 * Society tower entity
 */
export interface SocietyTower {
  id: string;
  name: string;
  wings: string[];
  maxFloors: number;
}

/**
 * Rider profile entity
 */
export interface RiderProfile {
  id: string;
  userId: string;
  isOnline: boolean;
}

/**
 * Rider location tracking
 */
export interface RiderLocation {
  id: string;
  riderId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: Date;
}

/**
 * Notification entity
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

// Made with Bob
