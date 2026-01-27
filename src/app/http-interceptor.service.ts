import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, finalize } from 'rxjs';
import { LoadingService } from './loading.service';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  const router = inject(Router);

  // Start loading
  loadingService.show();

  // Clone request to add timestamp for cache busting if needed
  const clonedReq = req.clone();

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
        console.error('Client-side error:', error.error.message);
      } else {
        // Server-side error
        console.error(`Server error ${error.status}:`, error.error);
        
        switch (error.status) {
          case 401:
            errorMessage = 'Unauthorized. Please log in.';
            // Clear token and redirect to login
            localStorage.removeItem('authToken');
            router.navigate(['/login']);
            break;
          case 403:
            errorMessage = 'Access forbidden.';
            break;
          case 404:
            errorMessage = 'Resource not found.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          case 503:
            errorMessage = 'Service temporarily unavailable.';
            break;
          default:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
        }
      }

      // Log for debugging
      console.error('HTTP Error:', {
        status: error.status,
        message: errorMessage,
        url: error.url,
        timestamp: new Date().toISOString()
      });

      return throwError(() => ({ message: errorMessage, error }));
    }),
    finalize(() => {
      // Stop loading
      loadingService.hide();
    })
  );
};
