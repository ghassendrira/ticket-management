import { Injectable, signal } from '@angular/core';

const REFRESH_TOKEN_KEY = 'refreshToken';
const ACCESS_TOKEN_KEY = 'accessToken';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private accessToken = signal<string | null>(null);

  constructor() {
    // Initialize from localStorage on app start
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedAccessToken) {
      this.accessToken.set(storedAccessToken);
    }
  }

  getAccessToken() {
    const token = this.accessToken();
    console.log('TokenStorageService.getAccessToken called, returning:', token ? 'TOKEN_PRESENT' : 'NULL');
    return token;
  }

  setAccessToken(token: string) {
    console.log('TokenStorageService.setAccessToken called with token:', token ? 'TOKEN_PRESENT' : 'NULL');
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
