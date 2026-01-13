import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Apiservice, MangaSearchRequest } from '../apiservice';
import { DisclaimerComponent } from '../disclaimer/disclaimer.component';
import { MangaDetailComponent } from '../manga-detail/manga-detail';
import { Manga } from '../interfaces/manga';

@Component({
  selector: 'app-manga-search',
  standalone: true,
  imports: [CommonModule, FormsModule, DisclaimerComponent, MangaDetailComponent],
  templateUrl: './manga-search.html',
  styleUrl: './manga-search.css'
})
export class MangaSearchComponent {
  searchQuery = signal('');
  searchResults = signal<Manga[]>([]);
  loading = signal(false);
  error = signal('');
  hasMore = signal(false);
  currentPage = signal(1);
  selectedManga = signal<Manga | null>(null);
  showDetails = signal(false);

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


  constructor(private readonly apiService: Apiservice, private readonly router: Router) {}

  async onSearch() {
    if (!this.searchQuery().trim()) {
      this.error.set('Please enter a search term');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.currentPage.set(1);

    try {
      // First try to search local database
      const searchParams: MangaSearchRequest = {
        query: this.searchQuery().trim(),
        page: 1,
        limit: 20
      };

      const localResponse = await this.apiService.searchManga(searchParams).toPromise();
      
      if (localResponse?.manga?.length) {
        // Found results in local database
        this.searchResults.set(localResponse.manga ?? []);
        this.hasMore.set(false);
      } else {
        // No local results, try external API
        console.log('No local results, searching external API...');
        const externalResponse = await this.apiService.searchExternalManga(this.searchQuery().trim()).toPromise();
        
        if (externalResponse?.data) {
          // Process MangaDx API response
          const mangaList: Manga[] = externalResponse.data.map((manga: any) => ({
            id: manga.id,
            type: 'manga',
            attributes: {
              title: {
                en: manga.attributes?.title?.['en'] || manga.attributes?.title?.['jp'] || 'Unknown Title'
              },
              description: {
                en: manga.attributes?.description?.['en'] || ''
              },
              status: manga.attributes?.status || '',
              originalLanguage: manga.attributes?.originalLanguage || 'ja'
            },
            relationships: Array.isArray(manga.relationships) ? manga.relationships.map((rel: any) => ({
              id: rel.id,
              type: rel.type
            })) : []
          }));
          this.searchResults.set(mangaList);
          this.hasMore.set(false);
          if (mangaList.length === 0) {
            this.fallbackToDemoSearch();
          }
        } else {
          this.error.set('No results found from external source');
        }
      }
    } catch (error: unknown) {
      console.error('Search error:', error);
      console.log('API unavailable, falling back to demo data...');
      this.fallbackToDemoSearch();
    } finally {
      this.loading.set(false);
    }
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
      const nextPage = this.currentPage() + 1;
      const searchParams: MangaSearchRequest = {
        query: this.searchQuery().trim(),
        page: nextPage,
        limit: 20
      };

      const response = await this.apiService.searchManga(searchParams).toPromise();
      
      if (response) {
        const currentResults = this.searchResults();
        this.searchResults.set([...currentResults, ...(response.manga || [])]);
        this.hasMore.set(false); // Backend doesn't implement pagination yet
        this.currentPage.set(nextPage);
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
  }

  onEnterKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  showMangaDetails(manga: Manga) {
    // Navigate to manga detail page
    this.router.navigate(['/manga', manga.id], { state: { manga: manga } });
  }


  hideMangaDetails() {
    this.showDetails.set(false);
    this.selectedManga.set(null);
  }
}
