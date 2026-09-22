import { Injectable, signal } from '@angular/core';

export const REFRESH_TOKEN_KEY = 'refreshToken';
export const ACCESS_TOKEN_KEY = 'accessToken';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private accessToken = signal<string | null>(null);

  constructor() {
    const storedAccessToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    if (storedAccessToken) {
      this.accessToken.set(storedAccessToken);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  setAccessToken(token: string) {
    this.accessToken.set(token);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  clearTokens() {
    this.accessToken.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
