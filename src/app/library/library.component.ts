import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../auth.service';
import { CoverImageService } from '../cover-image.service';
import { FormsModule } from '@angular/forms';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ImageLoaderComponent } from '../image-loader/image-loader.component';

interface ReadingProgress {
  chapter_id: string;
  current_page: number;
  total_pages: number;
  percentage: number;
  completed: boolean;
  last_read: string;
}

interface LibraryEntry {
  _id?: string;
  user_id: string;
  manga_id: string;
  manga_title: string;
  manga_cover?: string;
  status: string;
  reading_progress: ReadingProgress[];
  added_at: string;
  updated_at: string;
}

interface LibraryResponse {
  success: boolean;
  library: LibraryEntry[];
}

interface ReadingStats {
  total_manga: number;
  by_status: {
    [key: string]: number;
    PlanToRead: number;
    Reading: number;
    Completed: number;
    OnHold: number;
    Dropped: number;
  };
  total_chapters_read: number;
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SkeletonLoaderComponent, EmptyStateComponent, ImageLoaderComponent],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.css']
})
export class LibraryComponent implements OnInit {
  library: LibraryEntry[] = [];
  filteredLibrary: LibraryEntry[] = [];
  stats: ReadingStats | null = null;
  loading = false;
  error: string | null = null;
  newChapterAlerts: { mangaId: string; title: string; latestChapter: string }[] = [];

  // Filter state
  selectedStatus: string = 'All';
  searchQuery: string = '';
  showFavoritesOnly = false;
  
  statusOptions = [
    { value: 'All', label: 'All', icon: '📚' },
    { value: 'Favorites', label: 'Favorites', icon: '⭐' },
    { value: 'Reading', label: 'Reading', icon: '📖' },
    { value: 'Completed', label: 'Completed', icon: '✅' },
    { value: 'PlanToRead', label: 'Plan to Read', icon: '📋' },
    { value: 'OnHold', label: 'On Hold', icon: '⏸️' },
    { value: 'Dropped', label: 'Dropped', icon: '❌' }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly coverService: CoverImageService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadLibrary();
    this.loadStats();
  }

