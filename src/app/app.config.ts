<<<<<<< HEAD
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
=======
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
>>>>>>> server
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
<<<<<<< HEAD
    provideZoneChangeDetection({ eventCoalescing: true }),
=======
    provideZonelessChangeDetection(),
>>>>>>> server
    provideRouter(routes),
    provideHttpClient()
  ]
};
