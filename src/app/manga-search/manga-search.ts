import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Apiservice } from '../apiservice';
import { DisclaimerComponent } from '../disclaimer/disclaimer.component';
import { Manga } from '../interfaces/manga';
import { AuthService } from '../auth.service';
import { ToastrService } from 'ngx-toastr';

interface SearchFilters {
  query: string;
  tags?: string[];
  status?: string[];
  year_from?: number;
  year_to?: number;
  sort_by?: string;
  sort_order?: string;
}

@Component({
  selector: 'app-manga-search',
  standalone: true,
  imports: [CommonModule, FormsModule, DisclaimerComponent],
  templateUrl: './manga-search.html',
  styleUrl: './manga-search.css'
})
export class MangaSearchComponent implements OnInit {
  searchQuery = signal('');
  searchResults = signal<Manga[]>([]);
  loading = signal(false);
  error = signal('');
  hasMore = signal(false);
  currentPage = signal(1);
  addedToLibrary = new Set<string>();
  favoriteManga = new Set<string>();
  coverUrls = new Map<string, string>();
  showFilters = signal(false);
  
  // Filter signals
  selectedTags = signal<string[]>([]);
  selectedStatus = signal<string[]>([]);
  yearFrom = signal<number | undefined>(undefined);
  yearTo = signal<number | undefined>(undefined);
  sortBy = signal('relevance');
  sortOrder = signal('desc');
  
