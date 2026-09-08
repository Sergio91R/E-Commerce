import { DiscountRule, DiscountRuleInput, DiscountRuleOutput, roundCurrency } from '../types';

const TARGET_CATEGORY = 'Tecnologia';
const CATEGORY_DISCOUNT_RATE = 0.10;

/**
 * Regla #1: si el carrito contiene al menos un producto de categoría
 * "Tecnologia", se aplica 10% sobre el precio de ESOS productos
 * específicos (no sobre todo el carrito).
 */
export class CategoryDiscountRule implements DiscountRule {
  public readonly name = 'DESCUENTO_CATEGORIA';

  public calculate(input: DiscountRuleInput): DiscountRuleOutput {
    const techLines = input.lines.filter((line) => line.product.category === TARGET_CATEGORY);

    if (techLines.length === 0) {
      return {
        amountApplied: 0,
        newSubtotal: input.subtotal,
        description: 'No hay productos de categoría Tecnologia en el carrito; no aplica.'
      };
    }

    const techLinesTotal = techLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const amountApplied = roundCurrency(techLinesTotal * CATEGORY_DISCOUNT_RATE);
    const newSubtotal = roundCurrency(input.subtotal - amountApplied);

    return {
      amountApplied,
      newSubtotal,
      description: `10% por categoría Tecnologia (base $${techLinesTotal.toFixed(2)}).`
    };
  }
}
