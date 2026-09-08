import {
  CartLineSnapshot,
  DiscountBreakdownEntry,
  DiscountCalculationResult,
  DiscountRule,
  ABSOLUTE_DISCOUNT_CAP_PERCENTAGE,
  roundCurrency
} from './types';

/**
 * Contexto del patrón Strategy. Ejecuta las reglas en el orden que le
 * entrega la Factory, sin conocer su lógica interna, y aplica al final la
 * Regla de Negocio #4 (límite absoluto del 35%), que es transversal.
 */
export class DiscountEngine {
  public constructor(private readonly rules: DiscountRule[]) {}

  public calculate(lines: readonly CartLineSnapshot[], couponCode?: string): DiscountCalculationResult {
    const originalSubtotal = roundCurrency(lines.reduce((sum, line) => sum + line.lineTotal, 0));

    const breakdown: DiscountBreakdownEntry[] = [];
    let runningSubtotal = originalSubtotal;

    for (const rule of this.rules) {
      const result = rule.calculate({
        originalSubtotal,
        subtotal: runningSubtotal,
        lines,
        couponCode
      });

      runningSubtotal = result.newSubtotal;
      breakdown.push({
        ruleName: rule.name,
        description: result.description,
        amountApplied: result.amountApplied,
        subtotalAfter: result.newSubtotal
      });
    }

    return this.applyAbsoluteCap(originalSubtotal, runningSubtotal, breakdown);
  }

  private applyAbsoluteCap(
    originalSubtotal: number,
    subtotalAfterRules: number,
    breakdown: DiscountBreakdownEntry[]
  ): DiscountCalculationResult {
    const rawDiscount = roundCurrency(originalSubtotal - subtotalAfterRules);
    const maxAllowedDiscount = roundCurrency(originalSubtotal * ABSOLUTE_DISCOUNT_CAP_PERCENTAGE);

    const discountCapReached = rawDiscount > maxAllowedDiscount;
    const totalDiscountAmount = discountCapReached ? maxAllowedDiscount : rawDiscount;
    const finalTotal = roundCurrency(originalSubtotal - totalDiscountAmount);

    if (discountCapReached) {
      breakdown.push({
        ruleName: 'LIMITE_DESCUENTO_ABSOLUTO',
        description: `El descuento acumulado ($${rawDiscount.toFixed(2)}) superaba el tope del 35%; se truncó a $${maxAllowedDiscount.toFixed(2)}.`,
        amountApplied: roundCurrency(maxAllowedDiscount - rawDiscount),
        subtotalAfter: finalTotal
      });
    }

    const effectiveDiscountPercentage =
      originalSubtotal === 0 ? 0 : roundCurrency((totalDiscountAmount / originalSubtotal) * 100);

    return {
      originalSubtotal,
      breakdown,
      totalDiscountAmount,
      effectiveDiscountPercentage,
      discountCapReached,
      finalTotal
    };
  }
}
