import { Component, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../auth.service';
import { Apiservice } from '../apiservice';
import { Manga } from '../interfaces/manga';

interface ContinueReading {
  manga_id: string;
  current_chapter: string;
  current_page: number;
  progress_percentage: number;
  last_read_at: string;
}

interface ReadingHistoryEntry {
  manga_id: string;
  manga_title: string;
  chapter_id: string;
  chapter_title?: string;
  page_number: number;
  timestamp: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})

export class HomeComponent implements OnInit {
  isAuthenticated = signal(false);
  user = signal<User | null>(null);
  recentManga = signal<Manga[]>([]);
  continueReading = signal<ContinueReading[]>([]);
  readingHistory = signal<ReadingHistoryEntry[]>([]);
  stats = signal({
    totalManga: 0,
    currentlyReading: 0,
    completed: 0,
    planToRead: 0
  });

  constructor(
    readonly authService: AuthService,
    readonly apiService: Apiservice,
    readonly router: Router,
    private readonly http: HttpClient,
    private readonly titleService: Title
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

  ngOnInit() {
    this.titleService.setTitle('Manga Viewer - Your Personal Manga Library');
  }

  private loadUserData(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    // Load continue reading
    this.http.get<{ success: boolean; suggestions: ContinueReading[] }>(
      `/api/continue-reading?user_id=${userId}&limit=5`
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.continueReading.set(response.suggestions);
        }
      },
      error: (error) => console.error('Error loading continue reading:', error)
    });

    // Load reading history
    this.http.get<{ success: boolean; history: ReadingHistoryEntry[] }>(
      `/api/history?user_id=${userId}&limit=10`
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.readingHistory.set(response.history);
        }
      },
      error: (error) => console.error('Error loading history:', error)
    });

    // Load recent manga
    this.apiService.getAllManga().subscribe({
      next: (response: { manga: Manga[] }) => {
        if (response?.manga) {
          const getLastUpdate = (m: Manga): string | undefined => {
            if (m.attributes?.lastChapter) return m.attributes.lastChapter;
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

  goToManga(mangaId: string): void {
    this.router.navigate(['/manga', mangaId]);
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
    this.router.navigate(['/library']);
  }

  logout(): void {
    this.authService.logout();
    this.isAuthenticated.set(false);
    this.user.set(null);
    this.recentManga.set([]);
    this.continueReading.set([]);
    this.readingHistory.set([]);
    this.stats.set({
      totalManga: 0,
      currentlyReading: 0,
      completed: 0,
      planToRead: 0
    });
  }
}