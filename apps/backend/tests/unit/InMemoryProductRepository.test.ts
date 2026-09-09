import { InMemoryProductRepository } from '../../src/domain/ProductRepository';
import { Product } from '@shared/index';

const seed: Product[] = [
  { id: 'a', name: 'A', price: 10, category: 'Hogar', stock: 5 },
  { id: 'b', name: 'B', price: 20, category: 'Ropa', stock: 2 }
];

describe('InMemoryProductRepository (doble usado en tests de aplicación)', () => {
  it('findAll devuelve copias del catálogo sembrado', () => {
    const repo = new InMemoryProductRepository(seed);
    const all = repo.findAll();

    expect(all.map((p) => p.id)).toEqual(['a', 'b']);
    all[0].stock = 999;
    expect(repo.findById('a')?.stock).toBe(5); // no se mutó el estado interno
  });

  it('decrementStock descuenta unidades y es no-op si el id no existe', () => {
    const repo = new InMemoryProductRepository(seed);
    repo.decrementStock('a', 3);
    expect(repo.findById('a')?.stock).toBe(2);

    expect(() => repo.decrementStock('no-existe', 1)).not.toThrow();
  });

  it('usa el seed real por defecto', () => {
    expect(new InMemoryProductRepository().findAll().length).toBeGreaterThan(0);
  });

  it('create agrega un producto y update aplica cambios parciales', () => {
    const repo = new InMemoryProductRepository(seed);
    repo.create({ id: 'c', name: 'C', price: 5, category: 'Juguetes', stock: 1 });
    expect(repo.findById('c')?.name).toBe('C');

    repo.update('c', { price: 9 });
    expect(repo.findById('c')).toEqual({ id: 'c', name: 'C', price: 9, category: 'Juguetes', stock: 1 });
  });

  it('update es no-op si el id no existe', () => {
    const repo = new InMemoryProductRepository(seed);
    expect(() => repo.update('nope', { price: 1 })).not.toThrow();
    expect(repo.findById('nope')).toBeUndefined();
  });
});