  loadLibrary(): void {
    this.loading = true;
    this.error = null;
    
    const userId = this.auth.getUserId();
    if (!userId) {
      this.error = 'User not authenticated';
      this.loading = false;
      return;
    }

    this.http.get<LibraryResponse>(`/api/progress/library?user_id=${userId}`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.library = response.library;
            const mangaIds = this.library.map(entry => entry.manga_id);
            this.coverService.prefetchCovers(mangaIds);
            this.filterLibrary();
            this.checkNewChapters();
          } else {
            this.error = 'Failed to load library';
          }
          this.loading = false;
        },
        error: (err) => {
          this.toastr.error('Failed to load your library', 'Error');
          this.error = 'Failed to load library. Please try again.';
          this.loading = false;
        }
      });
  }

  loadStats(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.http.get<{ success: boolean; stats: ReadingStats }>(`/api/progress/stats?user_id=${userId}`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats = response.stats;
          }
        },
        error: (err) => {
          this.toastr.error('Failed to load reading statistics', 'Error');
        }
      });
  }

  private checkNewChapters(): void {
    // Only check manga currently being read
    const reading = this.library.filter(e => e.status === 'Reading');
    if (!reading.length) return;

    const storageKey = 'manga_last_chapters';
    const stored: Record<string, string> = JSON.parse(localStorage.getItem(storageKey) || '{}');

    const checks = reading.map(entry =>
      this.http.get<any>(
        `https://api.mangadex.org/manga/${entry.manga_id}/feed?translatedLanguage[]=en&limit=1&order[chapter]=desc`
      ).pipe(
        map(res => {
          const latest = res?.data?.[0]?.attributes?.chapter ?? null;
          if (!latest) return null;
          const prev = stored[entry.manga_id];
          if (prev && prev !== latest) {
            return { mangaId: entry.manga_id, title: entry.manga_title, latestChapter: latest };
          }
          // Store current latest so next visit can compare
          stored[entry.manga_id] = latest;
          return null;
        }),
        catchError(() => of(null))
      )
    );

    forkJoin(checks).subscribe(results => {
      this.newChapterAlerts = results.filter((r): r is { mangaId: string; title: string; latestChapter: string } => r !== null);
      // Update stored values for newly detected updates
      this.newChapterAlerts.forEach(a => { stored[a.mangaId] = a.latestChapter; });
      localStorage.setItem(storageKey, JSON.stringify(stored));
    });
  }

  dismissAlert(mangaId: string): void {
    this.newChapterAlerts = this.newChapterAlerts.filter(a => a.mangaId !== mangaId);
  }

  filterLibrary(): void {
    let filtered = [...this.library];

    // Filter by favorites
    if (this.selectedStatus === 'Favorites') {
      filtered = filtered.filter(entry => (entry as any).favorite === true);
    }
    // Filter by status
    else if (this.selectedStatus !== 'All') {
      filtered = filtered.filter(entry => entry.status === this.selectedStatus);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.manga_title.toLowerCase().includes(query)
      );
    }

    this.filteredLibrary = filtered;
  }

  async toggleFavorite(entry: LibraryEntry, event: Event): Promise<void> {
    event.stopPropagation();
    const userId = this.auth.getUserId();
    if (!userId) return;

    try {
      const response = await this.http.post<{ success: boolean; is_favorite: boolean }>(
        '/api/favorites/toggle',
        { user_id: userId, manga_id: entry.manga_id }
      ).toPromise();

      if (response?.success) {
        // Update local state
        (entry as any).favorite = response.is_favorite;
        this.filterLibrary();
        this.toastr.success(
          response.is_favorite ? 'Added to favorites' : 'Removed from favorites',
          'Success'
        );
      }
    } catch {
      this.toastr.error('Failed to update favorite', 'Error');
    }
  }

  isFavorite(entry: LibraryEntry): boolean {
    return (entry as any).favorite === true;
  }

  clearFilters(): void {
    this.selectedStatus = 'All';
    this.searchQuery = '';
    this.filterLibrary();
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.filterLibrary();
  }

  onSearchChange(): void {
    this.filterLibrary();
  }

  updateStatus(entry: LibraryEntry, newStatus: string): void {
    const userId = this.auth.getUserId();
    if (!userId) {
      this.error = 'User not authenticated';
      return;
    }

    // Update UI optimistically
    const oldStatus = entry.status;
    entry.status = newStatus;
    entry.updated_at = new Date().toISOString();
    
    // Call API to persist changes
    this.http.post<{success: boolean; message: string}>('/api/progress/library/status', {
      user_id: userId,
      manga_id: entry.manga_id,
      status: newStatus
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success(`Status updated to ${newStatus}`, 'Success');
          this.loadStats(); // Refresh stats
        } else {
          // Revert on error
          entry.status = oldStatus;
          this.toastr.error('Failed to update status', 'Error');
          this.error = 'Failed to update status';
        }
      },
      error: (err) => {
        this.toastr.error('Failed to update status. Please try again.', 'Error');
        entry.status = oldStatus; // Revert on error
        this.error = 'Failed to update status. Please try again.';
      }
    });
  }

  removeFromLibrary(entry: LibraryEntry): void {
    if (!confirm(`Remove "${entry.manga_title}" from your library?`)) {
      return;
    }

    const userId = this.auth.getUserId();
    if (!userId) {
      this.error = 'User not authenticated';
      return;
    }
    
    // Remove from UI optimistically
    const originalLibrary = [...this.library];
    this.library = this.library.filter(e => e._id !== entry._id);
    this.filterLibrary();
    
    // Call API to persist changes
    this.http.post<{success: boolean; message: string}>('/api/progress/library/remove', {
      user_id: userId,
      manga_id: entry.manga_id
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success(`Removed "${entry.manga_title}" from library`, 'Success');
          this.loadStats(); // Refresh stats
        } else {
          // Revert on error
          this.library = originalLibrary;
          this.filterLibrary();
          this.toastr.error('Failed to remove from library', 'Error');
          this.error = 'Failed to remove from library';
        }
      },
      error: (err) => {
        this.toastr.error('Failed to remove from library. Please try again.', 'Error');
        this.library = originalLibrary; // Revert on error
        this.filterLibrary();
        this.error = 'Failed to remove from library. Please try again.';
      }
    });
  }

  viewManga(mangaId: string): void {
    this.router.navigate(['/manga', mangaId]);
  }

  continueReading(entry: LibraryEntry): void {
    // Find the latest reading progress
    if (entry.reading_progress.length > 0) {
      const sorted = [...entry.reading_progress].sort((a, b) => 
        new Date(b.last_read).getTime() - new Date(a.last_read).getTime()
      );
      const latest = sorted[0];
      
      // Navigate to the chapter with the last read page
      this.router.navigate(['/manga', entry.manga_id, 'chapter', latest.chapter_id], {
        queryParams: { page: latest.current_page }
      });
    } else {
      // No progress yet, just go to manga detail page
      this.viewManga(entry.manga_id);
    }
  }

  getProgressPercentage(entry: LibraryEntry): number {
    if (entry.reading_progress.length === 0) return 0;
    
    // Calculate average progress across all chapters
    const totalProgress = entry.reading_progress.reduce((sum, progress) => 
      sum + progress.percentage, 0
    );
    return Math.round(totalProgress / entry.reading_progress.length);
  }

  getProgressInfo(entry: LibraryEntry): string {
    if (entry.reading_progress.length === 0) {
      return 'Not started';
    }

    const completedChapters = entry.reading_progress.filter(p => p.completed).length;
    const totalChapters = entry.reading_progress.length;
    
    return `${completedChapters}/${totalChapters} chapters`;
  }

  getLastRead(entry: LibraryEntry): string {
    if (entry.reading_progress.length === 0) {
      return 'Never';
    }

    const sorted = [...entry.reading_progress].sort((a, b) => 
      new Date(b.last_read).getTime() - new Date(a.last_read).getTime()
    );
    const latest = sorted[0];

    return this.formatDate(latest.last_read);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  getStatusIcon(status: string): string {
    const option = this.statusOptions.find(o => o.value === status);
    return option ? option.icon : '📚';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(o => o.value === status);
    return option ? option.label : status;
  }

  getCoverUrl(mangaId: string): Observable<string> {
    return this.coverService.getCoverUrl(mangaId, '256');
  }
}
