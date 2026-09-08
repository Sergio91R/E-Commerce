import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/products`;

  public constructor(private readonly http: HttpClient) {}

  public getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }
}
