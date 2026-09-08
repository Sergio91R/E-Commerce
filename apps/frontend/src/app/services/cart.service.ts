import { Injectable, computed, signal } from '@angular/core';
import { CartItemDTO, Product } from '../models/shared';

export interface CartLine {
  product: Product;
  quantity: number;
}

/**
 * Maneja el estado reactivo del carrito con Angular Signals. Se probó
 * deliberadamente sin depender de HttpClient ni del DOM: es lógica pura de
 * estado, fácil de cubrir al 80%+ (requisito de la HU1 y sección 4.3).
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly linesSignal = signal<CartLine[]>([]);

  public readonly lines = this.linesSignal.asReadonly();

  public readonly subtotal = computed(() =>
    this.linesSignal().reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  );

  public readonly itemCount = computed(() =>
    this.linesSignal().reduce((sum, line) => sum + line.quantity, 0)
  );

  public readonly isEmpty = computed(() => this.linesSignal().length === 0);

  /**
   * Agrega una unidad del producto al carrito. Devuelve `false` (y no
   * modifica el estado) si ya se alcanzó el stock disponible, para que la
   * UI pueda mostrar feedback de "superación de stock" (HU1 / demo).
   */
  public addItem(product: Product): boolean {
    const current = this.linesSignal();
    const existing = current.find((line) => line.product.id === product.id);

    if (existing) {
      if (existing.quantity >= product.stock) {
        return false;
      }
      this.linesSignal.set(
        current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        )
      );
      return true;
    }

    if (product.stock <= 0) {
      return false;
    }

    this.linesSignal.set([...current, { product, quantity: 1 }]);
    return true;
  }

  public decrementItem(productId: string): void {
    const current = this.linesSignal();
    const existing = current.find((line) => line.product.id === productId);
    if (!existing) {
      return;
    }

    if (existing.quantity <= 1) {
      this.removeItem(productId);
      return;
    }

    this.linesSignal.set(
      current.map((line) => (line.product.id === productId ? { ...line, quantity: line.quantity - 1 } : line))
    );
  }

  public removeItem(productId: string): void {
    this.linesSignal.set(this.linesSignal().filter((line) => line.product.id !== productId));
  }

  public clear(): void {
    this.linesSignal.set([]);
  }

  public toCartItemDTOs(): CartItemDTO[] {
    return this.linesSignal().map((line) => ({ productId: line.product.id, quantity: line.quantity }));
  }
}
