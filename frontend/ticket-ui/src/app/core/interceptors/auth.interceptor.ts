import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { TokenStorageService } from '../services/token-storage.service';

function clearSession(tokenStorage: TokenStorageService, router: Router): void {
  tokenStorage.clearTokens();
  router.navigate(['/auth/login']);
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const tokenStorage = inject(TokenStorageService);
  const authApi = inject(AuthApiService);
  const router = inject(Router);

  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  const accessToken = tokenStorage.getAccessToken();
  const authReq = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        clearSession(tokenStorage, router);
        return throwError(() => error);
      }

      return authApi.refresh(refreshToken).pipe(
        switchMap((response) => {
          tokenStorage.setAccessToken(response.accessToken);
          tokenStorage.setRefreshToken(response.refreshToken);

          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${response.accessToken}` },
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          clearSession(tokenStorage, router);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
