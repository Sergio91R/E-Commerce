import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CartComponent } from './cart.component';
import { CartService } from '../../services/cart.service';
import { environment } from '../../../environments/environment';
import { Product, CheckoutResponseDTO } from '../../models/shared';
// Nota: desde src/app/components/cart/*.spec.ts hay que subir 3 niveles
// (cart -> components -> app) para llegar a src/environments.

const laptop: Product = { id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 5 };

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let httpMock: HttpTestingController;
  let cartService: CartService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartComponent, FormsModule, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    httpMock = TestBed.inject(HttpTestingController);
    cartService = TestBed.inject(CartService);
  });

  afterEach(() => httpMock.verify());

  it('muestra el mensaje de carrito vacío cuando no hay líneas', () => {
    fixture.detectChanges();
    const empty = fixture.debugElement.query(By.css('p'));
    expect(empty.nativeElement.textContent).toContain('El carrito está vacío');
  });

  it('no permite hacer checkout con el carrito vacío (edge case)', () => {
    fixture.detectChanges();
    fixture.componentInstance.submitCheckout();
    fixture.detectChanges();

    expect(fixture.componentInstance.checkoutErrorMessage()).toBe('El carrito está vacío.');
    httpMock.expectNone(`${environment.apiUrl}/checkout`);
  });

  it('al confirmar el checkout, limpia el carrito y muestra la alerta si discountCapReached es true', () => {
    cartService.addItem(laptop);
    fixture.detectChanges();

    fixture.componentInstance.submitCheckout();

    const req = httpMock.expectOne(`${environment.apiUrl}/checkout`);
    const response: CheckoutResponseDTO = {
      orderId: 'abc12345-0000-0000-0000-000000000000',
      originalSubtotal: 650,
      discountBreakdown: [],
      totalDiscountAmount: 227.5,
      effectiveDiscountPercentage: 35,
      discountCapReached: true,
      finalTotal: 422.5,
      createdAt: new Date().toISOString()
    };
    req.flush(response);
    fixture.detectChanges();

    expect(cartService.isEmpty()).toBe(true);
    const alert = fixture.debugElement.query(By.css('[data-testid="discount-alert"]'));
    expect(alert).not.toBeNull();
  });

  it('muestra el error del backend sin romper la UI si el checkout falla', () => {
    cartService.addItem(laptop);
    fixture.detectChanges();

    fixture.componentInstance.submitCheckout();
    const req = httpMock.expectOne(`${environment.apiUrl}/checkout`);
    req.flush({ error: 'Stock insuficiente', code: 'INSUFFICIENT_STOCK' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.componentInstance.checkoutErrorMessage()).toBe('Stock insuficiente');
    expect(cartService.isEmpty()).toBe(false);
  });
});
