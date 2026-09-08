import { Component, Signal, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { OrderConfirmationService } from '../../services/order-confirmation.service';
import { CheckoutApiError, CheckoutService } from '../../services/checkout.service';
import { CheckoutPreviewResponseDTO, CheckoutResponseDTO } from '../../models/shared';
import { DiscountAlertComponent } from '../discount-alert/discount-alert.component';

const PREVIEW_DEBOUNCE_MS = 300;

/**
 * El carrito tiene dos flujos separados a propósito:
 *  1) "Preview" (calculatePreview / preview()): se recalcula solo, sin
 *     efectos secundarios, cada vez que cambia el carrito o el cupón.
 *     Podés seguir agregando/quitando productos libremente.
 *  2) "Confirmar compra" (checkout()): recién ahí se decrementa stock real
 *     y se persiste la orden. A partir de ese momento el carrito se vacía
 *     y, a través de OrderConfirmationService, se bloquea el catálogo
 *     hasta que el usuario elija "Hacer una nueva compra".
 */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, DiscountAlertComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent {
  public readonly couponCode = signal('');

  public readonly preview = signal<CheckoutPreviewResponseDTO | null>(null);
  public readonly previewError = signal<string | null>(null);
  public readonly previewLoading = signal(false);

  public readonly confirming = signal(false);
  public readonly confirmError = signal<string | null>(null);

  /** Proxy de solo lectura al estado compartido (ver OrderConfirmationService). */
  public readonly confirmedOrder: Signal<CheckoutResponseDTO | null>;

  private previewDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    public readonly cartService: CartService,
    public readonly cartDrawerService: CartDrawerService,
    private readonly checkoutService: CheckoutService,
    private readonly orderConfirmationService: OrderConfirmationService
  ) {
    this.confirmedOrder = this.orderConfirmationService.confirmedOrder;

    // Se re-ejecuta automáticamente cada vez que cambian las líneas del
    // carrito o el cupón, disparando un recálculo en vivo (HU2).
    effect(
      () => {
        this.cartService.lines();
        this.couponCode();
        this.schedulePreview();
      },
      { allowSignalWrites: true }
    );
  }

  public onCouponInput(value: string): void {
    this.couponCode.set(value);
  }

  /**
   * Cierre "suave" del drawer (click afuera o botón ✕): se ignora mientras
   * haya una orden recién confirmada, para forzar a que el usuario use
   * explícitamente "Hacer una nueva compra" antes de poder cerrar o seguir
   * interactuando con el catálogo.
   */
  public closeDrawer(): void {
    if (this.confirmedOrder()) {
      return;
    }
    this.cartDrawerService.close();
  }

  public increment(productId: string): void {
    const line = this.cartService.lines().find((l) => l.product.id === productId);
    if (line) {
      this.cartService.addItem(line.product);
    }
  }

  public decrement(productId: string): void {
    this.cartService.decrementItem(productId);
  }

  public remove(productId: string): void {
    this.cartService.removeItem(productId);
  }

  public clearCart(): void {
    this.cartService.clear();
    this.couponCode.set('');
  }

  public startNewPurchase(): void {
    this.orderConfirmationService.clear();
    this.confirmError.set(null);
  }

  public confirmPurchase(): void {
    if (this.cartService.isEmpty() || this.confirming()) {
      return;
    }

    this.confirming.set(true);
    this.confirmError.set(null);

    const items = this.cartService.toCartItemDTOs();

    this.checkoutService.checkout(items, this.couponCode()).subscribe({
      next: (order) => {
        this.orderConfirmationService.setConfirmedOrder(order);
        this.confirming.set(false);
        this.cartService.clear();
        this.couponCode.set('');
        this.preview.set(null);
      },
      error: (err: CheckoutApiError) => {
        this.confirmError.set(err.apiError.error);
        this.confirming.set(false);
      }
    });
  }

  private schedulePreview(): void {
    if (this.previewDebounceHandle) {
      clearTimeout(this.previewDebounceHandle);
    }

    if (this.cartService.isEmpty()) {
      this.preview.set(null);
      this.previewError.set(null);
      this.previewLoading.set(false);
      return;
    }

    this.previewLoading.set(true);
    this.previewDebounceHandle = setTimeout(() => this.runPreview(), PREVIEW_DEBOUNCE_MS);
  }

  private runPreview(): void {
    const items = this.cartService.toCartItemDTOs();

    this.checkoutService.preview(items, this.couponCode()).subscribe({
      next: (result) => {
        this.preview.set(result);
        this.previewError.set(null);
        this.previewLoading.set(false);
      },
      error: (err: CheckoutApiError) => {
        this.preview.set(null);
        this.previewError.set(err.apiError.error);
        this.previewLoading.set(false);
      }
    });
  }
}
