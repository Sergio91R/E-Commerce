import { DiscountEngine } from '../../src/domain/discounts/DiscountEngine';
import { DiscountRuleFactory } from '../../src/domain/discounts/DiscountRuleFactory';
import { InMemoryCouponRepository } from '../../src/domain/discounts/CouponRepository';
import { CartLineSnapshot, DiscountRule, DiscountRuleInput, DiscountRuleOutput } from '../../src/domain/discounts/types';
import { Product } from '@shared/index';
import { InvalidCouponError } from '../../src/domain/errors';

function makeLine(product: Partial<Product> & Pick<Product, 'id' | 'name' | 'price' | 'category' | 'stock'>, quantity: number): CartLineSnapshot {
  return { product: product as Product, quantity, lineTotal: product.price * quantity };
}

const laptop: Product = { id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 8 };
const mouse: Product = { id: 'p2', name: 'Mouse', price: 18, category: 'Tecnologia', stock: 40 };
const cafetera: Product = { id: 'p4', name: 'Cafetera', price: 55, category: 'Hogar', stock: 15 };
const camiseta: Product = { id: 'p6', name: 'Camiseta', price: 15, category: 'Ropa', stock: 60 };

function buildEngine(): DiscountEngine {
  const couponRepository = new InMemoryCouponRepository();
  return new DiscountEngine(DiscountRuleFactory.createSequentialRules(couponRepository));
}

describe('DiscountEngine - cascada de reglas reales', () => {
  it('no aplica ningún descuento si el carrito no tiene tecnología ni supera el umbral ni hay cupón', () => {
    const engine = buildEngine();
    const result = engine.calculate([makeLine(camiseta, 1)]);

    expect(result.originalSubtotal).toBe(15);
    expect(result.totalDiscountAmount).toBe(0);
    expect(result.finalTotal).toBe(15);
    expect(result.discountCapReached).toBe(false);
  });

  it('aplica el 10% solo sobre la línea de categoría Tecnologia, no sobre todo el carrito', () => {
    const engine = buildEngine();
    // 1 laptop ($650, tech) + 1 cafetera ($55, hogar) => subtotal $705
    const result = engine.calculate([makeLine(laptop, 1), makeLine(cafetera, 1)]);

    const categoryStep = result.breakdown.find((b) => b.ruleName === 'DESCUENTO_CATEGORIA');
    expect(categoryStep?.amountApplied).toBe(65); // 10% de 650, no de 705
  });

it('aplica el descuento por volumen solo si el subtotal post-categoría supera $100', () => {
    const engine = buildEngine();
    // Se usa un producto NO tecnológico a propósito, para aislar la regla de
    // volumen sin que la regla de categoría interfiera en el resultado.
    const result = engine.calculate([makeLine(cafetera, 1)]); // $55, no supera $100

    const categoryStep = result.breakdown.find((b) => b.ruleName === 'DESCUENTO_CATEGORIA');
    const volumeStep = result.breakdown.find((b) => b.ruleName === 'DESCUENTO_VOLUMEN');
    expect(categoryStep?.amountApplied).toBe(0);
    expect(volumeStep?.amountApplied).toBe(0);
    expect(result.finalTotal).toBe(55);
});

  it('encadena categoría + volumen + cupón de forma multiplicativa, no sumada', () => {
    const engine = buildEngine();
    // 1 laptop ($650 tech) -> tras categoría: 650 - 65 = 585 (>100, aplica volumen)
    const result = engine.calculate([makeLine(laptop, 1)], 'WELCOME2026');

    expect(result.originalSubtotal).toBe(650);
    const afterCategory = 650 - 65; // 585
    const volumeDiscount = afterCategory * 0.05; // 29.25
    const afterVolume = afterCategory - volumeDiscount; // 555.75
    const couponDiscount = afterVolume * 0.15; // 83.3625 -> redondeado 83.36
    const afterCoupon = Math.round((afterVolume - couponDiscount) * 100) / 100;

    expect(result.finalTotal).toBeCloseTo(afterCoupon, 1);
    expect(result.totalDiscountAmount).toBeCloseTo(650 - afterCoupon, 1);
    // El total nunca debería igualar la suma ingenua 10%+5%+15%=30% de 650 (=195)
    expect(result.totalDiscountAmount).not.toBeCloseTo(195, 0);
  });

  it('acepta el cupón sin distinguir mayúsculas/minúsculas ni espacios', () => {
    const engine = buildEngine();
    const result = engine.calculate([makeLine(laptop, 1)], '  welcome2026  ');
    const couponStep = result.breakdown.find((b) => b.ruleName === 'DESCUENTO_CUPON');
    expect(couponStep?.amountApplied).toBeGreaterThan(0);
    expect(result.discountCapReached).toBe(false);
  });

  it('lanza InvalidCouponError si el cupón no existe o está expirado', () => {
    const engine = buildEngine();
    expect(() => engine.calculate([makeLine(mouse, 1)], 'NOEXISTE')).toThrow(InvalidCouponError);
    expect(() => engine.calculate([makeLine(mouse, 1)], 'EXPIRED2020')).toThrow(InvalidCouponError);
  });

  it('un carrito sin cupón ingresado no lanza error (cupón es opcional)', () => {
    const engine = buildEngine();
    expect(() => engine.calculate([makeLine(mouse, 1)], undefined)).not.toThrow();
  });

  it('con un carrito vacío de líneas, el subtotal y el total son 0 sin errores', () => {
    const engine = buildEngine();
    const result = engine.calculate([]);
    expect(result.originalSubtotal).toBe(0);
    expect(result.finalTotal).toBe(0);
    expect(result.discountCapReached).toBe(false);
  });
});

