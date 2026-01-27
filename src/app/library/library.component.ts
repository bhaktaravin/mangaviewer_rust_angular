import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.css']
})
export class LibraryComponent implements OnInit {
  library: LibraryEntry[] = [];
  filteredLibrary: LibraryEntry[] = [];
  stats: ReadingStats | null = null;
  loading = false;
  error: string | null = null;
  
  // Filter state
  selectedStatus: string = 'All';
  searchQuery: string = '';
  
  statusOptions = [
    { value: 'All', label: 'All', icon: '📚' },
    { value: 'Reading', label: 'Reading', icon: '📖' },
    { value: 'Completed', label: 'Completed', icon: '✅' },
    { value: 'PlanToRead', label: 'Plan to Read', icon: '📋' },
    { value: 'OnHold', label: 'On Hold', icon: '⏸️' },
    { value: 'Dropped', label: 'Dropped', icon: '❌' }
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
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
            this.filterLibrary();
          } else {
            this.error = 'Failed to load library';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading library:', err);
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
          console.error('Error loading stats:', err);
        }
      });
  }

  filterLibrary(): void {
    let filtered = [...this.library];

    // Filter by status
    if (this.selectedStatus !== 'All') {
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

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.filterLibrary();
  }

  onSearchChange(): void {
    this.filterLibrary();
  }

  updateStatus(entry: LibraryEntry, newStatus: string): void {
    // TODO: Implement API call to update status
    entry.status = newStatus;
    entry.updated_at = new Date().toISOString();
    
    // Refresh stats
    this.loadStats();
  }

  removeFromLibrary(entry: LibraryEntry): void {
    if (!confirm(`Remove "${entry.manga_title}" from your library?`)) {
      return;
    }
    
    // TODO: Implement API call to remove from library
    this.library = this.library.filter(e => e._id !== entry._id);
    this.filterLibrary();
    this.loadStats();
  }

  viewManga(mangaId: string): void {
    this.router.navigate(['/manga', mangaId]);
  }

  continueReading(entry: LibraryEntry): void {
    // Find the latest reading progress
    if (entry.reading_progress.length > 0) {
      const latest = entry.reading_progress.sort((a, b) => 
        new Date(b.last_read).getTime() - new Date(a.last_read).getTime()
      )[0];
      
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

    const latest = entry.reading_progress.sort((a, b) => 
      new Date(b.last_read).getTime() - new Date(a.last_read).getTime()
    )[0];

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
}
