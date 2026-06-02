import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';

describe('roleGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const runGuard = (roles: string | string[], role = 'transportista', isAuth = true): boolean | UrlTree => {
    Object.defineProperty(authService, 'isAuthenticated', { get: () => isAuth, configurable: true });
    Object.defineProperty(authService, 'role', { get: () => role, configurable: true });
    const route = { data: { roles } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as RouterStateSnapshot)
    ) as boolean | UrlTree;
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getRouteForRole'], {
      isAuthenticated: true,
      role: 'transportista',
    });
    authService.getRouteForRole.and.returnValue('/ordenes');
    router = jasmine.createSpyObj('Router', ['parseUrl']);
    router.parseUrl.and.returnValue({ toString: () => '/ordenes' } as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should allow transportista to access transportista route', () => {
    expect(runGuard('transportista')).toBeTrue();
  });

  it('should allow supervisor to access supervisor-only route', () => {
    expect(runGuard('supervisor', 'supervisor')).toBeTrue();
  });

  it('should allow access when roles is array and includes current role', () => {
    expect(runGuard(['supervisor', 'transportista'], 'transportista')).toBeTrue();
  });

  it('should block transportista from supervisor-only route', () => {
    const result = runGuard('supervisor', 'transportista');
    expect(result).not.toBeTrue();
    expect(authService.getRouteForRole).toHaveBeenCalledWith('transportista');
  });

  it('should redirect to /login when not authenticated', () => {
    const result = runGuard('supervisor', 'transportista', false);
    expect(result).not.toBeTrue();
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
  });

  it('should allow all roles to access shared route', () => {
    const sharedRoles = ['supervisor', 'transportista', 'cliente'];
    expect(runGuard(sharedRoles, 'supervisor')).toBeTrue();
    expect(runGuard(sharedRoles, 'transportista')).toBeTrue();
    expect(runGuard(sharedRoles, 'cliente')).toBeTrue();
  });

  it('should block cliente from transportista-only route', () => {
    authService.getRouteForRole.and.returnValue('/catalogo');
    router.parseUrl.and.returnValue({ toString: () => '/catalogo' } as UrlTree);
    const result = runGuard(['supervisor', 'transportista'], 'cliente');
    expect(result).not.toBeTrue();
  });

  it('should call getRouteForRole with the actual current role on block', () => {
    runGuard('supervisor', 'cliente');
    expect(authService.getRouteForRole).toHaveBeenCalledWith('cliente');
  });
});
