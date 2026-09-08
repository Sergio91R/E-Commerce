import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { CheckoutApiError, CheckoutService } from '../../services/checkout.service';
import { CheckoutResponseDTO } from '../../models/shared';
import { DiscountAlertComponent } from '../discount-alert/discount-alert.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, DiscountAlertComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent {
  public couponCode = '';
  public readonly submitting = signal(false);
  public readonly checkoutResult = signal<CheckoutResponseDTO | null>(null);
  public readonly checkoutErrorMessage = signal<string | null>(null);

  public constructor(
    public readonly cartService: CartService,
    public readonly cartDrawerService: CartDrawerService,
    private readonly checkoutService: CheckoutService
  ) {}

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

  public submitCheckout(): void {
    if (this.cartService.isEmpty()) {
      this.checkoutErrorMessage.set('El carrito está vacío.');
      return;
    }

    this.submitting.set(true);
    this.checkoutErrorMessage.set(null);
    this.checkoutResult.set(null);

    const items = this.cartService.toCartItemDTOs();

    this.checkoutService.checkout(items, this.couponCode).subscribe({
      next: (result) => {
        this.checkoutResult.set(result);
        this.submitting.set(false);
        this.cartService.clear();
      },
      error: (err: CheckoutApiError) => {
        this.checkoutErrorMessage.set(err.apiError.error);
        this.submitting.set(false);
      }
    });
  }
}
