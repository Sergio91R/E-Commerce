import request from 'supertest';
import { createApp } from '../../src/app';

describe('API REST - /api/products y /api/checkout', () => {
  const app = createApp();

  it('GET /api/products devuelve el catálogo', async () => {
    const response = await request(app).get('/api/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('POST /api/checkout con carrito vacío responde 400', async () => {
    const response = await request(app).post('/api/checkout').send({ items: [] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('EMPTY_CART');
  });

  it('POST /api/checkout con cupón inválido responde 400', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: 'p1', quantity: 1 }], couponCode: 'NOEXISTE' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_COUPON');
  });

  it('POST /api/checkout con producto inexistente responde 404', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: 'zzz', quantity: 1 }] });
    expect(response.status).toBe(404);
  });

  it('POST /api/checkout con stock insuficiente responde 409', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: 'p1', quantity: 999 }] });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INSUFFICIENT_STOCK');
  });

  it('POST /api/checkout exitoso devuelve el desglose y persiste la orden', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: 'p2', quantity: 1 }], couponCode: 'WELCOME2026' });

    expect(response.status).toBe(201);
    expect(response.body.orderId).toBeDefined();
    expect(response.body.discountBreakdown.length).toBeGreaterThan(0);
    expect(response.body.finalTotal).toBeLessThan(response.body.originalSubtotal);
  });
});
