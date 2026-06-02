// Not Found Guard - Functional guard (Angular 15+)
// Handles wildcard routes and redirects to appropriate home route based on auth status

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const notFoundGuard: CanActivateFn = (route, state): boolean => {
  // IMP-1: Redirect authenticated users to their default route, otherwise to login
  const auth = inject(AuthService);
  const router = inject(Router);

  const redirectRoute = auth.getRedirectRoute();
  router.navigateByUrl(redirectRoute);

  // Return false to prevent route activation; router.navigateByUrl will handle actual navigation
  return false;
};

// Deprecated class export (for backwards compatibility if needed)
// Use notFoundGuard function instead in new code
