import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: Array<'ADMIN' | 'AGENT' | 'MANAGER'>): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.currentUser();

    if (!user) {
      return router.parseUrl('/login');
    }

    if (!allowedRoles.includes(user.role)) {
      return router.parseUrl('/dashboard');
    }

    return true;
  };
};
