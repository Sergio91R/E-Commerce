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

/**
 * Resultado del cálculo de descuentos SIN efectos secundarios: no valida
 * stock en firme para decrementarlo ni persiste ninguna orden. Se usa para
 * el "preview" en vivo mientras el usuario arma el carrito.
 */
export interface CheckoutPreviewResponseDTO {
  originalSubtotal: number;
  discountBreakdown: DiscountBreakdownEntry[];
  totalDiscountAmount: number;
  effectiveDiscountPercentage: number;
  discountCapReached: boolean;
  finalTotal: number;
}

/**
 * Resultado de una compra CONFIRMADA: además del cálculo, incluye el id de
 * la orden persistida y la fecha de creación. El backend decrementa stock
 * real solo en este flujo, nunca en el preview.
 */
export interface CheckoutResponseDTO extends CheckoutPreviewResponseDTO {
  orderId: string;
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