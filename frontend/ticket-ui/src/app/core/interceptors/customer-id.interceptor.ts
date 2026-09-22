import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { CustomerIdentityService } from '../services/customer-identity.service';

export const customerIdInterceptor: HttpInterceptorFn = (req, next) => {
  const identityService = inject(CustomerIdentityService);

  if (req.url.includes('/api/') && !req.url.includes('/api/admin/')) {
    const customerId = identityService.getCustomerId();
    const clonedRequest = req.clone({
      setHeaders: {
        'X-Customer-Id': customerId
      }
    });

    return next(clonedRequest);
  }

  return next(req);
};
