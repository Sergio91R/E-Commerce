import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { SEED_PRODUCTS } from '../../data/seedProducts';

/**
 * Alias del tipo de conexión para no acoplar el resto de la infraestructura
 * al nombre concreto del driver. Si en el futuro se cambia `node:sqlite` por
 * otro cliente síncrono (p. ej. better-sqlite3), solo cambia este archivo.
 */
export type SqliteDatabase = DatabaseSync;

/**
 * Esquema de la base. Se ejecuta con `CREATE TABLE IF NOT EXISTS` en cada
 * arranque, igual de simple que como `JsonOrderRepository` creaba su archivo:
 * si las tablas ya existen, es un no-op.
 */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS products (
    id       TEXT    PRIMARY KEY,
    name     TEXT    NOT NULL,
    price    REAL    NOT NULL,
    category TEXT    NOT NULL,
    stock    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coupons (
    code          TEXT PRIMARY KEY,
    discount_rate REAL    NOT NULL,
    active        INTEGER NOT NULL,
    expires_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    order_id                      TEXT    PRIMARY KEY,
    items                         TEXT    NOT NULL,
    coupon_code                   TEXT,
    original_subtotal             REAL    NOT NULL,
    discount_breakdown            TEXT    NOT NULL,
    total_discount_amount         REAL    NOT NULL,
    effective_discount_percentage REAL    NOT NULL,
    discount_cap_reached          INTEGER NOT NULL,
    final_total                   REAL    NOT NULL,
    created_at                    TEXT    NOT NULL
  );
`;

/** Único cupón sembrado en producción (mismo que exige el enunciado). */
const SEED_COUPONS: ReadonlyArray<{
  code: string;
  discountRate: number;
  active: number;
  expiresAt: string | null;
}> = [{ code: 'WELCOME2026', discountRate: 0.15, active: 1, expiresAt: null }];

/**
 * Resuelve dónde vive el archivo SQLite:
 *  - `SQLITE_DB_PATH` si está seteada (útil para apuntar a otro archivo).
 *  - `:memory:` bajo tests (Jest setea `NODE_ENV=test`): cada `createApp()`
 *    obtiene una base aislada y efímera, sin tocar disco.
 *  - Por defecto, `apps/backend/data.sqlite`.
 */
export function resolveDbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }
  if (process.env.NODE_ENV === 'test') {
    return ':memory:';
  }
  return path.join(__dirname, '..', '..', '..', 'data.sqlite');
}

/**
 * Abre (o crea) la base, aplica el esquema y siembra los datos base solo si
 * las tablas están vacías. Devuelve la conexión ya lista para inyectar en
 * los repositorios SQLite.
 */
export function createDatabase(dbPath: string = resolveDbPath()): SqliteDatabase {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(db: SqliteDatabase): void {
  const productCount = (db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n;
  if (productCount === 0) {
    const insertProduct = db.prepare(
      'INSERT INTO products (id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)'
    );
    for (const product of SEED_PRODUCTS) {
      insertProduct.run(product.id, product.name, product.price, product.category, product.stock);
    }
  }

  const couponCount = (db.prepare('SELECT COUNT(*) AS n FROM coupons').get() as { n: number }).n;
  if (couponCount === 0) {
    const insertCoupon = db.prepare(
      'INSERT INTO coupons (code, discount_rate, active, expires_at) VALUES (?, ?, ?, ?)'
    );
    for (const coupon of SEED_COUPONS) {
      insertCoupon.run(coupon.code, coupon.discountRate, coupon.active, coupon.expiresAt);
    }
  }
}
