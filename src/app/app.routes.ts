import { Routes } from '@angular/router';
import { authGuard, guestGuard } from "./auth.guard";
import { adminGuard } from "./admin.guard";

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { 
    path: 'home', 
    loadComponent: () => import('./home/home').then(m => m.HomeComponent)
  },
  { 
    path: 'login', 
    loadComponent: () => import('./login/login').then(m => m.LoginComponent),
    canActivate: [guestGuard] 
  },
  { 
    path: 'register', 
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard] 
  },
  { 
    path: 'profile', 
    loadComponent: () => import('./profile/profile').then(m => m.ProfileComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard] 
  },
  { 
    path: 'admin-demo', 
    loadComponent: () => import('./admin-demo/admin-demo.component').then(m => m.AdminDemoComponent)
  },
  { 
    path: 'library', 
    loadComponent: () => import('./library/library').then(m => m.LibraryComponent)
  },
  { 
    path: 'search', 
    loadComponent: () => import('./manga-search/manga-search').then(m => m.MangaSearchComponent)
  },
  { 
    path: 'manga/:id', 
    loadComponent: () => import('./manga-detail/manga-detail').then(m => m.MangaDetailComponent)
  },
  { 
    path: 'read/:id', 
    loadComponent: () => import('./manga-viewer/manga-viewer').then(m => m.MangaViewerComponent)
  },
  { 
    path: 'read/:id/:chapterId', 
    loadComponent: () => import('./manga-viewer/manga-viewer').then(m => m.MangaViewerComponent)
  },
  { path: '**', redirectTo: '/home' }
];
