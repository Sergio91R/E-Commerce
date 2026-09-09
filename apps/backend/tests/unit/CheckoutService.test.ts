import { CheckoutService } from '../../src/application/CheckoutService';
import { InMemoryProductRepository } from '../../src/domain/ProductRepository';
import { InMemoryCouponRepository } from '../../src/domain/discounts/CouponRepository';
import { DiscountRuleFactory } from '../../src/domain/discounts/DiscountRuleFactory';
import { DiscountEngine } from '../../src/domain/discounts/DiscountEngine';
import { OrderRepository, Order } from '../../src/domain/Order';
import {
  EmptyCartError,
  InvalidCartDataError,
  InsufficientStockError,
  ProductNotFoundError
} from '../../src/domain/errors';
import { Product } from '@shared/index';

class InMemoryOrderRepository implements OrderRepository {
  public readonly saved: Order[] = [];
  public save(order: Order): void {
    this.saved.push(order);
  }
  public findById(orderId: string): Order | undefined {
    return this.saved.find((o) => o.orderId === orderId);
  }
}

const seed: Product[] = [
  { id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 2 },
  { id: 'p6', name: 'Camiseta', price: 15, category: 'Ropa', stock: 0 }
];

function buildService() {
  const productRepository = new InMemoryProductRepository(seed);
  const orderRepository = new InMemoryOrderRepository();
  const couponRepository = new InMemoryCouponRepository();
  const engine = new DiscountEngine(DiscountRuleFactory.createSequentialRules(couponRepository));
  const service = new CheckoutService(productRepository, orderRepository, engine);
  return { service, productRepository, orderRepository };
}

describe('CheckoutService - validaciones y edge cases', () => {
  it('rechaza un carrito vacío', () => {
    const { service } = buildService();
    expect(() => service.checkout([], undefined)).toThrow(EmptyCartError);
  });

  it('rechaza datos de carrito corruptos (cantidad no numérica o negativa)', () => {
    const { service } = buildService();
    expect(() =>
      service.checkout([{ productId: 'p1', quantity: -1 }], undefined)
    ).toThrow(InvalidCartDataError);

    expect(() =>
      // @ts-expect-error: simula payload corrupto desde el cliente
      service.checkout([{ productId: 'p1', quantity: 'dos' }], undefined)
    ).toThrow(InvalidCartDataError);
  });

  it('rechaza un producto que no existe en el catálogo', () => {
    const { service } = buildService();
    expect(() => service.checkout([{ productId: 'inexistente', quantity: 1 }], undefined)).toThrow(
      ProductNotFoundError
    );
  });

  it('rechaza intentos de compra sin stock suficiente', () => {
    const { service } = buildService();
    expect(() => service.checkout([{ productId: 'p6', quantity: 1 }], undefined)).toThrow(
      InsufficientStockError
    );
    expect(() => service.checkout([{ productId: 'p1', quantity: 3 }], undefined)).toThrow(
      InsufficientStockError
    );
  });

  it('decrementa el stock tras un checkout exitoso', () => {
    const { service, productRepository } = buildService();
    service.checkout([{ productId: 'p1', quantity: 1 }], undefined);
    expect(productRepository.findById('p1')?.stock).toBe(1);
  });

  it('persiste la orden con el desglose de descuentos y un orderId único', () => {
    const { service, orderRepository } = buildService();
    const response = service.checkout([{ productId: 'p1', quantity: 1 }], 'WELCOME2026');

    expect(orderRepository.saved).toHaveLength(1);
    expect(orderRepository.saved[0].orderId).toBe(response.orderId);
    expect(response.discountBreakdown.length).toBeGreaterThan(0);
  });
});

describe('CheckoutService - calculatePreview (sin efectos secundarios)', () => {
  it('calcula el mismo desglose que checkout() pero sin decrementar stock', () => {
    const { service, productRepository } = buildService();
    const preview = service.calculatePreview([{ productId: 'p1', quantity: 1 }], 'WELCOME2026');

    expect(preview.finalTotal).toBeGreaterThan(0);
    expect(preview.discountBreakdown.length).toBeGreaterThan(0);
    expect(productRepository.findById('p1')?.stock).toBe(2); // stock intacto
  });

  it('no persiste ninguna orden', () => {
    const { service, orderRepository } = buildService();
    service.calculatePreview([{ productId: 'p1', quantity: 1 }], undefined);
    expect(orderRepository.saved).toHaveLength(0);
  });

  it('sigue validando carrito vacío, stock y cupón igual que checkout()', () => {
    const { service } = buildService();
    expect(() => service.calculatePreview([], undefined)).toThrow(EmptyCartError);
    expect(() => service.calculatePreview([{ productId: 'p1', quantity: 99 }], undefined)).toThrow(
      InsufficientStockError
    );
  });

  it('se puede llamar repetidas veces (idempotente) sin efectos acumulativos', () => {
    const { service, productRepository } = buildService();
    service.calculatePreview([{ productId: 'p1', quantity: 2 }], undefined);
    service.calculatePreview([{ productId: 'p1', quantity: 2 }], undefined);
    expect(productRepository.findById('p1')?.stock).toBe(2);
  });
});
