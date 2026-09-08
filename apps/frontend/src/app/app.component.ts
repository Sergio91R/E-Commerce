import { Component } from '@angular/core';
import { ProductListComponent } from './components/product-list/product-list.component';
import { CartComponent } from './components/cart/cart.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ProductListComponent, CartComponent],
  template: `
    <div class="container">
      <header>
        <h1>Core E-Commerce · Checkout con Descuentos Acumulativos</h1>
      </header>
      <app-product-list></app-product-list>
      <app-cart></app-cart>
    </div>
  `,
  styles: [
    `
      header h1 {
        font-size: 1.4rem;
        color: #111827;
      }
    `
  ]
})
export class AppComponent {}
