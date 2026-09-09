import { Product } from '@shared/index';
import { SEED_PRODUCTS } from '../data/seedProducts';

export type ProductChanges = Partial<Omit<Product, 'id'>>;

export interface ProductRepository {
  findAll(): Product[];
  findById(id: string): Product | undefined;
  decrementStock(id: string, quantity: number): void;
  create(product: Product): void;
  update(id: string, changes: ProductChanges): void;
}

/**
 * Estado del catálogo en memoria durante la vida del proceso. Se clona el
 * seed para no mutar la constante original entre instancias (útil en tests).
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Map<string, Product>;

  public constructor(seed: Product[] = SEED_PRODUCTS) {
    this.products = new Map(seed.map((product) => [product.id, { ...product }]));
  }

  public findAll(): Product[] {
    return Array.from(this.products.values()).map((product) => ({ ...product }));
  }

  public findById(id: string): Product | undefined {
    const product = this.products.get(id);
    return product ? { ...product } : undefined;
  }

  public decrementStock(id: string, quantity: number): void {
    const product = this.products.get(id);
    if (!product) {
      return;
    }
    product.stock -= quantity;
  }

  public create(product: Product): void {
    this.products.set(product.id, { ...product });
  }

  public update(id: string, changes: ProductChanges): void {
    const existing = this.products.get(id);
    if (!existing) {
      return;
    }
    this.products.set(id, { ...existing, ...changes });
  }
}
