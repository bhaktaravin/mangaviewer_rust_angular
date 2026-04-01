import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { Apiservice } from '../apiservice';
import { AuthService } from '../auth.service';
import { CoverImageService } from '../cover-image.service';
import { DisclaimerComponent } from '../disclaimer/disclaimer.component';
import { MangaReaderComponent } from '../manga-reader';
import { Manga } from '../interfaces/manga';
import { firstValueFrom } from 'rxjs';

export interface Chapter {
  id: string;
  attributes: {
    volume: string | null;
    chapter: string;
    title: string | null;
    translatedLanguage: string;
    pages: number;
    publishAt: string;
  };
}

export interface DownloadProgress {
  progress: number;
  status: string;
  error?: string;
  message?: string;
}

export interface DownloadSettings {
  savePath: string;
  quality: 'high' | 'saver';
  mangaTitle: string;
}

export interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
}

declare global {
  interface GlobalThis {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

@Component({
  selector: 'app-manga-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MangaReaderComponent, DisclaimerComponent],
  templateUrl: './manga-detail.html',
  styleUrl: './manga-detail.css'
})
export class MangaDetailComponent implements OnInit {
  manga: Manga | null = null;

  readonly chapters = signal<Chapter[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showDownloadModal = signal(false);
  readonly selectedChapter = signal<Chapter | null>(null);
  readonly downloadSettings = signal<DownloadSettings>({
    savePath: '/home/ravin/Downloads/manga',
    quality: 'high',
    mangaTitle: ''
  });
  readonly downloadProgress = signal<DownloadProgress | null>(null);
  readonly downloading = signal(false);
  readonly selectedCommonPath = signal<string>('');
  readonly addingToLibrary = signal(false);
  readonly inLibrary = signal(false);
  readonly coverUrl = signal<string | null>(null);
  readonly showReaderModal = signal(false);
  readonly readerImages = signal<string[]>([]);
  readonly readerChapter = signal<Chapter | null>(null);
  readonly readerLoading = signal(false);

  commonPaths = [
    { label: '🏠 Home/Downloads', path: '/home/ravin/Downloads/manga' },
    { label: '💻 Desktop', path: '/home/ravin/Desktop/manga' },
    { label: '📁 Documents', path: '/home/ravin/Documents/manga' },
    { label: '📚 Manga Library', path: '/home/ravin/manga_library' },
    { label: '⬇️ Temporary Downloads', path: '/tmp/manga_downloads' },
    { label: '✏️ Custom Location', path: 'custom' }
  ];

  constructor(
    private readonly apiService: Apiservice,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly coverService: CoverImageService,
    private readonly toastr: ToastrService,
    private readonly titleService: Title
  ) {}

  // ── Getters removed — signals are public and called with () in template ──

  ngOnInit() {
    const state = history.state as { manga?: Manga };
    if (state?.manga) {
      this.manga = state.manga;
      void this.initializeManga();
    } else {
      const mangaId = this.route.snapshot.paramMap.get('id');
      if (mangaId) void this.loadMangaById();
    }
  }

  private async initializeManga() {
    if (!this.manga) return;
    const mangaTitle = this.manga.attributes?.title?.['en'] || this.manga.attributes?.title?.['ja-ro'] || 'Unknown';
    this.titleService.setTitle(`${mangaTitle} - Manga Viewer`);
    this.coverService.getCoverUrl(this.manga.id, '512').subscribe(url => this.coverUrl.set(url));
    this.downloadSettings.set({ ...this.downloadSettings(), mangaTitle });
    this.selectedCommonPath.set('/home/ravin/Downloads/manga');
    await this.loadChapters();
  }

  private async loadMangaById() {
    const mangaId = this.route.snapshot.paramMap.get('id');
    if (!mangaId) { this.router.navigate(['/search']); return; }

    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.http.get<any>(`https://api.mangadex.org/manga/${mangaId}`));
      if (response?.data) {
        this.manga = {
          id: response.data.id,
          type: 'manga',
          attributes: {
            title: response.data.attributes?.title || {},
            description: response.data.attributes?.description || {},
            status: response.data.attributes?.status || '',
            originalLanguage: response.data.attributes?.originalLanguage || 'ja'
          },
          relationships: response.data.relationships || []
        };
        await this.initializeManga();
      } else {
        this.error.set('Manga not found');
        setTimeout(() => this.router.navigate(['/search']), 2000);
      }
    } catch {
      this.toastr.error('Failed to load manga details', 'Error');
      this.error.set('Failed to load manga details');
      setTimeout(() => this.router.navigate(['/search']), 2000);
    } finally {
      this.loading.set(false);
    }
  }

  async loadChapters() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.manga) { this.error.set('No manga loaded'); return; }
      const response = await firstValueFrom(this.apiService.getMangaChapters(this.manga.id));
      if (response && Array.isArray(response.data)) {
        this.chapters.set(response.data as Chapter[]);
      } else {
        this.error.set('No chapters found for this manga');
      }
    } catch {
      this.toastr.error('Failed to load chapters', 'Error');
      this.error.set('Failed to load chapters');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Reader ──────────────────────────────────────────────
  async openReaderModal(chapter: Chapter) {
    this.readerChapter.set(chapter);
    this.readerLoading.set(true);
    this.readerImages.set([]);
    this.showReaderModal.set(true);

    try {
      const response = await firstValueFrom(this.apiService.getChapterDownloadInfo(chapter.id));
      const data = response as any;
      const baseUrl: string = data?.baseUrl ?? '';
      const hash: string = data?.chapter?.hash ?? '';
      const pages: string[] = data?.chapter?.data ?? [];

      if (baseUrl && hash && pages.length) {
        this.readerImages.set(pages.map((p: string) => `${baseUrl}/data/${hash}/${p}`));
      } else {
        this.error.set('Could not load chapter pages');
      }
    } catch {
      this.error.set('Failed to fetch chapter pages');
    } finally {
      this.readerLoading.set(false);
    }
  }

  closeReaderModal = () => {
    this.showReaderModal.set(false);
    this.readerChapter.set(null);
    this.readerImages.set([]);
  };

  onPageChanged(event: { page: number; total: number }) {
    const chapter = this.readerChapter();
    const userId = this.auth.getUserId();
    if (!chapter || !userId || !this.manga) return;

    this.http.post('/api/progress/update', {
      user_id: userId,
      manga_id: this.manga.id,
      chapter_id: chapter.id,
      current_page: event.page,
      total_pages: event.total
    }).subscribe({ error: (e) => console.warn('Progress save failed:', e) });
  }

  // ── Library ─────────────────────────────────────────────
  addToLibrary(): void {
    if (!this.manga || !this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.addingToLibrary.set(true);
    const mangaTitle = this.manga.attributes?.title?.['en'] || this.manga.attributes?.title?.['ja-ro'] || 'Unknown Title';

    this.http.post<{ success: boolean; message: string }>('/api/progress/library/add', {
      user_id: userId,
      manga_id: this.manga.id,
      title: mangaTitle,
      status: 'PlanToRead'
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.inLibrary.set(true);
          this.toastr.success(`Added "${mangaTitle}" to your library`, 'Success');
        } else {
          this.toastr.error('Failed to add to library', 'Error');
        }
        this.addingToLibrary.set(false);
      },
      error: () => {
        this.toastr.error('Failed to add to library', 'Error');
        this.addingToLibrary.set(false);
      }
    });
  }

  // ── Download ─────────────────────────────────────────────
  openDownloadModal(chapter: Chapter) {
    this.selectedChapter.set(chapter);
    this.showDownloadModal.set(true);
  }

  closeDownloadModal() {
    this.showDownloadModal.set(false);
    this.selectedChapter.set(null);
    this.downloadProgress.set(null);
  }

  updateDownloadSetting(field: keyof DownloadSettings, value: string) {
    this.downloadSettings.set({ ...this.downloadSettings(), [field]: value });
  }

  onCommonPathChange(selectedPath: string) {
    this.selectedCommonPath.set(selectedPath);
    if (selectedPath !== 'custom') this.updateDownloadSetting('savePath', selectedPath);
  }

  async openDirectoryPicker() {
    try {
      const picker = (globalThis as any).showDirectoryPicker as (() => Promise<FileSystemDirectoryHandle>) | undefined;
      if (picker) {
        const dir = await picker();
        this.updateDownloadSetting('savePath', dir.name);
        this.selectedCommonPath.set('custom');
      } else {
        this.promptForCustomPath();
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') this.promptForCustomPath();
    }
  }

  promptForCustomPath(): void {
    const p = prompt('Enter custom download path:', this.downloadSettings().savePath);
    if (p?.trim()) { this.updateDownloadSetting('savePath', p.trim()); this.selectedCommonPath.set('custom'); }
  }

  isValidPath(path: string): boolean {
    return !!(path?.trim() && path !== 'custom');
  }

  async downloadChapter() {
    const chapter = this.selectedChapter();
    const settings = this.downloadSettings();
    if (!chapter || !this.isValidPath(settings.savePath)) {
      this.error.set('Please provide a valid save path');
      return;
    }
    this.downloading.set(true);
    this.error.set('');
    try {
      const chapterTitle = chapter.attributes.title || `Chapter_${chapter.attributes.chapter}`;
      const response = await firstValueFrom(this.apiService.downloadFiles(
        chapter.id, settings.savePath, settings.mangaTitle, chapterTitle, settings.quality
      ));
      if ((response as any)?.success) {
        this.downloadProgress.set(response as any);
      } else {
        this.error.set((response as any)?.error || 'Download failed');
      }
    } catch {
      this.toastr.error('Failed to download chapter', 'Error');
      this.error.set('Failed to download chapter');
    } finally {
      this.downloading.set(false);
    }
  }

  getChapterTitle(chapter: Chapter): string {
    if (!chapter?.attributes) return '';
    const num = chapter.attributes.chapter;
    const title = chapter.attributes.title;
    const label = num === '0' ? 'Prologue' : `Chapter ${num}`;
    return title ? `${label}: ${title}` : label;
  }

  formatFileSize(quality: 'high' | 'saver'): string {
    return quality === 'high' ? '~15-20MB (PNG)' : '~3-5MB (JPG)';
  }

  getPathPreview(): string {
    const settings = this.downloadSettings();
    const chapter = this.selectedChapter();
    if (!settings?.savePath || !chapter) return '';
    let title = chapter.attributes.title || `Chapter_${chapter.attributes.chapter}`;
    ['/', '\\', ':', '*', '?', '"', '<', '>', '|'].forEach(c => { title = title.replaceAll(c, ''); });
    return `${settings.savePath}/${settings.mangaTitle}/${title}/`;
  }

  chapterTracker(_: number, chapter: Chapter): string { return chapter.id; }
}
