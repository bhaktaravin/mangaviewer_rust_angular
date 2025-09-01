import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar">
      <div class="navbar-container">
        <!-- Logo -->
        <a routerLink="/" class="navbar-brand">
          📚 Manga Viewer
        </a>

        <!-- Navigation Links -->
        <div class="navbar-nav">
          <!-- Theme Toggle -->
          <button 
            class="theme-toggle" 
            (click)="toggleTheme()"
            [title]="isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            {{ isDarkMode() ? '☀️' : '🌙' }}
          </button>

          @if (isAuthenticated() && user()) {
            <!-- Authenticated User Navigation -->
            <a routerLink="/home" class="nav-link" routerLinkActive="active">Home</a>
            <a routerLink="/library" class="nav-link" routerLinkActive="active">Library</a>
            <a routerLink="/search" class="nav-link" routerLinkActive="active">Search</a>
            <a routerLink="/profile" class="nav-link" routerLinkActive="active">Profile</a>
            
            <!-- Admin Link (only for admin users) -->
            @if (isAdmin()) {
              <a routerLink="/admin" class="nav-link admin-link" routerLinkActive="active">
                🛡️ Admin
              </a>
            }
            
            <!-- User Menu -->
            <div class="user-menu">
              <span class="user-greeting">
                {{ user()!.username }}
                @if (isGuestMode()) {
                  <span class="guest-badge">DEMO</span>
                }
              </span>
              <button class="btn btn-outline btn-sm" (click)="logout()">
                Logout
              </button>
            </div>
          } @else {
            <!-- Guest Navigation -->
            <a routerLink="/home" class="nav-link" routerLinkActive="active">Home</a>
            <a routerLink="/library" class="nav-link" routerLinkActive="active">Demo Library</a>
            <a routerLink="/search" class="nav-link" routerLinkActive="active">Search</a>
            <div class="auth-links">
              <a routerLink="/login" class="nav-link" routerLinkActive="active">Login</a>
              <a routerLink="/register" class="nav-link" routerLinkActive="active">Register</a>
            </div>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .navbar-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar-brand {
      font-size: 1.5rem;
      font-weight: bold;
      text-decoration: none;
      color: white;
      transition: opacity 0.3s ease;
    }

    .navbar-brand:hover {
      opacity: 0.8;
    }

    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .nav-link {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 5px;
      transition: all 0.3s ease;
      font-weight: 500;
    }

    .nav-link:hover,
    .nav-link.active {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .admin-link {
      background-color: rgba(220, 53, 69, 0.2) !important;
      border: 1px solid rgba(220, 53, 69, 0.5);
      font-weight: 600;
    }

    .admin-link:hover {
      background-color: rgba(220, 53, 69, 0.3) !important;
      border-color: rgba(220, 53, 69, 0.7);
    }

    .theme-toggle {
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.5rem;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1.2rem;
      margin-right: 1rem;
    }

    .theme-toggle:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.05);
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-left: 1rem;
      padding-left: 1rem;
      border-left: 1px solid rgba(255, 255, 255, 0.3);
    }

    .user-greeting {
      font-weight: 500;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .guest-badge {
      background: rgba(255, 193, 7, 0.9);
      color: #212529;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .auth-links {
      display: flex;
      gap: 1rem;
      margin-left: 1rem;
      padding-left: 1rem;
      border-left: 1px solid rgba(255, 255, 255, 0.3);
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .btn-outline {
      background: transparent;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: white;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .navbar-container {
        flex-direction: column;
        gap: 1rem;
      }
      
      .navbar-nav {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .user-menu {
        margin-left: 0;
        padding-left: 0;
        border-left: none;
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        padding-top: 0.5rem;
      }
      
      .auth-links {
        display: flex;
        gap: 0.5rem;
        margin-left: auto;
      }
    }
  `]
})
export class NavbarComponent {
  user = computed(() => this.authService.user());
  isAuthenticated = computed(() => this.authService.authenticated());
  isDarkMode = computed(() => this.themeService.isDark());
  isAdmin = computed(() => this.authService.isAdmin());
  isGuestMode = computed(() => this.authService.isGuestMode());

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
  }
}
