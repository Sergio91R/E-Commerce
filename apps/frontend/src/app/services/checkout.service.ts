import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiErrorResponse, CartItemDTO, CheckoutPreviewResponseDTO, CheckoutResponseDTO } from '../models/shared';
import { environment } from '../../environments/environment';

export class CheckoutApiError extends Error {
  public constructor(public readonly apiError: ApiErrorResponse) {
    super(apiError.error);
  }
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly checkoutUrl = `${environment.apiUrl}/checkout`;
  private readonly previewUrl = `${environment.apiUrl}/cart/calculate`;

  public constructor(private readonly http: HttpClient) {}

  /**
   * Calcula el desglose de descuentos EN VIVO, sin decrementar stock ni
   * crear ninguna orden. Se llama automáticamente cada vez que cambia el
   * carrito o el cupón mientras el usuario sigue editando.
   */
  public preview(items: CartItemDTO[], couponCode: string | undefined): Observable<CheckoutPreviewResponseDTO> {
    return this.post<CheckoutPreviewResponseDTO>(this.previewUrl, items, couponCode);
  }

  /**
   * Confirma la compra: decrementa stock real y persiste la orden. A partir
   * de esta llamada el carrito se considera cerrado.
   */
  public checkout(items: CartItemDTO[], couponCode: string | undefined): Observable<CheckoutResponseDTO> {
    return this.post<CheckoutResponseDTO>(this.checkoutUrl, items, couponCode);
  }

  private post<T>(url: string, items: CartItemDTO[], couponCode: string | undefined): Observable<T> {
    const body: { items: CartItemDTO[]; couponCode?: string } = { items };
    if (couponCode && couponCode.trim().length > 0) {
      body.couponCode = couponCode.trim();
    }

    return this.http.post<T>(url, body).pipe(
      catchError((response: HttpErrorResponse) => {
        const apiError: ApiErrorResponse = response.error?.code
          ? response.error
          : { error: 'Error de red o del servidor.', code: 'INVALID_CART_DATA' };
        return throwError(() => new CheckoutApiError(apiError));
      })
    );
  }
}
