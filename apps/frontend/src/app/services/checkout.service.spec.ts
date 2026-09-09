import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CheckoutApiError, CheckoutService } from './checkout.service';
import { environment } from '../../environments/environment';
import { CheckoutPreviewResponseDTO, CheckoutResponseDTO } from '../models/shared';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;
  const checkoutUrl = `${environment.apiUrl}/checkout`;
  const previewUrl = `${environment.apiUrl}/cart/calculate`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('checkout() envía items y couponCode cuando el cupón no está vacío', () => {
    service.checkout([{ productId: 'p1', quantity: 1 }], 'WELCOME2026').subscribe();

    const req = httpMock.expectOne(checkoutUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ items: [{ productId: 'p1', quantity: 1 }], couponCode: 'WELCOME2026' });
    req.flush({} as CheckoutResponseDTO);
  });

  it('checkout() omite couponCode del body si viene vacío o solo espacios (edge case)', () => {
    service.checkout([{ productId: 'p1', quantity: 1 }], '   ').subscribe();

    const req = httpMock.expectOne(checkoutUrl);
    expect(req.request.body).toEqual({ items: [{ productId: 'p1', quantity: 1 }] });
    req.flush({} as CheckoutResponseDTO);
  });

  it('checkout() mapea un error de negocio del backend (ej. stock insuficiente) a CheckoutApiError', (done) => {
    service.checkout([{ productId: 'p1', quantity: 999 }], undefined).subscribe({
      error: (err: CheckoutApiError) => {
        expect(err).toBeInstanceOf(CheckoutApiError);
        expect(err.apiError.code).toBe('INSUFFICIENT_STOCK');
        done();
      }
    });

    const req = httpMock.expectOne(checkoutUrl);
    req.flush({ error: 'Stock insuficiente', code: 'INSUFFICIENT_STOCK' }, { status: 409, statusText: 'Conflict' });
  });

  it('checkout() mapea un error de red/sin cuerpo a un código genérico (edge case)', (done) => {
    service.checkout([{ productId: 'p1', quantity: 1 }], undefined).subscribe({
      error: (err: CheckoutApiError) => {
        expect(err.apiError.code).toBe('INVALID_CART_DATA');
        done();
      }
    });

    const req = httpMock.expectOne(checkoutUrl);
    req.error(new ProgressEvent('network error'));
  });

  it('preview() pega a /cart/calculate, no a /checkout', () => {
    service.preview([{ productId: 'p1', quantity: 1 }], undefined).subscribe();

    const req = httpMock.expectOne(previewUrl);
    expect(req.request.url).toBe(previewUrl);
    req.flush({} as CheckoutPreviewResponseDTO);
    httpMock.expectNone(checkoutUrl);
  });

  it('preview() propaga errores de negocio igual que checkout() (ej. cupón inválido)', (done) => {
    service.preview([{ productId: 'p1', quantity: 1 }], 'NOEXISTE').subscribe({
      error: (err: CheckoutApiError) => {
        expect(err.apiError.code).toBe('INVALID_COUPON');
        done();
      }
    });

    const req = httpMock.expectOne(previewUrl);
    req.flush({ error: 'Cupón inválido', code: 'INVALID_COUPON' }, { status: 400, statusText: 'Bad Request' });
  });
});
