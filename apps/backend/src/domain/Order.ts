import { CartItemDTO, DiscountBreakdownEntry } from '@shared/index';

export interface Order {
  orderId: string;
  orderNumber: number;
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

/**
 * Orden lista para persistir, sin el `orderNumber`: ese correlativo lo
 * asigna el repositorio (es responsabilidad del almacenamiento saber cuál
 * es el siguiente) y lo devuelve `save()`.
 */
export type NewOrder = Omit<Order, 'orderNumber'>;

export interface OrderRepository {
  /** Persiste la orden y devuelve el correlativo asignado. */
  save(order: NewOrder): number;
  findById(orderId: string): Order | undefined;
}
