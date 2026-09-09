import { Router, Request, Response } from 'express';
import { ApiErrorResponse, CheckoutRequestDTO } from '@shared/index';
import { CatalogService } from '../../application/CatalogService';
import { CheckoutService } from '../../application/CheckoutService';
import { DomainError } from '../../domain/errors';

export function buildRouter(catalogService: CatalogService, checkoutService: CheckoutService): Router {
  const router = Router();

  router.get('/products', (_req: Request, res: Response) => {
    res.status(200).json(catalogService.listProducts());
  });

  // Alta de un producto en el catálogo. Es una operación de administración,
  // separada del flujo de checkout; por eso vive en CatalogService.
  router.post('/products', (req: Request, res: Response) => {
    try {
      const created = catalogService.createProduct(req.body);
      res.status(201).json(created);
    } catch (error) {
      handleDomainError(error, res);
    }
  });

  // Actualización parcial (precio, stock, nombre o categoría) de un producto.
  router.put('/products/:id', (req: Request, res: Response) => {
    try {
      const updated = catalogService.updateProduct(req.params.id, req.body);
      res.status(200).json(updated);
    } catch (error) {
      handleDomainError(error, res);
    }
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
    case 'INVALID_PRODUCT_DATA':
      return 400;
    case 'PRODUCT_NOT_FOUND':
      return 404;
    case 'INSUFFICIENT_STOCK':
    case 'PRODUCT_ALREADY_EXISTS':
      return 409;
    default:
      return 500;
  }
}
