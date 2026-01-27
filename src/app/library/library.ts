import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Apiservice } from '../apiservice';
import { AuthService } from '../auth.service';
import { DisclaimerComponent } from '../disclaimer/disclaimer.component';
import { DemoDataService, MangaLibraryItem, LibraryStats } from '../demo-data.service';

// Re-export types for convenience
export type { MangaLibraryItem, LibraryStats };

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, DisclaimerComponent],
  templateUrl: './library.html',
  styleUrls: ['./library.css']
})
export class LibraryComponent implements OnInit {
  // Signals for reactive state management
  libraryItems = signal<MangaLibraryItem[]>([]);
  stats = signal<LibraryStats | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  isDemoMode = signal(false); // Track if we're using demo data

  // Filter and view options
  selectedStatus = signal<string>('all');
  selectedSort = signal<string>('date_updated');
  searchQuery = signal<string>('');
  viewMode = signal<'grid' | 'list'>('grid');
  showFavoritesOnly = signal(false);

  // Modal state
  showAddModal = signal(false);
  showEditModal = signal(false);
  selectedManga = signal<MangaLibraryItem | null>(null);

  // Form data
  newManga = signal({
    title: '',
    author: '',
    description: '',
    cover_url: '',
    status: 'plan_to_read' as MangaLibraryItem['status'],
    current_chapter: 0,
    total_chapters: undefined as number | undefined,
    current_volume: undefined as number | undefined,
    total_volumes: undefined as number | undefined,
    rating: undefined as number | undefined,
    tags: [] as string[],
    notes: ''
  });

