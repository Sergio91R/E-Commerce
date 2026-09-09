import { CatalogService } from '../../src/application/CatalogService';
import { InMemoryProductRepository } from '../../src/domain/ProductRepository';
import {
  InvalidProductDataError,
  ProductAlreadyExistsError,
  ProductNotFoundError
} from '../../src/domain/errors';
import { Product } from '@shared/index';

const seed: Product[] = [{ id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 5 }];

function build() {
  const repo = new InMemoryProductRepository(seed);
  return { repo, service: new CatalogService(repo) };
}

const validNew = { id: 'p99', name: 'Teclado', price: 40, category: 'Tecnologia', stock: 30 };

describe('CatalogService.createProduct', () => {
  it('da de alta un producto válido y lo deja consultable', () => {
    const { service, repo } = build();
    const created = service.createProduct(validNew);

    expect(created).toEqual(validNew);
    expect(repo.findById('p99')).toEqual(validNew);
    expect(service.listProducts()).toHaveLength(2);
  });

  it('rechaza un id ya existente con ProductAlreadyExistsError', () => {
    const { service } = build();
    expect(() => service.createProduct({ ...validNew, id: 'p1' })).toThrow(ProductAlreadyExistsError);
  });

  it.each([
    ['body no objeto', 'no-soy-objeto'],
    ['id vacío', { ...validNew, id: '  ' }],
    ['name faltante', { ...validNew, name: undefined }],
    ['price cero o negativo', { ...validNew, price: 0 }],
    ['price no numérico', { ...validNew, price: 'gratis' }],
    ['stock negativo', { ...validNew, stock: -1 }],
    ['stock no entero', { ...validNew, stock: 2.5 }],
    ['category fuera de la lista', { ...validNew, category: 'Mascotas' }]
  ])('rechaza payload inválido: %s', (_label, payload) => {
    const { service } = build();
    expect(() => service.createProduct(payload)).toThrow(InvalidProductDataError);
  });

  it('no persiste nada cuando el payload es inválido', () => {
    const { service, repo } = build();
    expect(() => service.createProduct({ ...validNew, price: -5 })).toThrow();
    expect(repo.findAll()).toHaveLength(1);
  });
});

describe('CatalogService.updateProduct', () => {
  it('actualiza campos parciales y devuelve el producto resultante', () => {
    const { service, repo } = build();
    const updated = service.updateProduct('p1', { price: 700, stock: 3 });

    expect(updated).toEqual({ id: 'p1', name: 'Laptop', price: 700, category: 'Tecnologia', stock: 3 });
    expect(repo.findById('p1')?.price).toBe(700);
  });

  it('permite mover un producto de categoría', () => {
    const { service } = build();
    expect(service.updateProduct('p1', { category: 'Hogar' }).category).toBe('Hogar');
  });

  it('lanza ProductNotFoundError si el id no existe', () => {
    const { service } = build();
    expect(() => service.updateProduct('zzz', { price: 1 })).toThrow(ProductNotFoundError);
  });

  it('rechaza un body sin ningún campo actualizable', () => {
    const { service } = build();
    expect(() => service.updateProduct('p1', {})).toThrow(InvalidProductDataError);
  });

  it('valida los campos enviados (price > 0)', () => {
    const { service } = build();
    expect(() => service.updateProduct('p1', { price: -10 })).toThrow(InvalidProductDataError);
  });
});
