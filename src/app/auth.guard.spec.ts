import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const runGuard = (): boolean | UrlTree =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean | UrlTree;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', [], { isAuthenticated: false });
    router = jasmine.createSpyObj('Router', ['parseUrl']);
    router.parseUrl.and.returnValue({ toString: () => '/login' } as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should return true when authenticated', () => {
    Object.defineProperty(authService, 'isAuthenticated', { get: () => true, configurable: true });
    expect(runGuard()).toBeTrue();
  });

  it('should return a UrlTree to /login when not authenticated', () => {
    Object.defineProperty(authService, 'isAuthenticated', { get: () => false, configurable: true });
    const result = runGuard();
    expect(result).not.toBeTrue();
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
  });

  it('should not call router.parseUrl when authenticated', () => {
    Object.defineProperty(authService, 'isAuthenticated', { get: () => true, configurable: true });
    router.parseUrl.calls.reset();
    runGuard();
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('should call router.parseUrl exactly once when not authenticated', () => {
    Object.defineProperty(authService, 'isAuthenticated', { get: () => false, configurable: true });
    router.parseUrl.calls.reset();
    runGuard();
    expect(router.parseUrl).toHaveBeenCalledTimes(1);
  });
});
