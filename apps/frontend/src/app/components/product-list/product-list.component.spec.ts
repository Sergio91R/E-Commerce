import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ProductListComponent } from './product-list.component';
import { CartService } from '../../services/cart.service';
import { OrderConfirmationService } from '../../services/order-confirmation.service';
import { environment } from '../../../environments/environment';
import { Product, CheckoutResponseDTO } from '../../models/shared';

const laptop: Product = { id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 5 };
const laptopStockDown: Product = { ...laptop, stock: 4 };

const confirmedOrder: CheckoutResponseDTO = {
  orderId: 'abc123',
  orderNumber: 1,
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
  const productsUrl = `${environment.apiUrl}/products`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    httpMock = TestBed.inject(HttpTestingController);
    cartService = TestBed.inject(CartService);
    orderConfirmationService = TestBed.inject(OrderConfirmationService);

    fixture.detectChanges();
    httpMock.expectOne(productsUrl).flush([laptop]);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('permite agregar productos cuando no hay ninguna orden confirmada', () => {
    fixture.componentInstance.addToCart(laptop);
    expect(cartService.lines().length).toBe(1);
  });

  it('renderiza la foto del producto cuando trae imageUrl', () => {
    fixture.componentInstance.products.set([{ ...laptop, imageUrl: '/assets/products/p1.svg' }]);
    fixture.detectChanges();

    const img = fixture.debugElement.query(By.css('img.product-img'));
    expect(img).not.toBeNull();
    expect(img.nativeElement.getAttribute('src')).toBe('/assets/products/p1.svg');
    expect(fixture.debugElement.query(By.css('.product-img--empty'))).toBeNull();
  });

  it('muestra el placeholder 📷 cuando el producto no tiene imageUrl', () => {
    // el `laptop` del beforeEach no trae imageUrl
    expect(fixture.debugElement.query(By.css('img.product-img'))).toBeNull();
    const ph = fixture.debugElement.query(By.css('.product-img--empty'));
    expect(ph).not.toBeNull();
    expect(ph.nativeElement.textContent).toContain('📷');
  });

  it('cae al placeholder si la foto falla (evento error de la img)', () => {
    fixture.componentInstance.products.set([{ ...laptop, imageUrl: '/assets/products/roto.svg' }]);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('img.product-img')).triggerEventHandler('error', {});
    fixture.detectChanges();

    expect(fixture.componentInstance.failedImages.has('p1')).toBe(true);
    expect(fixture.debugElement.query(By.css('img.product-img'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.product-img--empty'))).not.toBeNull();
  });

  it('no muestra el overlay de bloqueo cuando no hay orden confirmada', () => {
    const overlay = fixture.debugElement.query(By.css('.locked-overlay'));
    expect(overlay).toBeNull();
  });

  it('bloquea el catálogo (no agrega productos) cuando hay una orden confirmada', () => {
    orderConfirmationService.setConfirmedOrder(confirmedOrder);
    fixture.detectChanges();
    // Confirmar una orden dispara un refresco automático del catálogo.
    httpMock.expectOne(productsUrl).flush([laptopStockDown]);

    fixture.componentInstance.addToCart(laptop);
    expect(cartService.isEmpty()).toBe(true);

    const overlay = fixture.debugElement.query(By.css('.locked-overlay'));
    expect(overlay).not.toBeNull();
  });

  it('desbloquea el catálogo de nuevo si la orden confirmada se limpia', () => {
    orderConfirmationService.setConfirmedOrder(confirmedOrder);
    fixture.detectChanges();
    httpMock.expectOne(productsUrl).flush([laptopStockDown]);

    orderConfirmationService.clear();
    fixture.detectChanges();

    fixture.componentInstance.addToCart(laptop);
    expect(cartService.lines().length).toBe(1);
    expect(fixture.debugElement.query(By.css('.locked-overlay'))).toBeNull();
  });

  it('al confirmar una orden, vuelve a pedir el catálogo para reflejar el stock real actualizado', () => {
    expect(fixture.componentInstance.products()[0].stock).toBe(5);

    orderConfirmationService.setConfirmedOrder(confirmedOrder);
    fixture.detectChanges();

    const req = httpMock.expectOne(productsUrl);
    expect(req.request.method).toBe('GET');
    req.flush([laptopStockDown]);
    fixture.detectChanges();

    expect(fixture.componentInstance.products()[0].stock).toBe(4);
  });

  it('availableStock() resta lo que ya está en el carrito (sin tocar el stock real del catálogo)', () => {
    expect(fixture.componentInstance.availableStock(laptop)).toBe(5);

    fixture.componentInstance.addToCart(laptop);
    expect(fixture.componentInstance.availableStock(laptop)).toBe(4);
    expect(fixture.componentInstance.products()[0].stock).toBe(5); // el dato crudo no cambia

    fixture.componentInstance.addToCart(laptop);
    expect(fixture.componentInstance.availableStock(laptop)).toBe(3);
  });

  it('availableStock() vuelve a subir cuando se quita el producto del carrito', () => {
    fixture.componentInstance.addToCart(laptop);
    fixture.componentInstance.addToCart(laptop);
    expect(fixture.componentInstance.availableStock(laptop)).toBe(3);

    cartService.decrementItem(laptop.id);
    expect(fixture.componentInstance.availableStock(laptop)).toBe(4);

    cartService.removeItem(laptop.id);
    expect(fixture.componentInstance.availableStock(laptop)).toBe(5);
  });

  it('no deja agregar más una vez que availableStock llega a 0', () => {
    for (let i = 0; i < 5; i++) {
      fixture.componentInstance.addToCart(laptop);
    }
    expect(fixture.componentInstance.availableStock(laptop)).toBe(0);
    expect(cartService.lines()[0].quantity).toBe(5);

    fixture.componentInstance.addToCart(laptop); // intento número 6, no debería sumar más
    expect(cartService.lines()[0].quantity).toBe(5);
  });
});
