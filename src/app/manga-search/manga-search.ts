import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Apiservice, MangaSearchRequest } from '../apiservice';

@Component({
  selector: 'app-manga-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manga-search.html',
  styleUrl: './manga-search.css'
})
export class MangaSearchComponent {
  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  loading = signal(false);
  error = signal('');
  hasMore = signal(false);
  currentPage = signal(1);

  constructor(private apiService: Apiservice, private router: Router) {}

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
      
      if (localResponse && localResponse.manga && localResponse.manga.length > 0) {
        // Found results in local database
        this.searchResults.set(localResponse.manga);
        this.hasMore.set(false);
      } else {
        // No local results, try external API
        console.log('No local results, searching external API...');
        const externalResponse = await this.apiService.searchExternalManga(this.searchQuery().trim()).toPromise();
        
        if (externalResponse && externalResponse.data) {
          // Process MangaDx API response
          const mangaList = externalResponse.data.map((manga: any) => ({
            id: manga.id,
            title: manga.attributes?.title?.en || manga.attributes?.title?.jp || 'Unknown Title',
            description: manga.attributes?.description?.en || '',
            status: manga.attributes?.status || '',
            tags: manga.attributes?.tags?.map((tag: any) => tag.attributes?.name?.en) || [],
            author: manga.relationships?.find((rel: any) => rel.type === 'author')?.attributes?.name || 'Unknown',
            cover_art: manga.relationships?.find((rel: any) => rel.type === 'cover_art')?.id || null
          }));
          
          this.searchResults.set(mangaList);
          this.hasMore.set(false);
          
          if (mangaList.length === 0) {
            this.error.set('No manga found for your search term');
          }
        } else {
          this.error.set('No manga found for your search term');
          this.searchResults.set([]);
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      this.error.set('Failed to search manga. Please try again.');
      this.searchResults.set([]);
    } finally {
      this.loading.set(false);
    }
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

  showMangaDetails(manga: any) {
    // Navigate to manga detail page
    this.router.navigate(['/manga', manga.id], { state: { manga: manga } });
  }
}
