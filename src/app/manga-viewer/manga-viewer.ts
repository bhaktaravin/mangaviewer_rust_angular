import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiservice } from '../apiservice';

export interface MangaChapter {
  id: string;
  title: string;
  chapter_number: number;
  pages: string[];
  next_chapter?: string;
  previous_chapter?: string;
}

export interface MangaDetails {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url?: string;
  chapters: MangaChapter[];
  status: string;
  tags: string[];
}

@Component({
  selector: 'app-manga-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manga-viewer.html',
  styleUrls: ['./manga-viewer.css']
})
export class MangaViewerComponent implements OnInit {
  // Signals for reactive state
  mangaDetails = signal<MangaDetails | null>(null);
  currentChapter = signal<MangaChapter | null>(null);
  currentPage = signal(0);
  loading = signal(true);
  error = signal('');
  
  // Reading preferences
  readingMode = signal<'single' | 'double' | 'continuous'>('single');
  showChapterList = signal(false);
  
  // Computed properties
  totalPages = computed(() => this.currentChapter()?.pages?.length || 0);
  hasNextPage = computed(() => this.currentPage() < this.totalPages() - 1);
  hasPreviousPage = computed(() => this.currentPage() > 0);
  hasNextChapter = computed(() => !!this.currentChapter()?.next_chapter);
  hasPreviousChapter = computed(() => !!this.currentChapter()?.previous_chapter);
  
  // Demo manga data for when backend is unavailable
  private demoMangaData: MangaDetails = {
    id: 'demo-naruto',
    title: 'Naruto (Demo)',
    author: 'Masashi Kishimoto',
    description: 'Demo manga viewer - The story of a young ninja who dreams of becoming Hokage.',
    cover_url: 'https://via.placeholder.com/300x400?text=Naruto+Cover',
    status: 'completed',
    tags: ['Action', 'Adventure', 'Shounen'],
    chapters: [
      {
        id: 'ch1',
        title: 'Chapter 1: Uzumaki Naruto',
        chapter_number: 1,
        pages: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjRkY2QjZCIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5QYWdlIDFgPC90ZXh0Pgo8L3N2Zz4K',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjNEVDREE0Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5QYWdlIDI8L3RleHQ+Cjwvc3ZnPgo=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjNDVCN0QxIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5QYWdlIDM8L3RleHQ+Cjwvc3ZnPgo=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjOTZDRUI0Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJibGFjayIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5QYWdlIDQ8L3RleHQ+Cjwvc3ZnPgo=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjRkZFQUE3Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJibGFjayIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5QYWdlIDU8L3RleHQ+Cjwvc3ZnPgo='
        ],
        next_chapter: 'ch2'
      },
      {
        id: 'ch2',
        title: 'Chapter 2: Konohamaru',
        chapter_number: 2,
        pages: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjREREREREIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJibGFjayIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5DaDIgUGFnZSAxPC90ZXh0Pgo8L3N2Zz4K',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjOThEOEM4Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJibGFjayIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5DaDIgUGFnZSAyPC90ZXh0Pgo8L3N2Zz4K',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjRjdEQzZGIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJibGFjayIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5DaDIgUGFnZSAzPC90ZXh0Pgo8L3N2Zz4K',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTIwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMjAwIiBmaWxsPSIjQkI4RkNFIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iNjAwIiBmaWxsPSJibGFjayIgZm9udC1zaXplPSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5DaDIgUGFnZSA0PC90ZXh0Pgo8L3N2Zz4K'
        ],
        previous_chapter: 'ch1',
        next_chapter: 'ch3'
      },
      {
        id: 'ch3',
        title: 'Chapter 3: My Name is Konohamaru',
        chapter_number: 3,
        pages: [
          'https://via.placeholder.com/800x1200?text=Ch3+Page+1',
          'https://via.placeholder.com/800x1200?text=Ch3+Page+2',
          'https://via.placeholder.com/800x1200?text=Ch3+Page+3'
        ],
        previous_chapter: 'ch2'
      }
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: Apiservice
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const mangaId = params['id'];
      const chapterId = params['chapterId'];
      
      if (mangaId) {
        this.loadManga(mangaId, chapterId);
      }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyPress.bind(this));
  }

  private async loadManga(mangaId: string, chapterId?: string) {
    this.loading.set(true);
    this.error.set('');

    try {
      // Try to load from API first
      const response = await this.apiService.getMangaDetails(mangaId).toPromise();
      
      if (response && response.manga) {
        this.mangaDetails.set(response.manga);
        this.loadChapter(chapterId || response.manga.chapters[0]?.id);
      } else {
        this.fallbackToDemoData(mangaId, chapterId);
      }
    } catch (error) {
      console.error('Error loading manga:', error);
      this.fallbackToDemoData(mangaId, chapterId);
    } finally {
      this.loading.set(false);
    }
  }

  private fallbackToDemoData(mangaId: string, chapterId?: string) {
    console.log('Using demo manga data...');
    this.mangaDetails.set(this.demoMangaData);
    this.loadChapter(chapterId || this.demoMangaData.chapters[0]?.id);
    this.error.set('Demo mode: Using placeholder content');
  }

  private loadChapter(chapterId: string) {
    const manga = this.mangaDetails();
    if (!manga) return;

    const chapter = manga.chapters.find(ch => ch.id === chapterId);
    if (chapter) {
      console.log('Loading chapter:', chapter);
      console.log('Chapter pages:', chapter.pages);
      this.currentChapter.set(chapter);
      this.currentPage.set(0);
      
      // Update URL without navigation
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { chapter: chapterId },
        replaceUrl: true
      });
    }
  }

  // Navigation methods
  nextPage() {
    if (this.hasNextPage()) {
      this.currentPage.update(page => page + 1);
    } else if (this.hasNextChapter()) {
      this.nextChapter();
    }
  }

  previousPage() {
    if (this.hasPreviousPage()) {
      this.currentPage.update(page => page - 1);
    } else if (this.hasPreviousChapter()) {
      this.previousChapter();
    }
  }

  nextChapter() {
    const nextId = this.currentChapter()?.next_chapter;
    if (nextId) {
      this.loadChapter(nextId);
    }
  }

  previousChapter() {
    const prevId = this.currentChapter()?.previous_chapter;
    if (prevId) {
      this.loadChapter(prevId);
    }
  }

  goToPage(pageIndex: number) {
    if (pageIndex >= 0 && pageIndex < this.totalPages()) {
      this.currentPage.set(pageIndex);
    }
  }

  selectChapter(chapterId: string) {
    this.loadChapter(chapterId);
    this.showChapterList.set(false);
  }

  // Reading mode controls
  setReadingMode(mode: 'single' | 'double' | 'continuous') {
    this.readingMode.set(mode);
  }

  toggleChapterList() {
    this.showChapterList.update(show => !show);
  }

  // Keyboard navigation
  private handleKeyPress(event: KeyboardEvent) {
    switch(event.key) {
      case 'ArrowRight':
      case ' ':
        event.preventDefault();
        this.nextPage();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previousPage();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.previousChapter();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.nextChapter();
        break;
      case 'Escape':
        event.preventDefault();
        this.goBack();
        break;
    }
  }

  goBack() {
    this.router.navigate(['/library']);
  }

  onPageSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.goToPage(+target.value);
    }
  }

  // Image loading error handler
  onImageError(event: any) {
    console.log('Image error:', event);
    event.target.src = 'https://via.placeholder.com/800x1200?text=Image+Not+Found';
  }

  // Image loading success handler
  onImageLoad(event: any) {
    console.log('Image loaded successfully:', event.target.src);
  }
}
