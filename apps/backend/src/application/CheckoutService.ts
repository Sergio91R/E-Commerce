import { randomUUID } from 'crypto';
import { CartItemDTO, CheckoutResponseDTO } from '@shared/index';
import { ProductRepository } from '../domain/ProductRepository';
import { OrderRepository } from '../domain/Order';
import { DiscountEngine } from '../domain/discounts/DiscountEngine';
import { CartLineSnapshot, roundCurrency } from '../domain/discounts/types';
import { EmptyCartError, InvalidCartDataError, InsufficientStockError, ProductNotFoundError } from '../domain/errors';

export class CheckoutService {
  public constructor(
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
    private readonly discountEngine: DiscountEngine
  ) {}

  public checkout(items: CartItemDTO[], couponCode: string | undefined): CheckoutResponseDTO {
    this.validateCartShape(items);

    const lines = this.resolveLinesAndValidateStock(items);

    const calculation = this.discountEngine.calculate(lines, couponCode);

    for (const item of items) {
      this.productRepository.decrementStock(item.productId, item.quantity);
    }

    const orderId = randomUUID();
    const createdAt = new Date().toISOString();

    this.orderRepository.save({
      orderId,
      items,
      couponCode,
      originalSubtotal: calculation.originalSubtotal,
      discountBreakdown: calculation.breakdown,
      totalDiscountAmount: calculation.totalDiscountAmount,
      effectiveDiscountPercentage: calculation.effectiveDiscountPercentage,
      discountCapReached: calculation.discountCapReached,
      finalTotal: calculation.finalTotal,
      createdAt
    });

    return {
      orderId,
      originalSubtotal: calculation.originalSubtotal,
      discountBreakdown: calculation.breakdown,
      totalDiscountAmount: calculation.totalDiscountAmount,
      effectiveDiscountPercentage: calculation.effectiveDiscountPercentage,
      discountCapReached: calculation.discountCapReached,
      finalTotal: calculation.finalTotal,
      createdAt
    };
  }

  private validateCartShape(items: CartItemDTO[]): void {
    if (!Array.isArray(items) || items.length === 0) {
      throw new EmptyCartError();
    }

    for (const item of items) {
      if (typeof item.productId !== 'string' || item.productId.trim().length === 0) {
        throw new InvalidCartDataError('Cada ítem debe tener un productId válido.');
      }
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new InvalidCartDataError(`La cantidad para '${item.productId}' debe ser un entero positivo.`);
      }
    }
  }

  private resolveLinesAndValidateStock(items: CartItemDTO[]): CartLineSnapshot[] {
    return items.map((item) => {
      const product = this.productRepository.findById(item.productId);
      if (!product) {
        throw new ProductNotFoundError(item.productId);
      }
      if (product.stock < item.quantity) {
        throw new InsufficientStockError(item.productId, item.quantity, product.stock);
      }

      return {
        product,
        quantity: item.quantity,
        lineTotal: roundCurrency(product.price * item.quantity)
      };
    });
  }
}
