import express, { Express } from 'express';
import cors from 'cors';
import { InMemoryProductRepository } from './domain/ProductRepository';
import { InMemoryCouponRepository } from './domain/discounts/CouponRepository';
import { JsonOrderRepository } from './infrastructure/persistence/JsonOrderRepository';
import { DiscountRuleFactory } from './domain/discounts/DiscountRuleFactory';
import { DiscountEngine } from './domain/discounts/DiscountEngine';
import { CheckoutService } from './application/CheckoutService';
import { buildRouter } from './infrastructure/http/routes';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const productRepository = new InMemoryProductRepository();
  const couponRepository = new InMemoryCouponRepository();
  const orderRepository = new JsonOrderRepository();
  const discountEngine = new DiscountEngine(DiscountRuleFactory.createSequentialRules(couponRepository));
  const checkoutService = new CheckoutService(productRepository, orderRepository, discountEngine);

  app.use('/api', buildRouter(productRepository, checkoutService));

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  return app;
}
