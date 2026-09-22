import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const user = authService.currentUser();

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (user && !req.url.includes('/api/auth/')) {
    headers['X-User-Id'] = user.id;
    headers['X-User-Role'] = user.role;
  }

  const cloned = req.clone({ setHeaders: headers });
  return next(cloned);
};
