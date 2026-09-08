export interface Coupon {
  code: string;
  discountRate: number;
  active: boolean;
  expiresAt?: Date;
}

export interface CouponRepository {
  findActiveByCode(code: string): Coupon | undefined;
}

/**
 * Implementación en memoria. Se puede sustituir por una respaldada en base
 * de datos sin tocar CouponDiscountRule (inversión de dependencias).
 */
export class InMemoryCouponRepository implements CouponRepository {
  private readonly coupons: Coupon[] = [
    { code: 'WELCOME2026', discountRate: 0.15, active: true },
    { code: 'EXPIRED2020', discountRate: 0.5, active: true, expiresAt: new Date('2020-01-01') }
  ];

  public findActiveByCode(code: string): Coupon | undefined {
    const normalized = code.trim().toUpperCase();
    return this.coupons.find((coupon) => {
      const notExpired = !coupon.expiresAt || coupon.expiresAt.getTime() > Date.now();
      return coupon.code === normalized && coupon.active && notExpired;
    });
  }
}
