import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiErrorResponse, CartItemDTO, CheckoutResponseDTO } from '../models/shared';
import { environment } from '../../environments/environment';

export class CheckoutApiError extends Error {
  public constructor(public readonly apiError: ApiErrorResponse) {
    super(apiError.error);
  }
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly baseUrl = `${environment.apiUrl}/checkout`;

  public constructor(private readonly http: HttpClient) {}

  public checkout(items: CartItemDTO[], couponCode: string | undefined): Observable<CheckoutResponseDTO> {
    const body: { items: CartItemDTO[]; couponCode?: string } = { items };
    if (couponCode && couponCode.trim().length > 0) {
      body.couponCode = couponCode.trim();
    }

    return this.http.post<CheckoutResponseDTO>(this.baseUrl, body).pipe(
      catchError((response: HttpErrorResponse) => {
        const apiError: ApiErrorResponse = response.error?.code
          ? response.error
          : { error: 'Error de red o del servidor.', code: 'INVALID_CART_DATA' };
        return throwError(() => new CheckoutApiError(apiError));
      })
    );
  }
}
