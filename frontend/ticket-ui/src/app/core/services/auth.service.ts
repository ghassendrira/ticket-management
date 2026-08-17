import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, Observable, tap } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { TokenStorageService } from './token-storage.service';
import { AssignmentService } from './assignment.service';

// --- TYPES ---
export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface ChangePasswordRequest {
  username: string;
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'MANAGER';
  fullName: string;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

interface AuthSuccessOptions {
  navigate?: boolean;
}

// --- SERVICE ---
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<UserResponse | null>(null);
  readonly isAuthenticated = signal(false);
  readonly authChecked = signal(false);

  constructor(
    private authApi: AuthApiService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private assignmentService: AssignmentService
  ) {
    const storedRefresh = this.tokenStorage.getRefreshToken();
    if (storedRefresh) {
      this.restoreSession(storedRefresh);
    } else {
      this.authChecked.set(true);
    }
  }

  login(request: LoginRequest) {
    return this.authApi.login(request).pipe(
      tap((response) => {
        this.handleAuthSuccess(response, { navigate: true });

        if (response.user.role === 'AGENT') {
          this.assignmentService.updateAgentStatus(response.user.id, true).subscribe({
            error: (err: Error) => console.error('Failed to set online status:', err)
          });
        }
      }),
      catchError((error) => {
        console.error('Login failed:', error);
        throw error;
      })
    );
  }

  register(request: RegisterRequest) {
    return this.authApi.register(request).pipe(
      tap((response) => this.handleAuthSuccess(response, { navigate: true })),
      catchError((error) => {
        console.error('Register failed:', error);
        throw error;
      })
    );
  }

  forgotPassword(email: string) {
    return this.authApi.forgotPassword(email).pipe(
      catchError((error) => {
        console.error('Forgot password failed:', error);
        throw error;
      })
    );
  }

  resetPassword(token: string, password: string) {
    return this.authApi.resetPassword(token, password).pipe(
      catchError((error) => {
        console.error('Reset password failed:', error);
        throw error;
      })
    );
  }

  changePassword(request: ChangePasswordRequest) {
    return this.authApi.changePassword(request).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) {
          this.currentUser.set({ ...user, mustChangePassword: false });
        }
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        console.error('Change password failed:', error);
        throw error;
      })
    );
  }

  logout(): void {
    const user = this.currentUser();

    if (user?.role === 'AGENT') {
      this.assignmentService.updateAgentStatus(user.id, false).subscribe({
        next: () => this.performLogout(),
        error: () => this.performLogout()
      });
    } else {
      this.performLogout();
    }
  }

  private performLogout(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (refreshToken) {
      this.authApi.logout(refreshToken).subscribe({
        error: (err: Error) => console.error('Logout API call failed:', err),
      });
    }

    this.tokenStorage.clearTokens();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.authChecked.set(true);
    this.router.navigate(['/auth/login']);
  }

  refreshAccessToken(token: string): Observable<AuthResponse> {
    return this.authApi.refresh(token).pipe(
      tap((response) => this.handleAuthSuccess(response, { navigate: false })),
      catchError((error) => {
        console.error('Token refresh failed:', error);
        this.logout();
        return EMPTY;
      })
    );
  }

  private restoreSession(refreshToken: string): void {
    this.authApi.refresh(refreshToken).subscribe({
      next: (response) => {
        this.handleAuthSuccess(response, { navigate: false });
        this.authChecked.set(true);

        if (response.user.role === 'AGENT') {
          this.assignmentService.updateAgentStatus(response.user.id, true).subscribe({
            error: (err: Error) => console.error('Failed to restore online status:', err)
          });
        }
      },
      error: () => {
        this.tokenStorage.clearTokens();
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.authChecked.set(true);
      },
    });
  }

  private handleAuthSuccess(response: AuthResponse, options: AuthSuccessOptions = {}): void {
    const { navigate = false } = options;

    this.tokenStorage.setAccessToken(response.accessToken);
    this.tokenStorage.setRefreshToken(response.refreshToken);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);

    if (!navigate) {
      return;
    }

    if (response.user.mustChangePassword) {
      this.router.navigate(['/change-password']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}