import { Injectable, signal } from '@angular/core';

/**
 * Estado puramente de UI (no de negocio): si el drawer del carrito está
 * abierto o cerrado. Se mantiene separado de CartService a propósito, para
 * no mezclar estado de presentación con las reglas de negocio del carrito
 * (ver docs/arquitectura.md, sección de separación de responsabilidades).
 */
@Injectable({ providedIn: 'root' })
export class CartDrawerService {
  private readonly isOpenSignal = signal(false);

  public readonly isOpen = this.isOpenSignal.asReadonly();

  public open(): void {
    this.isOpenSignal.set(true);
  }

  public close(): void {
    this.isOpenSignal.set(false);
  }

  public toggle(): void {
    this.isOpenSignal.update((value) => !value);
  }
}
