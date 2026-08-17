import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { first, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si déjà authentifié, laisser passer immédiatement
  if (authService.isAuthenticated()) {
    return true;
  }

  // Attendre que la vérification de session au démarrage soit terminée
  return toObservable(authService.authChecked).pipe(
    first((checked) => checked === true),
    map(() => {
      if (authService.isAuthenticated()) {
        return true;
      }
      return router.parseUrl('/auth/login');
    })
  );
};