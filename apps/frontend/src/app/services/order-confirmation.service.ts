import { Injectable, computed, signal } from '@angular/core';
import { CheckoutResponseDTO } from '../models/shared';

/**
 * Estado compartido de "hay una orden recién confirmada". Vive separado de
 * CartComponent para que otros componentes (ej. el catálogo) puedan
 * reaccionar y bloquearse hasta que el usuario decida empezar una compra
 * nueva, sin acoplarse al componente del carrito.
 */
@Injectable({ providedIn: 'root' })
export class OrderConfirmationService {
  private readonly confirmedOrderSignal = signal<CheckoutResponseDTO | null>(null);

  public readonly confirmedOrder = this.confirmedOrderSignal.asReadonly();
  public readonly isLocked = computed(() => this.confirmedOrderSignal() !== null);

  public setConfirmedOrder(order: CheckoutResponseDTO): void {
    this.confirmedOrderSignal.set(order);
  }

  public clear(): void {
    this.confirmedOrderSignal.set(null);
  }
}
