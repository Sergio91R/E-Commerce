import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CartComponent } from './cart.component';
import { CartService } from '../../services/cart.service';
import { environment } from '../../../environments/environment';
import { Product, CheckoutResponseDTO, CheckoutPreviewResponseDTO } from '../../models/shared';

const laptop: Product = { id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 5 };

const emptyPreview: CheckoutPreviewResponseDTO = {
  originalSubtotal: 650,
  discountBreakdown: [],
  totalDiscountAmount: 0,
  effectiveDiscountPercentage: 0,
  discountCapReached: false,
  finalTotal: 650
};

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let httpMock: HttpTestingController;
  let cartService: CartService;
  const previewUrl = `${environment.apiUrl}/cart/calculate`;
  const checkoutUrl = `${environment.apiUrl}/checkout`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartComponent, FormsModule, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    httpMock = TestBed.inject(HttpTestingController);
    cartService = TestBed.inject(CartService);
  });

  afterEach(() => httpMock.verify());

  it('muestra el mensaje de carrito vacío cuando no hay líneas (y no llama al backend)', () => {
    fixture.detectChanges();
    const empty = fixture.debugElement.query(By.css('p'));
    expect(empty.nativeElement.textContent).toContain('El carrito está vacío');
  });

  it('recalcula el preview automáticamente al agregar un producto (debounced)', fakeAsync(() => {
    fixture.detectChanges();

    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);

    const req = httpMock.expectOne(previewUrl);
    expect(req.request.body).toEqual({ items: [{ productId: 'p1', quantity: 1 }] });
    req.flush(emptyPreview);

    expect(fixture.componentInstance.preview()).toEqual(emptyPreview);
  }));

  it('al quitar el último producto, el preview vuelve a null sin llamar al backend de nuevo', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    cartService.removeItem('p1');
    fixture.detectChanges();
    tick(300);

    httpMock.expectNone(previewUrl);
    expect(fixture.componentInstance.preview()).toBeNull();
  }));

  it('"Vaciar carrito" limpia las líneas y el preview', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.clearCart();
    fixture.detectChanges();
    tick(300);

    expect(cartService.isEmpty()).toBe(true);
    expect(fixture.componentInstance.preview()).toBeNull();
  }));

  it('no permite confirmar la compra con el carrito vacío', () => {
    fixture.detectChanges();
    fixture.componentInstance.confirmPurchase();
    httpMock.expectNone(checkoutUrl);
  });

  it('al confirmar, limpia el carrito, guarda la orden y muestra la alerta si discountCapReached es true', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);
    fixture.detectChanges();

    fixture.componentInstance.confirmPurchase();
    const req = httpMock.expectOne(checkoutUrl);
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
    expect(fixture.componentInstance.confirmedOrder()).toEqual(response);
    const alert = fixture.debugElement.query(By.css('[data-testid="discount-alert"]'));
    expect(alert).not.toBeNull();
  }));

  it('muestra el error del backend si la confirmación falla, sin vaciar el carrito', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.confirmPurchase();
    const req = httpMock.expectOne(checkoutUrl);
    req.flush({ error: 'Stock insuficiente', code: 'INSUFFICIENT_STOCK' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.componentInstance.confirmError()).toBe('Stock insuficiente');
    expect(cartService.isEmpty()).toBe(false);
  }));

  it('"Hacer una nueva compra" limpia la orden confirmada del estado', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.confirmPurchase();
    httpMock.expectOne(checkoutUrl).flush({
      orderId: 'xyz', originalSubtotal: 650, discountBreakdown: [], totalDiscountAmount: 0,
      effectiveDiscountPercentage: 0, discountCapReached: false, finalTotal: 650, createdAt: new Date().toISOString()
    } as CheckoutResponseDTO);
    fixture.detectChanges();

    expect(fixture.componentInstance.confirmedOrder()).not.toBeNull();
    fixture.componentInstance.startNewPurchase();
    expect(fixture.componentInstance.confirmedOrder()).toBeNull();
  }));

  it('closeDrawer() no cierra el panel mientras haya una orden confirmada (click afuera o X)', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.cartDrawerService.open();
    fixture.componentInstance.confirmPurchase();
    httpMock.expectOne(checkoutUrl).flush({
      orderId: 'xyz', originalSubtotal: 650, discountBreakdown: [], totalDiscountAmount: 0,
      effectiveDiscountPercentage: 0, discountCapReached: false, finalTotal: 650, createdAt: new Date().toISOString()
    } as CheckoutResponseDTO);
    fixture.detectChanges();

    // Con la orden confirmada, closeDrawer() (backdrop o X) no debe cerrar nada
    fixture.componentInstance.closeDrawer();
    expect(fixture.componentInstance.cartDrawerService.isOpen()).toBe(true);

    // Recién tras "Hacer una nueva compra" sí se puede cerrar normalmente
    fixture.componentInstance.startNewPurchase();
    fixture.componentInstance.closeDrawer();
    expect(fixture.componentInstance.cartDrawerService.isOpen()).toBe(false);
  }));
});
