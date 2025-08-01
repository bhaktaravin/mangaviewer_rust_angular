import { Routes } from '@angular/router';
import { Home } from "./home/home";
import { LoginComponent } from "./login/login";
import { RegisterComponent } from "./register/register";
import { ProfileComponent } from "./profile/profile";
import { MangaSearchComponent } from "./manga-search/manga-search";
import { MangaDetailComponent } from "./manga-detail/manga-detail.component";
import { LibraryComponent } from "./library/library";
import { authGuard, guestGuard } from "./auth.guard";

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'library', component: LibraryComponent }, // Removed auth guard to allow guest access
  { path: 'search', component: MangaSearchComponent },
  { path: 'manga/:id', component: MangaDetailComponent }, // Add manga detail route
  { path: '**', redirectTo: '/home' } // Wildcard route for 404s
];
