import { Component, OnInit, effect, signal } from '@angular/core';
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

  /**
   * Ids de productos cuya foto no cargó (404, sin conexión). La card cae al
   * placeholder `📷`. Es un Set mutado desde el `(error)` de la `<img>`;
   * Angular re-evalúa el `*ngIf` en el siguiente ciclo de detección.
   */
  public readonly failedImages = new Set<string>();

  public constructor(
    private readonly productService: ProductService,
    public readonly cartService: CartService,
    public readonly cartDrawerService: CartDrawerService,
    public readonly orderConfirmationService: OrderConfirmationService
  ) {
    // Cada vez que se confirma una orden, el stock real bajó en el backend
    // (CheckoutService.checkout() lo decrementa). Sin esto, el catálogo
    // seguiría mostrando los números viejos hasta recargar la página a mano.
    effect(() => {
      if (this.orderConfirmationService.confirmedOrder()) {
        this.fetchProducts();
      }
    });
  }

  public ngOnInit(): void {
    this.fetchProducts();
  }

  public quantityInCart(productId: string): number {
    return this.cartService.lines().find((line) => line.product.id === productId)?.quantity ?? 0;
  }

  /**
   * Stock "disponible para seguir agregando", restando lo que el usuario ya
   * puso en el carrito (todavía sin confirmar). El `product.stock` crudo
   * solo baja de verdad en el backend cuando se confirma la compra; esto
   * es un ajuste puramente visual del lado del cliente.
   */
  public availableStock(product: Product): number {
    return product.stock - this.quantityInCart(product.id);
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

  private fetchProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
        this.errorMessage.set(null);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el catálogo. ¿Está el backend corriendo en el puerto 3000?');
        this.loading.set(false);
      }
    });
  }
}