  // Available filter options
  availableTags = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
    'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
    'Sports', 'Supernatural', 'Thriller'
  ];
  
  availableStatuses = [
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'hiatus', label: 'Hiatus' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'title', label: 'Title' },
    { value: 'year', label: 'Year' },
    { value: 'rating', label: 'Rating' }
  ];

  private externalTotal = 0;
  private readonly PAGE_SIZE = 100;

  // Demo manga data for search fallback
  private readonly demoManga: Manga[] = [
    {
      id: 'demo-1',
      type: 'manga',
      attributes: {
        title: { en: 'Naruto' },
        description: { en: 'The story of a young ninja who dreams of becoming Hokage.' },
        status: 'completed',
        originalLanguage: 'ja'
      },
      relationships: []
    },
    {
      id: 'demo-2',
      type: 'manga',
      attributes: {
        title: { en: 'One Piece' },
        description: { en: 'Follow Monkey D. Luffy and his crew as they search for the ultimate treasure.' },
        status: 'ongoing',
        originalLanguage: 'ja'
      },
      relationships: []
    },
    {
      id: 'demo-3',
      type: 'manga',
      attributes: {
        title: { en: 'Attack on Titan' },
        description: { en: 'Humanity fights for survival against giant humanoid titans.' },
        status: 'completed',
        originalLanguage: 'ja'
      },
      relationships: []
    },
    {
      id: 'demo-4',
      type: 'manga',
      attributes: {
        title: { en: 'Demon Slayer' },
        description: { en: 'A young boy becomes a demon slayer to save his sister.' },
        status: 'completed',
        originalLanguage: 'ja'
      },
      relationships: []
    },
    {
      id: 'demo-5',
      type: 'manga',
      attributes: {
        title: { en: 'My Hero Academia' },
        description: { en: 'In a world of superheroes, a boy without powers dreams of becoming one.' },
        status: 'ongoing',
        originalLanguage: 'ja'
      },
      relationships: []
    },
    {
      id: 'demo-6',
      type: 'manga',
      attributes: {
        title: { en: 'Death Note' },
        description: { en: 'A high school student gains the power to kill anyone by writing their name.' },
        status: 'completed',
        originalLanguage: 'ja'
      },
      relationships: []
    }
  ];


  constructor(
    private readonly apiService: Apiservice, 
    private readonly router: Router,
    private readonly titleService: Title,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly http: HttpClient
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Search Manga - Manga Viewer');
    this.loadFavorites();
  }

  private loadFavorites() {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.http.get<{ success: boolean; favorites: any[] }>(
      `/api/favorites?user_id=${userId}`
    ).subscribe({
      next: (response) => {
        if (response.success) {
          response.favorites.forEach(fav => this.favoriteManga.add(fav.manga_id));
        }
      },
      error: (error) => console.error('Error loading favorites:', error)
    });
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  toggleTag(tag: string) {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
  }

  toggleStatus(status: string) {
    const current = this.selectedStatus();
    if (current.includes(status)) {
      this.selectedStatus.set(current.filter(s => s !== status));
    } else {
      this.selectedStatus.set([...current, status]);
    }
  }

  clearFilters() {
    this.selectedTags.set([]);
    this.selectedStatus.set([]);
    this.yearFrom.set(undefined);
    this.yearTo.set(undefined);
    this.sortBy.set('relevance');
    this.sortOrder.set('desc');
  }

  hasActiveFilters(): boolean {
    return this.selectedTags().length > 0 ||
           this.selectedStatus().length > 0 ||
           this.yearFrom() !== undefined ||
           this.yearTo() !== undefined;
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  async onSearch() {
    if (!this.searchQuery().trim()) {
      this.error.set('Please enter a search term');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.currentPage.set(1);
    this.coverUrls.clear();

    try {
      const externalResponse = await this.apiService.searchExternalManga(
        this.searchQuery().trim(), 0, this.PAGE_SIZE
      ).toPromise();

      if (externalResponse?.data?.length) {
        const total: number = (externalResponse as any).total ?? externalResponse.data.length;
        this.externalTotal = total;
        const mangaList = this.mapMangaResponse(externalResponse.data);
        this.searchResults.set(mangaList);
        this.hasMore.set(mangaList.length < total);
      } else {
        this.searchResults.set([]);
        this.error.set('No results found');
      }
    } catch (error: unknown) {
      console.error('Search error:', error);
      this.fallbackToDemoSearch();
    } finally {
      this.loading.set(false);
    }
  }

  private mapMangaResponse(data: any[]): Manga[] {
    return data.map((manga: any) => {
      // Extract cover filename from inline relationships
      const coverRel = manga.relationships?.find((r: any) => r.type === 'cover_art');
      const fileName = coverRel?.attributes?.fileName;
      if (fileName) {
        const url = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.256.jpg`;
        this.coverUrls.set(manga.id, url);
      }

      return {
        id: manga.id,
        type: 'manga',
        attributes: {
          title: {
            en: manga.attributes?.title?.['en']
              || manga.attributes?.title?.['ja-ro']
              || manga.attributes?.title?.['ko-ro']
              || (Object.values(manga.attributes?.title ?? {}) as string[])[0]
              || 'Unknown Title'
          },
          description: { en: manga.attributes?.description?.['en'] || '' },
          status: manga.attributes?.status || '',
          originalLanguage: manga.attributes?.originalLanguage || 'ja'
        },
        relationships: Array.isArray(manga.relationships)
          ? manga.relationships.map((rel: any) => ({ id: rel.id, type: rel.type }))
          : []
      };
    });
  }

  private fallbackToDemoSearch() {
    const query = this.searchQuery().trim().toLowerCase();
    const filteredManga: Manga[] = this.demoManga.filter(manga => {
      const title = manga.attributes?.title?.['en']?.toLowerCase() || '';
      // Demo data doesn't have author in relationships, so skip author filter
      return title.includes(query);
    });
    if (filteredManga.length > 0) {
      this.searchResults.set(filteredManga);
      this.error.set('Showing demo results (backend unavailable)');
    } else {
      this.error.set('No manga found in demo data. Try searching for: Naruto, One Piece, Attack on Titan, Demon Slayer, My Hero Academia, or Death Note');
      this.searchResults.set([]);
    }
    this.hasMore.set(false);
  }

  async loadMore() {
    if (!this.hasMore() || this.loading()) return;

    this.loading.set(true);
    
    try {
      const offset = this.searchResults().length;
      const externalResponse = await this.apiService.searchExternalManga(
        this.searchQuery().trim(), offset, this.PAGE_SIZE
      ).toPromise();

      if (externalResponse?.data) {
        const newManga = this.mapMangaResponse(externalResponse.data);
        const updated = [...this.searchResults(), ...newManga];
        this.searchResults.set(updated);
        this.hasMore.set(updated.length < this.externalTotal);
      }
    } catch (error) {
      console.error('Load more error:', error);
      this.error.set('Failed to load more results');
    } finally {
      this.loading.set(false);
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.error.set('');
    this.hasMore.set(false);
    this.currentPage.set(1);
    this.externalTotal = 0;
    this.coverUrls.clear();
  }

  onEnterKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  getCoverUrl(mangaId: string): string {
    return this.coverUrls.get(mangaId) ?? 'https://via.placeholder.com/230x320/667eea/ffffff?text=No+Cover';
  }

  async addToLibrary(manga: Manga) {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      await this.apiService.addMangaToLibrary(manga).toPromise();
      this.addedToLibrary.add(manga.id);
      this.toastr.success(`Added "${manga.attributes.title?.['en'] || 'manga'}" to library`, 'Success');
    } catch {
      this.toastr.error('Failed to add to library', 'Error');
    }
  }

  async toggleFavorite(manga: Manga, event: Event) {
    event.stopPropagation();
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const userId = this.authService.getUserId();
    if (!userId) return;

    try {
      const response = await this.http.post<{ success: boolean; is_favorite: boolean }>(
        '/api/favorites/toggle',
        { user_id: userId, manga_id: manga.id }
      ).toPromise();

      if (response?.success) {
        if (response.is_favorite) {
          this.favoriteManga.add(manga.id);
          this.toastr.success('Added to favorites', 'Success');
        } else {
          this.favoriteManga.delete(manga.id);
          this.toastr.success('Removed from favorites', 'Success');
        }
      }
    } catch {
      this.toastr.error('Failed to update favorite', 'Error');
    }
  }

  isFavorite(mangaId: string): boolean {
    return this.favoriteManga.has(mangaId);
  }

  showMangaDetails(manga: Manga) {
    this.router.navigate(['/manga', manga.id], { state: { manga: manga } });
  }
}
