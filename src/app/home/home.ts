

import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth.service';
import { Apiservice } from '../apiservice';
import { Manga } from '../interfaces/manga';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css'
})

export class HomeComponent {
  isAuthenticated = signal(false);
  user = signal<User | null>(null);
  recentManga = signal<Manga[]>([]);
  stats = signal({
    totalManga: 0,
    currentlyReading: 0,
    completed: 0,
    planToRead: 0
  });

  constructor(
    readonly authService: AuthService,
    readonly apiService: Apiservice,
    readonly router: Router
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
      next: (response: { manga: Manga[] }) => {
        if (response?.manga) {
          const getLastUpdate = (m: Manga): string | undefined => {
            // Use lastChapter as a proxy for last update if available
            if (m.attributes?.lastChapter) return m.attributes.lastChapter;
            // If 'updated_at' exists as a direct property, use it (ignore index signature)
            // @ts-expect-error: updated_at may exist on some objects
            if (typeof m["updated_at"] === "string") return m["updated_at"];
            return undefined;
          };
          const sortedManga = [...response.manga]
            .sort((a: Manga, b: Manga) => {
              const bDate = getLastUpdate(b);
              const aDate = getLastUpdate(a);
              return new Date(bDate ?? 0).getTime() - new Date(aDate ?? 0).getTime();
            })
            .slice(0, 6);
          this.recentManga.set(sortedManga);
        }
      },
      error: (error: unknown) => {
        console.error('Error loading recent manga:', error);
        this.recentManga.set([]);
      }
    });

    // Load user statistics
    this.apiService.getLibraryStats().subscribe({
      next: (response: { totalManga: number; currentlyReading: number; completed: number; planToRead: number }) => {
        if (response) {
          this.stats.set(response);
        }
      },
      error: (error: unknown) => {
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
}

