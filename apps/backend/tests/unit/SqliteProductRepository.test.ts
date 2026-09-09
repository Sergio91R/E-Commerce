import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createDatabase,
  resolveDbPath,
  SqliteDatabase
} from '../../src/infrastructure/persistence/sqliteDatabase';
import { SqliteProductRepository } from '../../src/infrastructure/persistence/SqliteProductRepository';
import { SEED_PRODUCTS } from '../../src/data/seedProducts';

describe('SqliteProductRepository', () => {
  function buildRepo() {
    const db = createDatabase(':memory:');
    return { db, repo: new SqliteProductRepository(db) };
  }

  it('siembra los 10 productos del seed en una base vacía, respetando el orden', () => {
    const { repo } = buildRepo();
    const all = repo.findAll();

    expect(all).toHaveLength(SEED_PRODUCTS.length);
    expect(all.map((p) => p.id)).toEqual(SEED_PRODUCTS.map((p) => p.id));
    expect(all[0]).toEqual(SEED_PRODUCTS[0]);
  });

  it('findById devuelve el producto pedido y undefined si no existe', () => {
    const { repo } = buildRepo();
    expect(repo.findById('p1')?.name).toBe('Laptop 14" Ryzen 5');
    expect(repo.findById('no-existe')).toBeUndefined();
  });

  it('decrementStock resta unidades del producto indicado', () => {
    const { repo } = buildRepo();
    const before = repo.findById('p2')!.stock;

    repo.decrementStock('p2', 3);

    expect(repo.findById('p2')!.stock).toBe(before - 3);
  });

  it('decrementStock es un no-op silencioso si el id no existe', () => {
    const { repo } = buildRepo();
    expect(() => repo.decrementStock('fantasma', 1)).not.toThrow();
  });

  it('create inserta un producto nuevo y queda en findAll/findById', () => {
    const { repo } = buildRepo();
    repo.create({ id: 'p11', name: 'Teclado', price: 40, category: 'Tecnologia', stock: 30 });

    expect(repo.findById('p11')).toEqual({
      id: 'p11',
      name: 'Teclado',
      price: 40,
      category: 'Tecnologia',
      stock: 30
    });
    expect(repo.findAll()).toHaveLength(SEED_PRODUCTS.length + 1);
  });

  it('create sobre un id existente falla (PRIMARY KEY)', () => {
    const { repo } = buildRepo();
    expect(() =>
      repo.create({ id: 'p1', name: 'Dup', price: 1, category: 'Hogar', stock: 1 })
    ).toThrow();
  });

  it('update aplica solo los campos enviados', () => {
    const { repo } = buildRepo();
    repo.update('p1', { price: 999, stock: 2 });

    const p1 = repo.findById('p1')!;
    expect(p1.price).toBe(999);
    expect(p1.stock).toBe(2);
    expect(p1.name).toBe('Laptop 14" Ryzen 5'); // intacto
  });

  it('update sin campos es no-op', () => {
    const { repo } = buildRepo();
    const before = repo.findById('p1');
    repo.update('p1', {});
    expect(repo.findById('p1')).toEqual(before);
  });

  it('no vuelve a sembrar si las tablas ya tienen datos (persistencia en archivo)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-seed-'));
    const file = path.join(dir, 'data.sqlite');
    const connections: SqliteDatabase[] = [];
    try {
      const firstDb = createDatabase(file);
      connections.push(firstDb);
      const first = new SqliteProductRepository(firstDb);
      first.decrementStock('p1', 1);
      const stockAfterWrite = first.findById('p1')!.stock;

      // Segunda conexión al MISMO archivo: debe reutilizar los datos, no duplicarlos.
      const secondDb = createDatabase(file);
      connections.push(secondDb);
      const second = new SqliteProductRepository(secondDb);
      expect(second.findAll()).toHaveLength(SEED_PRODUCTS.length);
      expect(second.findById('p1')!.stock).toBe(stockAfterWrite);
    } finally {
      connections.forEach((db) => db.close());
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('resolveDbPath', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('usa :memory: bajo NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SQLITE_DB_PATH;
    expect(resolveDbPath()).toBe(':memory:');
  });

  it('respeta SQLITE_DB_PATH cuando está definida', () => {
    process.env.SQLITE_DB_PATH = '/tmp/custom.sqlite';
    expect(resolveDbPath()).toBe('/tmp/custom.sqlite');
  });

  it('cae a data.sqlite en apps/backend fuera de tests', () => {
    delete process.env.SQLITE_DB_PATH;
    process.env.NODE_ENV = 'production';
    expect(resolveDbPath().replace(/\\/g, '/')).toMatch(/apps\/backend\/data\.sqlite$/);
  });
});
