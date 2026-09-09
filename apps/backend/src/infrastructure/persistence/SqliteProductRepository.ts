import { Product, ProductCategory } from '@shared/index';
import { ProductChanges, ProductRepository } from '../../domain/ProductRepository';
import { SqliteDatabase } from './sqliteDatabase';

interface ProductRow {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
}

/**
 * Implementación de `ProductRepository` respaldada en SQLite. Mantiene las
 * mismas firmas síncronas que la versión en memoria: la capa de aplicación
 * (`CheckoutService`) no se entera de qué hay detrás.
 */
export class SqliteProductRepository implements ProductRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  public findAll(): Product[] {
    const rows = this.db
      .prepare('SELECT id, name, price, category, stock FROM products ORDER BY rowid')
      .all() as ProductRow[];
    return rows.map(toProduct);
  }

  public findById(id: string): Product | undefined {
    const row = this.db
      .prepare('SELECT id, name, price, category, stock FROM products WHERE id = ?')
      .get(id) as ProductRow | undefined;
    return row ? toProduct(row) : undefined;
  }

  public decrementStock(id: string, quantity: number): void {
    // No-op si el id no existe, igual que la implementación en memoria.
    // `CheckoutService` ya validó existencia y stock antes de llegar acá.
    this.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, id);
  }

  public create(product: Product): void {
    // La unicidad del id ya la validó `CatalogService` (findById previo);
    // el PRIMARY KEY de la tabla es la última red de seguridad.
    this.db
      .prepare('INSERT INTO products (id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)')
      .run(product.id, product.name, product.price, product.category, product.stock);
  }

  public update(id: string, changes: ProductChanges): void {
    const columns: Record<keyof ProductChanges, string> = {
      name: 'name',
      price: 'price',
      category: 'category',
      stock: 'stock'
    };
    const sets: string[] = [];
    const values: Array<string | number> = [];
    for (const key of Object.keys(columns) as Array<keyof ProductChanges>) {
      const value = changes[key];
      if (value !== undefined) {
        sets.push(`${columns[key]} = ?`);
        values.push(value);
      }
    }
    if (sets.length === 0) {
      return;
    }
    values.push(id);
    this.db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    // `category` viene de datos sembrados y validados; el cast a la unión
    // evita `any` sin introducir una validación redundante en tiempo de lectura.
    category: row.category as ProductCategory,
    stock: row.stock
  };
}
