import { CartItemDTO, DiscountBreakdownEntry } from '@shared/index';
import { Order, OrderRepository } from '../../domain/Order';
import { SqliteDatabase } from './sqliteDatabase';

interface OrderRow {
  order_id: string;
  items: string;
  coupon_code: string | null;
  original_subtotal: number;
  discount_breakdown: string;
  total_discount_amount: number;
  effective_discount_percentage: number;
  discount_cap_reached: number;
  final_total: number;
  created_at: string;
}

/**
 * Implementación de `OrderRepository` sobre SQLite. Los campos compuestos
 * (`items`, `discountBreakdown`) se guardan como JSON en columnas TEXT: son
 * datos de solo-lectura tras la compra, no se consultan por su interior.
 * Los totales sí van en columnas propias para poder inspeccionarlos con SQL.
 */
export class SqliteOrderRepository implements OrderRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  public save(order: Order): void {
    this.db
      .prepare(
        `INSERT INTO orders (
          order_id, items, coupon_code, original_subtotal, discount_breakdown,
          total_discount_amount, effective_discount_percentage, discount_cap_reached,
          final_total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        order.orderId,
        JSON.stringify(order.items),
        order.couponCode ?? null,
        order.originalSubtotal,
        JSON.stringify(order.discountBreakdown),
        order.totalDiscountAmount,
        order.effectiveDiscountPercentage,
        order.discountCapReached ? 1 : 0,
        order.finalTotal,
        order.createdAt
      );
  }

  public findById(orderId: string): Order | undefined {
    const row = this.db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId) as
      | OrderRow
      | undefined;
    if (!row) {
      return undefined;
    }

    return {
      orderId: row.order_id,
      items: JSON.parse(row.items) as CartItemDTO[],
      couponCode: row.coupon_code ?? undefined,
      originalSubtotal: row.original_subtotal,
      discountBreakdown: JSON.parse(row.discount_breakdown) as DiscountBreakdownEntry[],
      totalDiscountAmount: row.total_discount_amount,
      effectiveDiscountPercentage: row.effective_discount_percentage,
      discountCapReached: row.discount_cap_reached === 1,
      finalTotal: row.final_total,
      createdAt: row.created_at
    };
  }
}
