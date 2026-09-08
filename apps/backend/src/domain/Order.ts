import { CartItemDTO, DiscountBreakdownEntry } from '@shared/index';

export interface Order {
  orderId: string;
  items: CartItemDTO[];
  couponCode?: string;
  originalSubtotal: number;
  discountBreakdown: DiscountBreakdownEntry[];
  totalDiscountAmount: number;
  effectiveDiscountPercentage: number;
  discountCapReached: boolean;
  finalTotal: number;
  createdAt: string;
}

export interface OrderRepository {
  save(order: Order): void;
  findById(orderId: string): Order | undefined;
}
