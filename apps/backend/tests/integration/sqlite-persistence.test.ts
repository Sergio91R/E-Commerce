import request from 'supertest';
import { createApp } from '../../src/app';

/**
 * Verifica que el stack real SQLite (createApp -> Sqlite*Repository) funciona
 * de punta a punta por HTTP. Bajo NODE_ENV=test la base es `:memory:`, así que
 * cada `createApp()` arranca sembrada y aislada.
 */
describe('Integración - persistencia SQLite vía HTTP', () => {
  it('GET /api/products devuelve los 10 productos sembrados', async () => {
    const app = createApp();
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].id).toBe('p1');
  });

  it('POST /api/checkout decrementa el stock de forma persistente en la misma instancia', async () => {
    const app = createApp();

    const before = await request(app).get('/api/products');
    const stockBefore = before.body.find((p: { id: string }) => p.id === 'p2').stock;

    const checkout = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: 'p2', quantity: 4 }] });
    expect(checkout.status).toBe(201);

    const after = await request(app).get('/api/products');
    const stockAfter = after.body.find((p: { id: string }) => p.id === 'p2').stock;

    expect(stockAfter).toBe(stockBefore - 4);
  });

  it('el cupón WELCOME2026 vive en la tabla coupons y aplica el 15%', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/cart/calculate')
      .send({ items: [{ productId: 'p2', quantity: 1 }], couponCode: 'WELCOME2026' });

    expect(res.status).toBe(200);
    expect(res.body.discountBreakdown.some((e: { ruleName: string }) => e.ruleName === 'DESCUENTO_CUPON')).toBe(true);
  });

  it('cada createApp() parte de una base sembrada e independiente', async () => {
    const appA = createApp();
    await request(appA).post('/api/checkout').send({ items: [{ productId: 'p1', quantity: 3 }] });

    const appB = createApp();
    const productsB = await request(appB).get('/api/products');
    expect(productsB.body.find((p: { id: string }) => p.id === 'p1').stock).toBe(8);
  });
});

describe('Integración - alta y edición de catálogo vía HTTP', () => {
  const nuevo = { id: 'p50', name: 'Webcam 1080p', price: 55, category: 'Tecnologia', stock: 12 };

  it('POST /api/products crea el producto y aparece en GET /api/products', async () => {
    const app = createApp();

    const created = await request(app).post('/api/products').send(nuevo);
    expect(created.status).toBe(201);
    expect(created.body).toEqual(nuevo);

    const list = await request(app).get('/api/products');
    expect(list.body.find((p: { id: string }) => p.id === 'p50')).toEqual(nuevo);
  });

  it('el producto recién creado ya se puede comprar (checkout usa la misma tabla)', async () => {
    const app = createApp();
    await request(app).post('/api/products').send(nuevo);

    const res = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: 'p50', quantity: 2 }] });
    expect(res.status).toBe(201);

    const list = await request(app).get('/api/products');
    expect(list.body.find((p: { id: string }) => p.id === 'p50').stock).toBe(10);
  });

  it('POST con id existente responde 409 PRODUCT_ALREADY_EXISTS', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/products')
      .send({ ...nuevo, id: 'p1' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRODUCT_ALREADY_EXISTS');
  });

  it('POST con datos inválidos responde 400 INVALID_PRODUCT_DATA', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/products')
      .send({ ...nuevo, id: 'p51', price: -1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PRODUCT_DATA');
  });

  it('PUT /api/products/:id actualiza precio y stock', async () => {
    const app = createApp();
    const res = await request(app).put('/api/products/p1').send({ price: 700, stock: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'p1', price: 700, stock: 3 });

    const list = await request(app).get('/api/products');
    expect(list.body.find((p: { id: string }) => p.id === 'p1').price).toBe(700);
  });

  it('PUT sobre un id inexistente responde 404', async () => {
    const app = createApp();
    const res = await request(app).put('/api/products/nope').send({ price: 1 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
  });
});
