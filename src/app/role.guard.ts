// Role Guard - Functional guard (Angular 15+)
// Checks if user has required role before allowing route access

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return router.parseUrl('/login');
  }

  const allowedRoles = route.data['roles'] as UserRole[] | UserRole | undefined;
  const currentRole = authService.role;

  if (!currentRole) {
    return router.parseUrl('/login');
  }

  const isAllowed = Array.isArray(allowedRoles)
    ? allowedRoles.includes(currentRole)
    : allowedRoles === currentRole;

  if (isAllowed || !allowedRoles) {
    return true;
  }

  return router.parseUrl(authService.getRouteForRole(currentRole));
};

// Deprecated class export (for backwards compatibility if needed)
// Use roleGuard function instead in new code
