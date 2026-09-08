import { DiscountRule } from './types';
import { CategoryDiscountRule } from './rules/CategoryDiscountRule';
import { VolumeDiscountRule } from './rules/VolumeDiscountRule';
import { CouponDiscountRule } from './rules/CouponDiscountRule';
import { CouponRepository } from './CouponRepository';

/**
 * Factory Method: centraliza la construcción y el ORDEN de precedencia de
 * las reglas. Si se agrega una regla nueva, solo se toca este archivo;
 * DiscountEngine sigue iterando la lista sin cambios (Open/Closed).
 */
export class DiscountRuleFactory {
  public static createSequentialRules(couponRepository: CouponRepository): DiscountRule[] {
    return [
      new CategoryDiscountRule(),
      new VolumeDiscountRule(),
      new CouponDiscountRule(couponRepository)
    ];
  }
}
