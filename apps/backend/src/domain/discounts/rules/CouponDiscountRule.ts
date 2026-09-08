import { DiscountRule, DiscountRuleInput, DiscountRuleOutput, roundCurrency } from '../types';
import { CouponRepository } from '../CouponRepository';
import { InvalidCouponError } from '../../errors';

/**
 * Regla #3: si el usuario ingresa un cupón, se valida contra el
 * repositorio de cupones activos. Sin cupón, no aplica (no es error).
 * Con cupón inválido o expirado, se lanza un error de negocio explícito.
 */
export class CouponDiscountRule implements DiscountRule {
  public readonly name = 'DESCUENTO_CUPON';

  public constructor(private readonly couponRepository: CouponRepository) {}

  public calculate(input: DiscountRuleInput): DiscountRuleOutput {
    if (!input.couponCode || input.couponCode.trim().length === 0) {
      return {
        amountApplied: 0,
        newSubtotal: input.subtotal,
        description: 'No se ingresó cupón; no aplica.'
      };
    }

    const coupon = this.couponRepository.findActiveByCode(input.couponCode);
    if (!coupon) {
      throw new InvalidCouponError(input.couponCode);
    }

    const amountApplied = roundCurrency(input.subtotal * coupon.discountRate);
    const newSubtotal = roundCurrency(input.subtotal - amountApplied);

    return {
      amountApplied,
      newSubtotal,
      description: `${(coupon.discountRate * 100).toFixed(0)}% adicional por cupón '${coupon.code}'.`
    };
  }
}
