import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { TokenStorageService } from './token-storage.service';
import { AuthResponse } from '../../features/auth/models/auth-response.model';
import { LoginRequest } from '../../features/auth/models/login-request.model';
import { RegisterRequest } from '../../features/auth/models/register-request.model';
import { User } from '../../features/auth/models/user.model';

export type { AuthResponse } from '../../features/auth/models/auth-response.model';
export type { LoginRequest } from '../../features/auth/models/login-request.model';
export type { RegisterRequest } from '../../features/auth/models/register-request.model';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  username?: string;
}

export interface UserResponse extends User {}

const ADMIN_TOKEN_KEY = 'rag-admin-token';

function decodeJwtPayload(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authCheckedState = signal<boolean>(false);
  private readonly adminTokenState = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  );
  private readonly mockUserState = signal<UserResponse | null>(null);

  readonly authChecked = computed(() => this.authCheckedState());

  readonly isAuthenticated = computed(() => {
    const accessToken = this.tokenStorage.getAccessToken();
    return !!accessToken;
  });

  readonly currentUser = computed<UserResponse | null>(() => {
    const accessToken = this.tokenStorage.getAccessToken();
    if (accessToken) {
      const payload = decodeJwtPayload(accessToken);
      if (payload) {
        return {
          id: payload.sub || payload.id || 'mock-id',
          username: payload.username || payload.email || 'mock-user',
          role: payload.role || 'AGENT',
          fullName: payload.fullName || payload.name || 'Mock User'
        } as UserResponse;
      }
    }
    return this.mockUserState();
  });

  readonly isAdminAuthenticated = computed(() => !!this.adminTokenState() || this.isAuthenticated());

  constructor(
    private readonly authApi: AuthApiService,
    private readonly tokenStorage: TokenStorageService,
    private readonly router: Router
  ) {
    const token = this.tokenStorage.getAccessToken();
    if (token) {
      this.authCheckedState.set(true);
    }
  }

  login(email: string, password: string): Observable<AuthResponse>;
  login(payload: LoginRequest | { email: string; password: string }): Observable<AuthResponse>;
  login(
    payloadOrEmail: LoginRequest | { email: string; password: string } | string,
    password?: string
  ): Observable<AuthResponse> {
    let request: LoginRequest;
    if (typeof payloadOrEmail === 'string') {
      request = { username: payloadOrEmail, password: password as string };
    } else if ('email' in payloadOrEmail && !('username' in payloadOrEmail)) {
      request = { username: payloadOrEmail.email, password: payloadOrEmail.password };
    } else {
      request = payloadOrEmail as LoginRequest;
    }
    return this.authApi.login(request).pipe(
      tap((res) => {
        this.tokenStorage.setAccessToken(res.accessToken);
        this.tokenStorage.setRefreshToken(res.refreshToken);
        this.mockUserState.set(res.user as UserResponse);
        this.authCheckedState.set(true);
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.authApi.register(data).pipe(
      tap((res) => {
        this.tokenStorage.setAccessToken(res.accessToken);
        this.tokenStorage.setRefreshToken(res.refreshToken);
        this.mockUserState.set(res.user as UserResponse);
        this.authCheckedState.set(true);
      })
    );
  }

  logout(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (refreshToken) {
      this.authApi.logout(refreshToken).subscribe({
        error: () => {}
      });
    }
    this.tokenStorage.clearTokens();
    this.mockUserState.set(null);
    this.adminTokenState.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    this.authCheckedState.set(false);
    void this.router.navigate(['/login']);
  }

  logoutAdmin(): void {
    this.tokenStorage.clearTokens();
    this.adminTokenState.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    this.mockUserState.set(null);
    this.authCheckedState.set(false);
    void this.router.navigate(['/admin/login']);
  }

  loginAsAdmin(): void {
    const mockAdminToken = 'mock-admin-token-' + Date.now();
    this.adminTokenState.set(mockAdminToken);
    this.tokenStorage.setAccessToken(mockAdminToken);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_TOKEN_KEY, mockAdminToken);
    }
    this.mockUserState.set({
      id: 'admin-1',
      username: 'admin',
      role: 'ADMIN',
      fullName: 'Administrator'
    });
    this.authCheckedState.set(true);
  }

  getToken(): string | null {
    const accessToken = this.tokenStorage.getAccessToken();
    if (accessToken) return accessToken;
    return this.adminTokenState();
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.authApi.changePassword(data);
  }

  forgotPassword(email: string): Observable<void> {
    return this.authApi.forgotPassword(email);
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.authApi.resetPassword(token, newPassword);
  }

  updateProfile(data: Partial<UserResponse>): Observable<UserResponse> {
    this.mockUserState.update((current) => (current ? { ...current, ...data } : null));
    return of(this.mockUserState() as UserResponse);
  }

  getCurrentUser(): Observable<UserResponse> {
    const user = this.currentUser();
    if (user) {
      return of(user);
    }
    return of({
      id: 'mock-id',
      username: 'mock-user',
      role: 'AGENT',
      fullName: 'Mock User'
    });
  }
}
