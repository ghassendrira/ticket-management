import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from './auth.service';

const API_URL = `${environment.authApiUrl}/api/auth`;

/**
 * Raw auth HTTP calls via HttpBackend so they never pass through HttpClient interceptors.
 * Keeps refresh/logout from re-entering authInterceptor and avoids AuthService DI cycles.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = new HttpClient(inject(HttpBackend));

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/login`, request);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/register`, request);
  }

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/refresh`, { refreshToken });
  }

  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/logout`, { refreshToken });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/reset-password`, { token, password });
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${API_URL}/change-password`, request);
  }
}
