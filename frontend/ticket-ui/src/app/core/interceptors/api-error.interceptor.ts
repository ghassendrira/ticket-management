import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiErrorService } from '../services/api-error.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const apiErrorService = inject(ApiErrorService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        apiErrorService.setError("L'API ne repond pas. Verifiez que le backend Spring Boot tourne bien.");
      } else {
        apiErrorService.setError(error.error?.message || error.message || 'Une erreur API est survenue.');
      }

      return throwError(() => error);
    })
  );
};
