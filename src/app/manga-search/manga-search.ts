import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Apiservice, MangaSearchRequest } from '../apiservice';
import { DisclaimerComponent } from '../disclaimer/disclaimer.component';
import { MangaDetailComponent } from '../manga-detail/manga-detail';

@Component({
  selector: 'app-manga-search',
  standalone: true,
  imports: [CommonModule, FormsModule, DisclaimerComponent, MangaDetailComponent],
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
  selectedManga = signal<any>(null);
  showDetails = signal(false);

  // Demo manga data for search fallback
  private demoManga = [
    {
      id: 'demo-1',
      title: 'Naruto',
      description: 'The story of a young ninja who dreams of becoming Hokage.',
      status: 'completed',
      tags: ['Action', 'Adventure', 'Martial Arts', 'Shounen'],
      author: 'Masashi Kishimoto',
      cover_art: null,
      demo: true
    },
    {
      id: 'demo-2', 
      title: 'One Piece',
      description: 'Follow Monkey D. Luffy and his crew as they search for the ultimate treasure.',
      status: 'ongoing',
      tags: ['Action', 'Adventure', 'Comedy', 'Shounen'],
      author: 'Eiichiro Oda',
      cover_art: null,
      demo: true
    },
    {
      id: 'demo-3',
      title: 'Attack on Titan',
      description: 'Humanity fights for survival against giant humanoid titans.',
      status: 'completed',
      tags: ['Action', 'Drama', 'Horror', 'Shounen'],
      author: 'Hajime Isayama',
      cover_art: null,
      demo: true
    },
    {
      id: 'demo-4',
      title: 'Demon Slayer',
      description: 'A young boy becomes a demon slayer to save his sister.',
      status: 'completed',
      tags: ['Action', 'Historical', 'Shounen', 'Supernatural'],
      author: 'Koyoharu Gotouge',
      cover_art: null,
      demo: true
    },
    {
      id: 'demo-5',
      title: 'My Hero Academia',
      description: 'In a world of superheroes, a boy without powers dreams of becoming one.',
      status: 'ongoing',
      tags: ['Action', 'School', 'Shounen', 'Super Power'],
      author: 'Kohei Horikoshi',
      cover_art: null,
      demo: true
    },
    {
      id: 'demo-6',
      title: 'Death Note',
      description: 'A high school student gains the power to kill anyone by writing their name.',
      status: 'completed',
      tags: ['Drama', 'Psychological', 'Shounen', 'Supernatural'],
      author: 'Tsugumi Ohba',
      cover_art: null,
      demo: true
    }
  ];


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
            this.fallbackToDemoSearch();
          }
        } else {
          this.fallbackToDemoSearch();
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      console.log('API unavailable, falling back to demo data...');
      this.fallbackToDemoSearch();
    } finally {
      this.loading.set(false);
    }
  }

  private fallbackToDemoSearch() {
    const query = this.searchQuery().toLowerCase().trim();
    const filteredManga = this.demoManga.filter(manga => 
      manga.title.toLowerCase().includes(query) ||
      manga.description.toLowerCase().includes(query) ||
      manga.tags.some(tag => tag.toLowerCase().includes(query)) ||
      manga.author.toLowerCase().includes(query)
    );

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

  showMangaDetails(manga: any) {
    // Navigate to manga detail page
    this.router.navigate(['/manga', manga.id], { state: { manga: manga } });
  }


  hideMangaDetails() {
    this.showDetails.set(false);
    this.selectedManga.set(null);
  }
}
