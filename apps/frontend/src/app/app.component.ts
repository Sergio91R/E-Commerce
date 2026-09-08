import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductListComponent } from './components/product-list/product-list.component';
import { CartComponent } from './components/cart/cart.component';
import { CartService } from './services/cart.service';
import { CartDrawerService } from './services/cart-drawer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ProductListComponent, CartComponent],
  template: `
    <div class="container">
      <header class="app-header">
        <h1>Core E-Commerce · Checkout con Descuentos Acumulativos</h1>

        <button
          class="cart-icon-btn"
          type="button"
          aria-label="Abrir carrito"
          (click)="cartDrawerService.toggle()"
        >
          🛒
          <span class="badge" *ngIf="cartService.itemCount() > 0">{{ cartService.itemCount() }}</span>
        </button>
      </header>

      <app-product-list></app-product-list>
      <app-cart></app-cart>
    </div>
  `,
  styles: [
    `
      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .app-header h1 {
        font-size: 1.4rem;
        color: #111827;
        margin: 0;
      }

      .cart-icon-btn {
        position: relative;
        border: none;
        background: #fff;
        border-radius: 999px;
        width: 44px;
        height: 44px;
        font-size: 1.3rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        flex-shrink: 0;
      }

      .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #dc2626;
        color: #fff;
        font-size: 0.7rem;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }
    `
  ]
})
export class AppComponent {
  public constructor(
    public readonly cartService: CartService,
    public readonly cartDrawerService: CartDrawerService
  ) {}
}
