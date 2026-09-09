import { PRODUCT_CATEGORIES, Product, ProductCategory } from '@shared/index';
import { ProductChanges, ProductRepository } from '../domain/ProductRepository';
import {
  InvalidProductDataError,
  ProductAlreadyExistsError,
  ProductNotFoundError
} from '../domain/errors';

/**
 * Casos de uso del catálogo: listar, dar de alta y actualizar productos.
 * Se mantiene aparte de `CheckoutService` (responsabilidad única): checkout
 * consume el catálogo, este servicio lo administra. Ambos comparten la
 * interfaz `ProductRepository`, no la implementación.
 *
 * Toda la validación de forma del payload vive acá; los controladores HTTP
 * solo traducen errores de dominio a códigos de estado.
 */
export class CatalogService {
  public constructor(private readonly productRepository: ProductRepository) {}

  public listProducts(): Product[] {
    return this.productRepository.findAll();
  }

  public createProduct(input: unknown): Product {
    const body = asRecord(input);
    const id = requireNonEmptyString(body.id, 'id');
    if (this.productRepository.findById(id)) {
      throw new ProductAlreadyExistsError(id);
    }

    const product: Product = {
      id,
      name: requireNonEmptyString(body.name, 'name'),
      price: requirePositiveNumber(body.price, 'price'),
      category: requireCategory(body.category),
      stock: requireNonNegativeInteger(body.stock, 'stock')
    };
    if (body.imageUrl !== undefined) {
      product.imageUrl = requireImageUrl(body.imageUrl);
    }
    this.productRepository.create(product);
    return product;
  }

  public updateProduct(id: string, input: unknown): Product {
    const existing = this.productRepository.findById(id);
    if (!existing) {
      throw new ProductNotFoundError(id);
    }

    const changes = readChanges(asRecord(input));
    if (Object.keys(changes).length === 0) {
      throw new InvalidProductDataError('No se envió ningún campo para actualizar.');
    }
    this.productRepository.update(id, changes);
    return { ...existing, ...changes };
  }
}

function readChanges(body: Record<string, unknown>): ProductChanges {
  const changes: ProductChanges = {};
  if (body.name !== undefined) {
    changes.name = requireNonEmptyString(body.name, 'name');
  }
  if (body.price !== undefined) {
    changes.price = requirePositiveNumber(body.price, 'price');
  }
  if (body.category !== undefined) {
    changes.category = requireCategory(body.category);
  }
  if (body.stock !== undefined) {
    changes.stock = requireNonNegativeInteger(body.stock, 'stock');
  }
  if (body.imageUrl !== undefined) {
    changes.imageUrl = requireImageUrl(body.imageUrl);
  }
  return changes;
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new InvalidProductDataError('El cuerpo de la petición debe ser un objeto JSON.');
  }
  return input as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidProductDataError(`El campo '${field}' debe ser un texto no vacío.`);
  }
  return value.trim();
}

function requirePositiveNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidProductDataError(`El campo '${field}' debe ser un número mayor a 0.`);
  }
  return value;
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new InvalidProductDataError(
      `El campo '${field}' debe ser un entero mayor o igual a 0.`
    );
  }
  return value;
}

function requireImageUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidProductDataError("El campo 'imageUrl' debe ser un texto no vacío.");
  }
  const url = value.trim();
  if (!/^(https?:\/\/|\/|data:image\/)/.test(url)) {
    throw new InvalidProductDataError(
      "El campo 'imageUrl' debe ser una URL http(s), una ruta absoluta ('/...') o un data URI de imagen."
    );
  }
  return url;
}

function requireCategory(value: unknown): ProductCategory {
  if (typeof value !== 'string' || !PRODUCT_CATEGORIES.includes(value as ProductCategory)) {
    throw new InvalidProductDataError(
      `El campo 'category' debe ser una de: ${PRODUCT_CATEGORIES.join(', ')}.`
    );
  }
  return value as ProductCategory;
}
