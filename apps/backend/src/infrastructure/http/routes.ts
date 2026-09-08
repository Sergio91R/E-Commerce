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

  // Preview: calcula el desglose de descuentos sin decrementar stock ni
  // persistir ninguna orden. Pensado para recalcular en vivo mientras el
  // usuario edita el carrito (agrega, quita o cambia el cupón).
  router.post('/cart/calculate', (req: Request, res: Response) => {
    const body = req.body as Partial<CheckoutRequestDTO>;

    try {
      const result = checkoutService.calculatePreview(body.items ?? [], body.couponCode);
      res.status(200).json(result);
    } catch (error) {
      handleDomainError(error, res);
    }
  });

  // Confirmación real de la compra: decrementa stock y persiste la orden.
  router.post('/checkout', (req: Request, res: Response) => {
    const body = req.body as Partial<CheckoutRequestDTO>;

    try {
      const result = checkoutService.checkout(body.items ?? [], body.couponCode);
      res.status(201).json(result);
    } catch (error) {
      handleDomainError(error, res);
    }
  });

  return router;
}

function handleDomainError(error: unknown, res: Response): void {
  if (error instanceof DomainError) {
    const payload: ApiErrorResponse = { error: error.message, code: error.code };
    res.status(mapCodeToHttpStatus(error.code)).json(payload);
    return;
  }
  res.status(500).json({ error: 'Error interno del servidor.', code: 'INVALID_CART_DATA' });
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
