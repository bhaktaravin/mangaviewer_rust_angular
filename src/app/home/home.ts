import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Apiservice } from '../apiservice';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  isAuthenticated = signal(false);
  user = signal<any>(null);
  recentManga = signal<any[]>([]);
  stats = signal({
    totalManga: 0,
    currentlyReading: 0,
    completed: 0,
    planToRead: 0
  });

  constructor(
    private authService: AuthService,
    private apiService: Apiservice,
    private router: Router
  ) {
    this.isAuthenticated.set(this.authService.authenticated());
    if (this.isAuthenticated()) {
      const currentUser = this.authService.user();
      if (currentUser) {
        this.user.set(currentUser);
        this.loadUserData();
      }
    }
  }

  private loadUserData(): void {
    // Load recent manga
    this.apiService.getAllManga().subscribe({
      next: (response: any) => {
        if (response && response.manga) {
          const sortedManga = response.manga
            .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 6);
          this.recentManga.set(sortedManga);
        }
      },
      error: (error: any) => {
        console.error('Error loading recent manga:', error);
        this.recentManga.set([]);
      }
    });

    // Load user statistics
    this.apiService.getLibraryStats().subscribe({
      next: (response: any) => {
        if (response) {
          this.stats.set(response);
        }
      },
      error: (error: any) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  goToLibrary(): void {
    this.router.navigate(['/library']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToSearch(): void {
    // Navigate to library with search functionality
    this.router.navigate(['/library']);
  }

  logout(): void {
    this.authService.logout();
    this.isAuthenticated.set(false);
    this.user.set(null);
    this.recentManga.set([]);
    this.stats.set({
      totalManga: 0,
      currentlyReading: 0,
      completed: 0,
      planToRead: 0
    });
  }

  // Quick access methods for demo
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isGuestMode(): boolean {
    return this.authService.isGuestMode();
  }

  loginAsGuestAdmin(): void {
    this.authService.loginAsGuestAdmin();
    this.isAuthenticated.set(true);
    this.user.set(this.authService.getCurrentUser());
    this.router.navigate(['/admin']);
  }

  loginAsGuest(): void {
    this.authService.loginAsGuest();
    this.isAuthenticated.set(true);
    this.user.set(this.authService.getCurrentUser());
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}