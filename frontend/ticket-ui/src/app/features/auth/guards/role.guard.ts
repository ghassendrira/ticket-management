import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

export const roleGuard = (allowedRoles: ('ADMIN' | 'AGENT' | 'MANAGER')[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.parseUrl('/');
    }

    const currentUser = authService.currentUser();
    if (currentUser && (allowedRoles as string[]).includes(currentUser.role)) {
      return true;
    }

    // If not allowed, redirect to dashboard or 403
    return router.parseUrl('/dashboard');
  };
};
