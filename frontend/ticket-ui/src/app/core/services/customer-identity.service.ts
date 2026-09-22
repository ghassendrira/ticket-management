import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CustomerIdentityService {
  private readonly STORAGE_KEY = 'rag_customer_id';
  private readonly EMAIL_KEY = 'rag_customer_email';
  private readonly baseUrl = `${environment.conversationApiUrl}/customers`;

  private readonly http = inject(HttpClient);

  // Reactive signal holding the currently linked email (or null)
  readonly email = signal<string | null>(this._readEmailFromStorage());

  getCustomerId(): string {
    const stored = localStorage.getItem(this.STORAGE_KEY)?.trim();

    if (stored) {
      return stored;
    }

    const nextId = globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(this.STORAGE_KEY, nextId);
    return nextId;
  }

  setCustomerId(customerId: string): void {
    localStorage.setItem(this.STORAGE_KEY, customerId.trim());
  }

  getEmail(): string | null {
    return this.email();
  }

  linkEmail(email: string): Observable<void> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.http
      .post<void>(`${this.baseUrl}/link`, {
        customerId: this.getCustomerId(),
        email: normalizedEmail
      })
      .pipe(
        tap(() => {
          localStorage.setItem(this.EMAIL_KEY, normalizedEmail);
          this.email.set(normalizedEmail);
        })
      );
  }

  retrieveByEmail(email: string): Observable<{ customerId: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.http
      .get<{ customerId: string }>(`${this.baseUrl}/by-email`, {
        params: { email: normalizedEmail }
      })
      .pipe(
        tap((response) => {
          this.setCustomerId(response.customerId);
          localStorage.setItem(this.EMAIL_KEY, normalizedEmail);
          this.email.set(normalizedEmail);
        })
      );
  }

  /**
   * Logout: remove linked email and regenerate anonymous id.
   */
  logout(): void {
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.STORAGE_KEY);
    this.email.set(null);
    // regenerate a fresh anonymous id for subsequent operations
    this.getCustomerId();
  }

  // kept for backward compatibility
  clearIdentity(): void {
    this.logout();
  }

  private _readEmailFromStorage(): string | null {
    return localStorage.getItem(this.EMAIL_KEY)?.trim() || null;
  }
}
