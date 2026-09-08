import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ProductListComponent } from './product-list.component';
import { CartService } from '../../services/cart.service';
import { OrderConfirmationService } from '../../services/order-confirmation.service';
import { environment } from '../../../environments/environment';
import { Product, CheckoutResponseDTO } from '../../models/shared';

const laptop: Product = { id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 5 };

const confirmedOrder: CheckoutResponseDTO = {
  orderId: 'abc123',
  originalSubtotal: 650,
  discountBreakdown: [],
  totalDiscountAmount: 0,
  effectiveDiscountPercentage: 0,
  discountCapReached: false,
  finalTotal: 650,
  createdAt: new Date().toISOString()
};

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let httpMock: HttpTestingController;
  let cartService: CartService;
  let orderConfirmationService: OrderConfirmationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    httpMock = TestBed.inject(HttpTestingController);
    cartService = TestBed.inject(CartService);
    orderConfirmationService = TestBed.inject(OrderConfirmationService);

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/products`).flush([laptop]);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('permite agregar productos cuando no hay ninguna orden confirmada', () => {
    fixture.componentInstance.addToCart(laptop);
    expect(cartService.lines().length).toBe(1);
  });

  it('no muestra el overlay de bloqueo cuando no hay orden confirmada', () => {
    const overlay = fixture.debugElement.query(By.css('.locked-overlay'));
    expect(overlay).toBeNull();
  });

  it('bloquea el catálogo (no agrega productos) cuando hay una orden confirmada', () => {
    orderConfirmationService.setConfirmedOrder(confirmedOrder);
    fixture.detectChanges();

    fixture.componentInstance.addToCart(laptop);
    expect(cartService.isEmpty()).toBe(true);

    const overlay = fixture.debugElement.query(By.css('.locked-overlay'));
    expect(overlay).not.toBeNull();
  });

  it('desbloquea el catálogo de nuevo si la orden confirmada se limpia', () => {
    orderConfirmationService.setConfirmedOrder(confirmedOrder);
    fixture.detectChanges();
    orderConfirmationService.clear();
    fixture.detectChanges();

    fixture.componentInstance.addToCart(laptop);
    expect(cartService.lines().length).toBe(1);
    expect(fixture.debugElement.query(By.css('.locked-overlay'))).toBeNull();
  });
});
