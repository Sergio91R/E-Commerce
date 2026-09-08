import { Component, Signal, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { OrderConfirmationService } from '../../services/order-confirmation.service';
import { CheckoutApiError, CheckoutService } from '../../services/checkout.service';
import { CartItemDTO, CheckoutPreviewResponseDTO, CheckoutResponseDTO } from '../../models/shared';
import { DiscountAlertComponent } from '../discount-alert/discount-alert.component';

const CART_CHANGE_DEBOUNCE_MS = 300;

/**
 * El carrito tiene dos flujos separados a propósito:
 *  1) "Preview" (calculatePreview / preview()): se recalcula solo, sin
 *     efectos secundarios, cada vez que cambia el carrito. El cupón, en
 *     cambio, se aplica de forma EXPLÍCITA con el botón "Aplicar cupón"
 *     (no en cada tecla), para no spamear al backend y para poder mostrar
 *     un mensaje claro si el código no existe o está expirado.
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
  /** Texto que el usuario está escribiendo (no dispara ningún cálculo por sí solo). */
  public readonly couponInput = signal('');
  /** Último cupón confirmado con el botón "Aplicar cupón" (o vacío si no hay). */
  public readonly appliedCouponCode = signal('');
  /** Mensaje específico de "cupón inválido/expirado", mostrado debajo del input. */
  public readonly couponFieldError = signal<string | null>(null);

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

    // Se re-ejecuta cada vez que cambian las líneas del carrito o el cupón
    // YA APLICADO (no en cada tecla del input) — HU2.
    effect(
      () => {
        this.cartService.lines();
        this.appliedCouponCode();
        this.schedulePreview();
      },
      { allowSignalWrites: true }
    );
  }

  public onCouponInput(value: string): void {
    this.couponInput.set(value);
    // Cualquier edición del input (incluido borrarlo) limpia los mensajes
    // de error relacionados al cupón, para no dejar un error "pegado" que
    // ya no corresponde a lo que el usuario está escribiendo ahora.
    this.couponFieldError.set(null);
    this.confirmError.set(null);

    if (value.trim().length === 0) {
      // Un input vacío significa, sin ambigüedad, "no quiero cupón": se
      // saca de inmediato el cupón aplicado (sin esperar al botón
      // "Aplicar cupón"). Si no se hiciera esto, un cupón inválido que ya
      // se había "aplicado" quedaría vigente por detrás de escena y
      // "Confirmar compra" seguiría enviándolo al backend aunque el campo
      // se vea vacío en pantalla.
      this.appliedCouponCode.set('');
    }
  }

  /** Aplica el cupón escrito en el input (botón "Aplicar cupón" o tecla Enter). */
  public applyCoupon(): void {
    this.couponFieldError.set(null);
    this.appliedCouponCode.set(this.couponInput().trim());
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
    this.couponInput.set('');
    this.appliedCouponCode.set('');
    this.couponFieldError.set(null);
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

    this.checkoutService.checkout(items, this.appliedCouponCode()).subscribe({
      next: (order) => {
        this.orderConfirmationService.setConfirmedOrder(order);
        this.confirming.set(false);
        this.cartService.clear();
        this.couponInput.set('');
        this.appliedCouponCode.set('');
        this.couponFieldError.set(null);
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
    this.previewDebounceHandle = setTimeout(() => this.runPreview(), CART_CHANGE_DEBOUNCE_MS);
  }

  private runPreview(): void {
    const items = this.cartService.toCartItemDTOs();
    const coupon = this.appliedCouponCode();

    this.checkoutService.preview(items, coupon).subscribe({
      next: (result) => {
        this.preview.set(result);
        this.previewError.set(null);
        this.couponFieldError.set(null);
        this.previewLoading.set(false);
      },
      error: (err: CheckoutApiError) => {
        if (err.apiError.code === 'INVALID_COUPON') {
          // El cupón no existe/expiró: se lo avisamos bajo el input, pero
          // igual mostramos el desglose SIN cupón para no dejar al usuario
          // sin información de categoría/volumen mientras lo corrige.
          this.couponFieldError.set('El cupón no existe o está expirado.');
          this.previewError.set(null);
          this.retryPreviewWithoutCoupon(items);
          return;
        }

        this.preview.set(null);
        this.previewError.set(err.apiError.error);
        this.previewLoading.set(false);
      }
    });
  }

  private retryPreviewWithoutCoupon(items: CartItemDTO[]): void {
    this.checkoutService.preview(items, undefined).subscribe({
      next: (result) => {
        this.preview.set(result);
        this.previewLoading.set(false);
      },
      error: () => {
        this.preview.set(null);
        this.previewLoading.set(false);
      }
    });
  }
}
