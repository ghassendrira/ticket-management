import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let adminState = signal(true);

  beforeEach(() => {
    adminState = signal(true);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['loginAsAdmin', 'logoutAdmin'], {
      isAdminAuthenticated: adminState
    });
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('autorise l acces admin quand la session est authentifiee', () => {
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('redirige vers la page de connexion admin sinon', () => {
    adminState.set(false);
    router.createUrlTree.and.returnValue({} as never);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin/login']);
    expect(result).toEqual(jasmine.any(Object));
  });
});
