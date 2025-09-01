import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  // Redirect to home if not admin
  router.navigate(['/home']);
  return false;
};

export const moderatorGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isModerator()) {
    return true;
  }

  // Redirect to home if not moderator or admin
  router.navigate(['/home']);
  return false;
};
