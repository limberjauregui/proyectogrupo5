// Auth Guard - Functional guard (Angular 15+)
// Checks if user is authenticated before allowing route access

import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  return router.parseUrl('/login');
};

// Deprecated class export (for backwards compatibility if needed)
// Use authGuard function instead in new code
