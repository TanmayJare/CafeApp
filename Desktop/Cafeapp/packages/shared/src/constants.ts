import { OrderStatus } from './enums';

/**
 * Order status transition rules
 * Defines which status transitions are allowed from each current status
 * Full state machine including rider states (even though MVP only uses a subset)
 * 
 * Based on IMPLEMENTATION.md Appendix A
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.ASSIGNED],
  [OrderStatus.ASSIGNED]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Check if a status transition is allowed
 */
export function isTransitionAllowed(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get all allowed next statuses for a given current status
 */
export function getAllowedNextStatuses(
  currentStatus: OrderStatus
): OrderStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

// Made with Bob
