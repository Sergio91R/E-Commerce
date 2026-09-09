import { Coupon, CouponRepository } from '../../domain/discounts/CouponRepository';
import { SqliteDatabase } from './sqliteDatabase';

interface CouponRow {
  code: string;
  discount_rate: number;
  active: number;
  expires_at: string | null;
}

/**
 * Implementación de `CouponRepository` sobre SQLite. Reproduce exactamente
 * el filtro de la versión en memoria: normaliza el código, exige `active`
 * y descarta cupones expirados. `CouponDiscountRule` no cambia.
 */
export class SqliteCouponRepository implements CouponRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  public findActiveByCode(code: string): Coupon | undefined {
    const normalized = code.trim().toUpperCase();
    const row = this.db
      .prepare('SELECT code, discount_rate, active, expires_at FROM coupons WHERE code = ?')
      .get(normalized) as CouponRow | undefined;

    if (!row || row.active !== 1) {
      return undefined;
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at) : undefined;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return undefined;
    }

    return {
      code: row.code,
      discountRate: row.discount_rate,
      active: true,
      expiresAt
    };
  }
}
