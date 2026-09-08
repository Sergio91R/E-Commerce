import { Router, Request, Response } from 'express';
import { ApiErrorResponse, CheckoutRequestDTO } from '@shared/index';
import { ProductRepository } from '../../domain/ProductRepository';
import { CheckoutService } from '../../application/CheckoutService';
import { DomainError } from '../../domain/errors';

export function buildRouter(productRepository: ProductRepository, checkoutService: CheckoutService): Router {
  const router = Router();

  router.get('/products', (_req: Request, res: Response) => {
    res.status(200).json(productRepository.findAll());
  });

  router.post('/checkout', (req: Request, res: Response) => {
    const body = req.body as Partial<CheckoutRequestDTO>;

    try {
      const result = checkoutService.checkout(body.items ?? [], body.couponCode);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof DomainError) {
        const payload: ApiErrorResponse = { error: error.message, code: error.code };
        res.status(mapCodeToHttpStatus(error.code)).json(payload);
        return;
      }
      res.status(500).json({ error: 'Error interno del servidor.', code: 'INVALID_CART_DATA' });
    }
  });

  return router;
}

function mapCodeToHttpStatus(code: string): number {
  switch (code) {
    case 'EMPTY_CART':
    case 'INVALID_CART_DATA':
    case 'INVALID_COUPON':
      return 400;
    case 'PRODUCT_NOT_FOUND':
      return 404;
    case 'INSUFFICIENT_STOCK':
      return 409;
    default:
      return 500;
  }
}
