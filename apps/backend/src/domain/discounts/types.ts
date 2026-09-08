import { Product } from '@shared/index';

export interface CartLineSnapshot {
  product: Product;
  quantity: number;
  lineTotal: number;
}

/**
 * Entrada que recibe cada regla (Strategy). Las reglas por ítem (categoría)
 * usan `lines`; las reglas agregadas (volumen, cupón) solo usan `subtotal`.
 */
export interface DiscountRuleInput {
  readonly originalSubtotal: number;
  readonly subtotal: number;
  readonly lines: readonly CartLineSnapshot[];
  readonly couponCode?: string;
}

export interface DiscountRuleOutput {
  readonly amountApplied: number;
  readonly newSubtotal: number;
  readonly description: string;
}

/** Contrato Strategy: el motor ejecuta reglas sin conocer su lógica interna. */
export interface DiscountRule {
  readonly name: string;
  calculate(input: DiscountRuleInput): DiscountRuleOutput;
}

export interface DiscountBreakdownEntry {
  ruleName: string;
  description: string;
  amountApplied: number;
  subtotalAfter: number;
}

export interface DiscountCalculationResult {
  originalSubtotal: number;
  breakdown: DiscountBreakdownEntry[];
  totalDiscountAmount: number;
  effectiveDiscountPercentage: number;
  discountCapReached: boolean;
  finalTotal: number;
}

export const ABSOLUTE_DISCOUNT_CAP_PERCENTAGE = 0.35;

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
