import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { OrderConfirmationService } from '../../services/order-confirmation.service';
import { Product } from '../../models/shared';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit {
  public readonly products = signal<Product[]>([]);
  public readonly loading = signal<boolean>(true);
  public readonly errorMessage = signal<string | null>(null);
  public readonly stockWarningId = signal<string | null>(null);

  public constructor(
    private readonly productService: ProductService,
    public readonly cartService: CartService,
    public readonly cartDrawerService: CartDrawerService,
    public readonly orderConfirmationService: OrderConfirmationService
  ) {}

  public ngOnInit(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el catálogo. ¿Está el backend corriendo en el puerto 3000?');
        this.loading.set(false);
      }
    });
  }

  public quantityInCart(productId: string): number {
    return this.cartService.lines().find((line) => line.product.id === productId)?.quantity ?? 0;
  }

  public addToCart(product: Product): void {
    if (this.orderConfirmationService.isLocked()) {
      return;
    }

    const added = this.cartService.addItem(product);
    if (!added) {
      this.stockWarningId.set(product.id);
      setTimeout(() => this.stockWarningId.set(null), 2000);
    }
  }
}
