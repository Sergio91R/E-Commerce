import express, { Express } from 'express';
import cors from 'cors';
import { ProductRepository } from './domain/ProductRepository';
import { CouponRepository } from './domain/discounts/CouponRepository';
import { OrderRepository } from './domain/Order';
import { createDatabase, resolveDbPath } from './infrastructure/persistence/sqliteDatabase';
import { SqliteProductRepository } from './infrastructure/persistence/SqliteProductRepository';
import { SqliteCouponRepository } from './infrastructure/persistence/SqliteCouponRepository';
import { SqliteOrderRepository } from './infrastructure/persistence/SqliteOrderRepository';
import { DiscountRuleFactory } from './domain/discounts/DiscountRuleFactory';
import { DiscountEngine } from './domain/discounts/DiscountEngine';
import { CatalogService } from './application/CatalogService';
import { CheckoutService } from './application/CheckoutService';
import { buildRouter } from './infrastructure/http/routes';

/**
 * Dependencias que el composition root sabe construir por sí mismo (SQLite).
 * Se pueden sobrescribir al llamar `createApp` para inyectar dobles de prueba
 * o una base ya abierta, sin que el resto de la app cambie.
 */
export interface AppDependencies {
  productRepository: ProductRepository;
  couponRepository: CouponRepository;
  orderRepository: OrderRepository;
}

export function createApp(overrides: Partial<AppDependencies> = {}): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Composition root: se abre una sola conexión SQLite y se comparte entre
  // los tres repositorios. Bajo tests, `resolveDbPath()` devuelve `:memory:`,
  // así que cada `createApp()` arranca con una base sembrada y aislada.
  const db = createDatabase(resolveDbPath());

  const productRepository = overrides.productRepository ?? new SqliteProductRepository(db);
  const couponRepository = overrides.couponRepository ?? new SqliteCouponRepository(db);
  const orderRepository = overrides.orderRepository ?? new SqliteOrderRepository(db);

  const discountEngine = new DiscountEngine(
    DiscountRuleFactory.createSequentialRules(couponRepository)
  );
  const catalogService = new CatalogService(productRepository);
  const checkoutService = new CheckoutService(productRepository, orderRepository, discountEngine);

  app.use('/api', buildRouter(catalogService, checkoutService));

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  return app;
}
