import { DiscountRule, DiscountRuleInput, DiscountRuleOutput, roundCurrency } from '../types';

const VOLUME_THRESHOLD_USD = 100;
const VOLUME_DISCOUNT_RATE = 0.05;

/**
 * Regla #2: si el subtotal (ya con el descuento de categoría aplicado)
 * supera los $100 USD, se aplica un 5% adicional sobre TODO el carrito.
 */
export class VolumeDiscountRule implements DiscountRule {
  public readonly name = 'DESCUENTO_VOLUMEN';

  public calculate(input: DiscountRuleInput): DiscountRuleOutput {
    if (input.subtotal <= VOLUME_THRESHOLD_USD) {
      return {
        amountApplied: 0,
        newSubtotal: input.subtotal,
        description: `Subtotal ($${input.subtotal.toFixed(2)}) no supera el umbral de $${VOLUME_THRESHOLD_USD}; no aplica.`
      };
    }

    const amountApplied = roundCurrency(input.subtotal * VOLUME_DISCOUNT_RATE);
    const newSubtotal = roundCurrency(input.subtotal - amountApplied);

    return {
      amountApplied,
      newSubtotal,
      description: `5% adicional por superar $${VOLUME_THRESHOLD_USD} en subtotal.`
    };
  }
}
