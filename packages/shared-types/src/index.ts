/**
 * Contratos compartidos entre apps/backend y apps/frontend.
 * Este paquete se mantiene libre de dependencias de framework
 * (ni Express ni Angular) para que ambos lados lo puedan importar.
 */

export type ProductCategory = 'Tecnologia' | 'Hogar' | 'Ropa' | 'Alimentos' | 'Juguetes';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  stock: number;
}

export interface CartItemDTO {
  productId: string;
  quantity: number;
}

export interface CheckoutRequestDTO {
  items: CartItemDTO[];
  couponCode?: string;
}

export interface DiscountBreakdownEntry {
  ruleName: string;
  description: string;
  amountApplied: number;
  subtotalAfter: number;
}

export interface CheckoutResponseDTO {
  orderId: string;
  originalSubtotal: number;
  discountBreakdown: DiscountBreakdownEntry[];
  totalDiscountAmount: number;
  effectiveDiscountPercentage: number;
  discountCapReached: boolean;
  finalTotal: number;
  createdAt: string;
}

export type ApiErrorCode =
  | 'EMPTY_CART'
  | 'INVALID_CART_DATA'
  | 'PRODUCT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_COUPON';

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}
