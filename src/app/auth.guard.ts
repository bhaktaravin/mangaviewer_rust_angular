import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.authenticated()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};

export const guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.authenticated()) {
    return true;
  } else {
    router.navigate(['/home']);
    return false;
  }
};
