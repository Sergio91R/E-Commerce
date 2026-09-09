/**
 * Contratos compartidos entre apps/backend y apps/frontend.
 * Este paquete se mantiene libre de dependencias de framework
 * (ni Express ni Angular) para que ambos lados lo puedan importar.
 */

export const PRODUCT_CATEGORIES = ['Tecnologia', 'Hogar', 'Ropa', 'Alimentos', 'Juguetes'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  stock: number;
  /** URL de la foto del producto (ruta local `/assets/...` o URL http). Opcional. */
  imageUrl?: string;
}

/** Cuerpo para crear un producto en el catálogo (`POST /api/products`). */
export type CreateProductRequestDTO = Product;

/**
 * Cuerpo para actualizar un producto (`PUT /api/products/:id`). Todos los
 * campos son opcionales salvo el `id`, que va en la URL. Debe traer al
 * menos uno.
 */
export type UpdateProductRequestDTO = Partial<Omit<Product, 'id'>>;

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
 *
 * - `orderId`: UUID único, estable, para búsquedas / trazabilidad.
 * - `orderNumber`: correlativo legible (1, 2, 3…) para mostrar al usuario.
 */
export interface CheckoutResponseDTO extends CheckoutPreviewResponseDTO {
  orderId: string;
  orderNumber: number;
  createdAt: string;
}

export type ApiErrorCode =
  | 'EMPTY_CART'
  | 'INVALID_CART_DATA'
  | 'PRODUCT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_COUPON'
  | 'PRODUCT_ALREADY_EXISTS'
  | 'INVALID_PRODUCT_DATA';

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}