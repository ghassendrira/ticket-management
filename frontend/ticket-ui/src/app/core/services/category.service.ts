import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Category } from '../../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly apiUrl = `${environment.kbApiUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  createCategory(payload: Pick<Category, 'name' | 'description'>): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, payload);
  }

  updateCategory(categoryId: string, payload: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${categoryId}`, payload);
  }

  deleteCategory(categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${categoryId}`);
  }
}
