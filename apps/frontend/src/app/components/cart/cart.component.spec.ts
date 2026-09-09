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

  it('descarta una respuesta de preview obsoleta que llega después de una más nueva', fakeAsync(() => {
    fixture.detectChanges();

    cartService.addItem(laptop); // carrito: 1
    fixture.detectChanges();
    tick(300); // dispara request A (qty 1)

    cartService.addItem(laptop); // carrito: 2
    fixture.detectChanges();
    tick(300); // dispara request B (qty 2)

    const reqs = httpMock.match(previewUrl);
    expect(reqs.length).toBe(2);

    const previewQty2: CheckoutPreviewResponseDTO = { ...emptyPreview, originalSubtotal: 1300, finalTotal: 1300 };
    const previewQty1: CheckoutPreviewResponseDTO = { ...emptyPreview, originalSubtotal: 650, finalTotal: 650 };

    reqs[1].flush(previewQty2); // la respuesta NUEVA llega primero
    reqs[0].flush(previewQty1); // la VIEJA llega después -> debe ignorarse

    expect(fixture.componentInstance.preview()).toEqual(previewQty2);
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
    expect(fixture.componentInstance.confirming()).toBeFalse();
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
      orderNumber: 1,
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
      orderId: 'xyz', orderNumber: 1, originalSubtotal: 650, discountBreakdown: [], totalDiscountAmount: 0,
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
      orderId: 'xyz', orderNumber: 1, originalSubtotal: 650, discountBreakdown: [], totalDiscountAmount: 0,
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

  it('escribir en el input NO dispara ninguna llamada; solo applyCoupon() lo hace', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.onCouponInput('WELCOME2026');
    tick(300);
    expect(fixture.componentInstance.appliedCouponCode()).toBe(''); // no se aplicó todavía
    httpMock.expectNone(previewUrl); // escribir solo no debe llamar al backend
  }));

  it('applyCoupon() con un cupón válido lo agrega al desglose (DESCUENTO_CUPON)', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.onCouponInput('WELCOME2026');
    fixture.componentInstance.applyCoupon();
    tick(300);

    const req = httpMock.expectOne(previewUrl);
    expect(req.request.body).toEqual({
      items: [{ productId: 'p1', quantity: 1 }],
      couponCode: 'WELCOME2026'
    });

    const withCoupon: CheckoutPreviewResponseDTO = {
      ...emptyPreview,
      discountBreakdown: [
        { ruleName: 'DESCUENTO_CUPON', description: "15% adicional por cupón 'WELCOME2026'.", amountApplied: 97.5, subtotalAfter: 552.5 }
      ],
      totalDiscountAmount: 97.5,
      finalTotal: 552.5
    };
    req.flush(withCoupon);

    expect(fixture.componentInstance.preview()).toEqual(withCoupon);
    expect(fixture.componentInstance.couponFieldError()).toBeNull();
  }));

  it('applyCoupon() con un cupón inválido muestra el mensaje bajo el input y reintenta sin cupón', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.onCouponInput('NOEXISTE');
    fixture.componentInstance.applyCoupon();
    tick(300);

    const req = httpMock.expectOne(previewUrl);
    expect(req.request.body).toEqual({
      items: [{ productId: 'p1', quantity: 1 }],
      couponCode: 'NOEXISTE'
    });
    req.flush({ error: 'Cupón inválido', code: 'INVALID_COUPON' }, { status: 400, statusText: 'Bad Request' });

    // Reintento automático sin cupón para no dejar al usuario sin el resto del desglose
    const retryReq = httpMock.expectOne(previewUrl);
    expect(retryReq.request.body).toEqual({ items: [{ productId: 'p1', quantity: 1 }] });
    retryReq.flush(emptyPreview);

    expect(fixture.componentInstance.couponFieldError()).toBe('El cupón no existe o está expirado.');
    expect(fixture.componentInstance.preview()).toEqual(emptyPreview);
  }));

  it('editar el input del cupón (incluso borrarlo) limpia el mensaje de error en rojo', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    fixture.componentInstance.onCouponInput('NOEXISTE');
    fixture.componentInstance.applyCoupon();
    tick(300);
    httpMock.expectOne(previewUrl).flush({ error: 'Cupón inválido', code: 'INVALID_COUPON' }, { status: 400, statusText: 'Bad Request' });
    httpMock.expectOne(previewUrl).flush(emptyPreview); // reintento sin cupón

    expect(fixture.componentInstance.couponFieldError()).toBe('El cupón no existe o está expirado.');

    // El usuario borra o edita lo que escribió: el mensaje debe desaparecer
    fixture.componentInstance.onCouponInput('');
    expect(fixture.componentInstance.couponFieldError()).toBeNull();

    // Vaciar el cupón cambia appliedCouponCode, lo que dispara un nuevo
    // recálculo automático: lo flusheamos para no dejar timers pendientes
    // al terminar el test (fakeAsync exige que la cola quede vacía).
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);
  }));

  it('editar el input del cupón también limpia el error de confirmación (ej. tras un intento fallido de compra)', () => {
    fixture.detectChanges();
    fixture.componentInstance.confirmError.set('El cupón no existe o está expirado.');

    fixture.componentInstance.onCouponInput('X');

    expect(fixture.componentInstance.confirmError()).toBeNull();
  });

  it('regresión: al vaciar el input después de un cupón inválido, confirmar compra no reenvía ese cupón', fakeAsync(() => {
    fixture.detectChanges();
    cartService.addItem(laptop);
    fixture.detectChanges();
    tick(300);
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    // 1) Se aplica un cupón inválido
    fixture.componentInstance.onCouponInput('dkjhdf');
    fixture.componentInstance.applyCoupon();
    tick(300);
    httpMock.expectOne(previewUrl).flush({ error: "El cupón 'dkjhdf' no existe o está expirado.", code: 'INVALID_COUPON' }, { status: 400, statusText: 'Bad Request' });
    httpMock.expectOne(previewUrl).flush(emptyPreview); // reintento sin cupón
    expect(fixture.componentInstance.couponFieldError()).toContain('no existe o está expirado');

    // 2) El usuario borra el input por completo
    fixture.componentInstance.onCouponInput('');
    tick(300);
    // Al quedar sin cupón, se recalcula el preview de nuevo sin cupón
    httpMock.expectOne(previewUrl).flush(emptyPreview);

    // 3) Confirmar compra NO debe volver a mandar 'dkjhdf' al backend
    fixture.componentInstance.confirmPurchase();
    const req = httpMock.expectOne(checkoutUrl);
    expect(req.request.body).toEqual({ items: [{ productId: 'p1', quantity: 1 }] });
    req.flush({
      orderId: 'ok-123', orderNumber: 1, originalSubtotal: 650, discountBreakdown: [], totalDiscountAmount: 0,
      effectiveDiscountPercentage: 0, discountCapReached: false, finalTotal: 650, createdAt: new Date().toISOString()
    } as CheckoutResponseDTO);

    expect(fixture.componentInstance.confirmedOrder()).not.toBeNull();
  }));
});
