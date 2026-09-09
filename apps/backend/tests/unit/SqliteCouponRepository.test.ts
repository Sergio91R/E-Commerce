import { createDatabase, SqliteDatabase } from '../../src/infrastructure/persistence/sqliteDatabase';
import { SqliteCouponRepository } from '../../src/infrastructure/persistence/SqliteCouponRepository';

function insertCoupon(
  db: SqliteDatabase,
  code: string,
  active: number,
  expiresAt: string | null
): void {
  db.prepare(
    'INSERT INTO coupons (code, discount_rate, active, expires_at) VALUES (?, ?, ?, ?)'
  ).run(code, 0.5, active, expiresAt);
}

describe('SqliteCouponRepository', () => {
  it('encuentra el cupón sembrado WELCOME2026 y lo mapea a Coupon', () => {
    const repo = new SqliteCouponRepository(createDatabase(':memory:'));
    const coupon = repo.findActiveByCode('WELCOME2026');

    expect(coupon).toEqual({
      code: 'WELCOME2026',
      discountRate: 0.15,
      active: true,
      expiresAt: undefined
    });
  });

  it('normaliza el código (trim + mayúsculas)', () => {
    const repo = new SqliteCouponRepository(createDatabase(':memory:'));
    expect(repo.findActiveByCode('  welcome2026 ')?.code).toBe('WELCOME2026');
  });

  it('devuelve undefined para un cupón no registrado', () => {
    const repo = new SqliteCouponRepository(createDatabase(':memory:'));
    expect(repo.findActiveByCode('NO_EXISTE')).toBeUndefined();
  });

  it('ignora cupones inactivos', () => {
    const db = createDatabase(':memory:');
    insertCoupon(db, 'INACTIVO', 0, null);
    expect(new SqliteCouponRepository(db).findActiveByCode('INACTIVO')).toBeUndefined();
  });

  it('ignora cupones expirados', () => {
    const db = createDatabase(':memory:');
    insertCoupon(db, 'EXPIRADO', 1, '2020-01-01T00:00:00.000Z');
    expect(new SqliteCouponRepository(db).findActiveByCode('EXPIRADO')).toBeUndefined();
  });

  it('acepta cupones con expiración futura', () => {
    const db = createDatabase(':memory:');
    insertCoupon(db, 'FUTURO', 1, '2999-01-01T00:00:00.000Z');
    expect(new SqliteCouponRepository(db).findActiveByCode('FUTURO')?.code).toBe('FUTURO');
  });
});
