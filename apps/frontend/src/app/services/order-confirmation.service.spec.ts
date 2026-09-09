import { TestBed } from '@angular/core/testing';
import { OrderConfirmationService } from './order-confirmation.service';
import { CheckoutResponseDTO } from '../models/shared';

const order: CheckoutResponseDTO = {
  orderId: 'abc123',
  orderNumber: 1,
  originalSubtotal: 100,
  discountBreakdown: [],
  totalDiscountAmount: 0,
  effectiveDiscountPercentage: 0,
  discountCapReached: false,
  finalTotal: 100,
  createdAt: new Date().toISOString()
};

describe('OrderConfirmationService', () => {
  let service: OrderConfirmationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderConfirmationService);
  });

  it('inicia sin ninguna orden confirmada y desbloqueado', () => {
    expect(service.confirmedOrder()).toBeNull();
    expect(service.isLocked()).toBe(false);
  });

  it('setConfirmedOrder() guarda la orden y bloquea', () => {
    service.setConfirmedOrder(order);
    expect(service.confirmedOrder()).toEqual(order);
    expect(service.isLocked()).toBe(true);
  });

  it('clear() vuelve a desbloquear', () => {
    service.setConfirmedOrder(order);
    service.clear();
    expect(service.confirmedOrder()).toBeNull();
    expect(service.isLocked()).toBe(false);
  });
});