/**
 * El tope del 35% (Regla #4) es transversal a cualquier combinación de
 * reglas. Con las 3 reglas de negocio reales, el descuento máximo teórico
 * es 1 - (0.90 * 0.95 * 0.85) = 27.325%, que nunca alcanza el 35%. Para
 * probar el mecanismo de truncado de forma rigurosa (y no dejarlo como
 * código muerto), se valida con reglas Strategy de prueba que sí generan
 * un descuento agresivo, simulando un escenario donde las reglas de
 * negocio cambien en el futuro.
 */
describe('DiscountEngine - límite absoluto del 35% (Regla #4)', () => {
  function aggressiveRule(rate: number, name: string): DiscountRule {
    return {
      name,
      calculate(input: DiscountRuleInput): DiscountRuleOutput {
        const amountApplied = Math.round(input.subtotal * rate * 100) / 100;
        return {
          amountApplied,
          newSubtotal: Math.round((input.subtotal - amountApplied) * 100) / 100,
          description: `Regla de prueba ${name}`
        };
      }
    };
  }

  it('trunca exactamente al 35% cuando el cálculo matemático lo supera', () => {
    const engine = new DiscountEngine([aggressiveRule(0.3, 'R1'), aggressiveRule(0.3, 'R2')]);
    const result = engine.calculate([makeLine(laptop, 1)]); // subtotal $650

    expect(result.discountCapReached).toBe(true);
    expect(result.totalDiscountAmount).toBe(227.5); // 35% de 650
    expect(result.finalTotal).toBe(422.5);
    expect(result.effectiveDiscountPercentage).toBe(35);
  });

  it('en el límite exacto del 35% no marca discountCapReached (no lo supera, lo iguala)', () => {
    const engine = new DiscountEngine([aggressiveRule(0.35, 'EXACT')]);
    const result = engine.calculate([makeLine(laptop, 1)]);

    expect(result.discountCapReached).toBe(false);
    expect(result.totalDiscountAmount).toBe(227.5);
    expect(result.finalTotal).toBe(422.5);
  });

  it('justo por encima del límite (35.01%) sí trunca', () => {
    const engine = new DiscountEngine([aggressiveRule(0.3501, 'OVER')]);
    const result = engine.calculate([makeLine(laptop, 1)]);

    expect(result.discountCapReached).toBe(true);
    expect(result.totalDiscountAmount).toBe(227.5);
  });
});