  // Computed properties
  filteredLibrary = computed(() => {
    let items = this.libraryItems();
    
    // Filter by status
    if (this.selectedStatus() !== 'all') {
      items = items.filter(item => item.status === this.selectedStatus());
    }
    
    // Filter by favorites
    if (this.showFavoritesOnly()) {
      items = items.filter(item => item.is_favorite);
    }
    
    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      items = items.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort items
    return this.sortItems(items);
  });

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'reading', label: 'Currently Reading' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'plan_to_read', label: 'Plan to Read' },
    { value: 'dropped', label: 'Dropped' }
  ];

  sortOptions = [
    { value: 'date_updated', label: 'Last Updated' },
    { value: 'date_added', label: 'Date Added' },
    { value: 'title', label: 'Title' },
    { value: 'rating', label: 'Rating' },
    { value: 'progress', label: 'Progress' }
  ];

  constructor(
    private readonly apiService: Apiservice,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly demoDataService: DemoDataService
  ) {}

  ngOnInit() {
    this.loadLibrary();
    this.loadStats();
  }

  async loadLibrary() {
    console.log('loadLibrary called, authenticated:', this.authService.authenticated());

    if (!this.authService.load demo data from service
      console.log('Guest user detected, loading demo data');
      this.loadDemoData();
      this.isLoading.set(false);
      return;
    }
    // ...rest of the function for authenticated users...
  }

  private loadDemoData(): void {
    console.log('Loading demo data...');
    this.isDemoMode.set(true);
    this.libraryItems.set(this.demoDataService.getDemoLibrary());
    this.stats.set(this.demoDataService.getDemoStats()
    this.stats.set(demoStats);
  }

  async loadStats() {
    try {
      const response = await this.apiService.getLibraryStats().toPromise();
      if (response && typeof response.totalManga === 'number') {
        // Map backend stats to LibraryStats
        this.stats.set({
          total_manga: response.totalManga,
          reading: response.currentlyReading,
          completed: response.completed,
          on_hold: 0, // Not provided by backend
          plan_to_read: response.planToRead,
          dropped: 0, // Not provided by backend
          total_chapters_read: 0, // Not provided by backend
          average_rating: 0 // Not provided by backend
        });
      } else {
        this.calculateLocalStats();
      }
    } catch {
      this.calculateLocalStats();
    }
  }

  private calculateLocalStats() {
    const items = this.libraryItems();
    if (items.length === 0) {
      this.stats.set({
        total_manga: 0,
        reading: 0,
        completed: 0,
        on_hold: 0,
        plan_to_read: 0,
        dropped: 0,
        total_chapters_read: 0,
        average_rating: 0
      });
      return;
    }

    const stats: LibraryStats = {
      total_manga: items.length,
      reading: items.filter(item => item.status === 'reading').length,
      completed: items.filter(item => item.status === 'completed').length,
      on_hold: items.filter(item => item.status === 'on_hold').length,
      plan_to_read: items.filter(item => item.status === 'plan_to_read').length,
      dropped: items.filter(item => item.status === 'dropped').length,
      total_chapters_read: items.reduce((sum, item) => sum + item.progress.current_chapter, 0),
      average_rating: 0
    };

    // Calculate average rating
    const ratedItems = items.filter(item => item.rating);
    if (ratedItems.length > 0) {
      stats.average_rating = ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length;
    }

    this.stats.set(stats);
  }

  sortItems(items: MangaLibraryItem[]): MangaLibraryItem[] {
    const sortBy = this.selectedSort();
    
    return items.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'progress': {
          const aProgress = a.progress.total_chapters ? 
            (a.progress.current_chapter / a.progress.total_chapters) : 0;
          const bProgress = b.progress.total_chapters ? 
            (b.progress.current_chapter / b.progress.total_chapters) : 0;
          return bProgress - aProgress;
        }
        case 'date_added':
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
        case 'date_updated':
        default:
          return new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime();
      }
    });
  }

  async toggleFavorite(manga: MangaLibraryItem) {
    try {
      const response = await this.apiService.toggleMangaFavorite(manga.id).toPromise();
      if (response?.success) {
        // Update local state
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].is_favorite = !items[index].is_favorite;
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
        }
      } else {
        console.error('Failed to toggle favorite:', response?.message);
      }
    } catch (err: unknown) {
      console.error('Failed to toggle favorite:', err);
      // Fallback: Update locally in demo mode
      if (this.isDemoMode()) {
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].is_favorite = !items[index].is_favorite;
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
        }
      }
    }
  }

  async updateProgress(manga: MangaLibraryItem, chapter: number, volume?: number) {
    try {
      const response = await this.apiService.updateMangaProgress(manga.id, {
        chapter: String(chapter),
        page: 0 // Provide a default page value
      }).toPromise();
      if (response?.success) {
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].progress.current_chapter = chapter;
          if (volume !== undefined) {
            items[index].progress.current_volume = volume;
          }
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
        }
        this.loadStats();
      } else {
        console.error('Failed to update progress:', response?.message);
      }
    } catch (err: unknown) {
      console.error('Failed to update progress:', err);
      const items = this.libraryItems();
      const index = items.findIndex(item => item.id === manga.id);
      if (index !== -1) {
        items[index].progress.current_chapter = chapter;
        if (volume !== undefined) {
          items[index].progress.current_volume = volume;
        }
        items[index].date_updated = new Date().toISOString();
        this.libraryItems.set([...items]);
      }
      this.loadStats();
    }
  }

  async updateStatus(manga: MangaLibraryItem, status: MangaLibraryItem['status']) {
    try {
      const response = await this.apiService.updateMangaStatus(manga.id, status).toPromise();
      if (response?.success) {
        // Update local state
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].status = status;
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
        }
        this.loadStats(); // Refresh stats
      } else {
        console.error('Failed to update status:', response?.message);
      }
    } catch (err: unknown) {
      console.error('Failed to update status:', err);
      // Fallback: Update locally in demo mode
      if (this.isDemoMode()) {
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].status = status;
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
        }
        this.loadStats();
      }
    }
  }

  async addManga() {
    const formData = this.newManga();
    
    if (!formData.title.trim()) {
      this.error.set('Title is required');
      return;
    }
    
    try {
      // The backend expects a Manga object, not MangaLibraryItem
      const mangaToAdd = {
        id: '',
        type: 'manga',
        attributes: {
          title: { en: formData.title },
          description: { en: formData.description },
          status: formData.status,
          originalLanguage: 'en'
        },
        relationships: []
      };
      const response = await this.apiService.addMangaToLibrary(mangaToAdd as any).toPromise();
      if (response?.success) {
        this.loadLibrary();
        this.loadStats();
        this.closeAddModal();
        this.error.set(null);
      } else {
        this.error.set(response?.message || 'Failed to add manga');
      }
    } catch (err: unknown) {
      console.error('Add manga error:', err);
      const msg = typeof err === 'object' && err && 'error' in err ? (err as any).error?.message : (err as any)?.message;
      this.error.set(msg || 'Failed to add manga');
    }
  }

  async deleteManga(mangaId: string) {
    if (!confirm('Are you sure you want to remove this manga from your library?')) {
      // Confirmation cancelled, do nothing
    }

    try {
      const response = await this.apiService.removeMangaFromLibrary(mangaId).toPromise();
      if (response?.success) {
        this.loadLibrary(); // Refresh library
        this.loadStats(); // Refresh stats
        this.closeEditModal(); // Close edit modal if open
      } else {
        console.error('Failed to delete manga:', response?.message);
        this.error.set('Failed to remove manga from library');
      }
    } catch (err: unknown) {
      console.error('Failed to delete manga:', err);
      this.error.set('Failed to remove manga from library');
    }
  }

  openAddModal() {
    this.resetForm();
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.resetForm();
  }

  openEditModal(manga: MangaLibraryItem) {
    this.selectedManga.set(manga);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedManga.set(null);
  }

  resetForm() {
    this.newManga.set({
      title: '',
      author: '',
      description: '',
      cover_url: '',
      status: 'plan_to_read',
      current_chapter: 0,
      total_chapters: undefined,
      current_volume: undefined,
      total_volumes: undefined,
      rating: undefined,
      tags: [],
      notes: ''
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'reading': return '#4ade80';
      case 'completed': return '#3b82f6';
      case 'on_hold': return '#f59e0b';
      case 'plan_to_read': return '#8b5cf6';
      case 'dropped': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getProgressPercentage(manga: MangaLibraryItem): number {
    if (!manga.progress.total_chapters) return 0;
    return Math.round((manga.progress.current_chapter / manga.progress.total_chapters) * 100);
  }

  addTag(tag: string) {
    if (tag.trim()) {
      const current = this.newManga();
      const tags = [...current.tags, tag.trim()];
      this.newManga.set({ ...current, tags });
    }
  }

  removeTag(index: number) {
    const current = this.newManga();
    const tags = current.tags.filter((_, i) => i !== index);
    this.newManga.set({ ...current, tags });
  }

  // Form update methods
  updateNewMangaTitle(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, title: value });
  }

  updateNewMangaAuthor(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, author: value });
  }

  updateNewMangaDescription(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, description: value });
  }

  updateNewMangaCoverUrl(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, cover_url: value });
  }

  updateNewMangaStatus(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, status: value as MangaLibraryItem['status'] });
  }

  updateNewMangaRating(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, rating: value ? Number.parseInt(value) : undefined });
  }

  updateNewMangaCurrentChapter(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, current_chapter: Number.parseInt(value) || 0 });
  }

  updateNewMangaTotalChapters(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, total_chapters: Number.parseInt(value) || undefined });
  }

  updateNewMangaNotes(value: string) {
    const current = this.newManga();
    this.newManga.set({ ...current, notes: value });
  }

  // Edit modal methods
  async updateTotalChapters(manga: MangaLibraryItem, totalChapters: number | undefined) {
    try {
      const response = await this.apiService.updateMangaProgress(manga.id, {
        chapter: String(manga.progress.current_chapter),
        page: 0
      }).toPromise();
      if (response?.success) {
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].progress.total_chapters = totalChapters;
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
          this.selectedManga.set({...items[index]});
        }
      }
    } catch (err) {
      console.error('Failed to update total chapters:', err);
    }
  }

  async updateRating(manga: MangaLibraryItem, rating: string) {
    const ratingNum = rating ? Number.parseInt(rating) : undefined;
    try {
      const response = await this.apiService.updateMangaRating(manga.id, ratingNum!).toPromise();
      if (response?.success) {
        // Update local state
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].rating = ratingNum;
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
          this.selectedManga.set({...items[index]});
        }
        this.loadStats(); // Refresh stats
      }
    } catch (err) {
      console.error('Failed to update rating:', err);
    }
  }

  async updateNotes(manga: MangaLibraryItem, notes: string) {
    try {
      const response = await this.apiService.updateMangaNotes(manga.id, notes).toPromise();
      if (response?.success) {
        // Update local state
        const items = this.libraryItems();
        const index = items.findIndex(item => item.id === manga.id);
        if (index !== -1) {
          items[index].notes = notes;
          items[index].date_updated = new Date().toISOString();
          this.libraryItems.set([...items]);
          this.selectedManga.set({...items[index]});
        }
      }
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  }

  updateManga() {
    // This method is called by the form but actual updates happen in real-time
    // through the individual update methods above
    this.closeEditModal();
  }
}
