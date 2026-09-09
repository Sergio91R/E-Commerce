import { createDatabase } from '../../src/infrastructure/persistence/sqliteDatabase';
import { SqliteOrderRepository } from '../../src/infrastructure/persistence/SqliteOrderRepository';
import { Order } from '../../src/domain/Order';

function buildRepo() {
  return new SqliteOrderRepository(createDatabase(':memory:'));
}

const baseOrder: Order = {
  orderId: 'ord-1',
  items: [
    { productId: 'p1', quantity: 2 },
    { productId: 'p3', quantity: 1 }
  ],
  couponCode: 'WELCOME2026',
  originalSubtotal: 1345,
  discountBreakdown: [
    { ruleName: 'DESCUENTO_CATEGORIA', description: '10% Tecnologia', amountApplied: 134.5, subtotalAfter: 1210.5 },
    { ruleName: 'DESCUENTO_CUPON', description: '15% cupón', amountApplied: 181.58, subtotalAfter: 1028.92 }
  ],
  totalDiscountAmount: 316.08,
  effectiveDiscountPercentage: 0.235,
  discountCapReached: false,
  finalTotal: 1028.92,
  createdAt: '2026-09-08T12:00:00.000Z'
};

describe('SqliteOrderRepository', () => {
  it('persiste y recupera una orden con todos sus campos (incluidos los compuestos)', () => {
    const repo = buildRepo();
    repo.save(baseOrder);

    expect(repo.findById('ord-1')).toEqual(baseOrder);
  });

  it('preserva el flag discountCapReached=true como booleano', () => {
    const repo = buildRepo();
    repo.save({ ...baseOrder, orderId: 'ord-cap', discountCapReached: true });

    expect(repo.findById('ord-cap')?.discountCapReached).toBe(true);
  });

  it('maneja órdenes sin cupón (couponCode undefined)', () => {
    const repo = buildRepo();
    repo.save({ ...baseOrder, orderId: 'ord-nocoupon', couponCode: undefined });

    const found = repo.findById('ord-nocoupon');
    expect(found?.couponCode).toBeUndefined();
    expect(found?.items).toHaveLength(2);
  });

  it('devuelve undefined si la orden no existe', () => {
    expect(buildRepo().findById('inexistente')).toBeUndefined();
  });
});
