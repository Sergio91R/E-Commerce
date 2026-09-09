import { ApiErrorCode } from '@shared/index';

export class DomainError extends Error {
  public readonly code: ApiErrorCode;

  public constructor(message: string, code: ApiErrorCode) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class EmptyCartError extends DomainError {
  public constructor() {
    super('El carrito no puede estar vacío.', 'EMPTY_CART');
  }
}

export class InvalidCartDataError extends DomainError {
  public constructor(message: string) {
    super(message, 'INVALID_CART_DATA');
  }
}

export class ProductNotFoundError extends DomainError {
  public constructor(productId: string) {
    super(`El producto '${productId}' no existe en el catálogo.`, 'PRODUCT_NOT_FOUND');
  }
}

export class InsufficientStockError extends DomainError {
  public constructor(productLabel: string, requested: number, available: number) {
    super(
      `Stock insuficiente para '${productLabel}': se pidieron ${requested}, hay ${available} disponibles.`,
      'INSUFFICIENT_STOCK'
    );
  }
}

export class InvalidCouponError extends DomainError {
  public constructor(couponCode: string) {
    super(`El cupón '${couponCode}' no existe o está expirado.`, 'INVALID_COUPON');
  }
}

export class ProductAlreadyExistsError extends DomainError {
  public constructor(productId: string) {
    super(`El producto '${productId}' ya existe en el catálogo.`, 'PRODUCT_ALREADY_EXISTS');
  }
}

export class InvalidProductDataError extends DomainError {
  public constructor(message: string) {
    super(message, 'INVALID_PRODUCT_DATA');
  }
}
