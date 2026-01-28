import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Apiservice } from '../apiservice';
import { AuthService } from '../auth.service';
import { CoverImageService } from '../cover-image.service';
import { Manga } from '../interfaces/manga';
import { firstValueFrom } from 'rxjs';
// Required interfaces
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

export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
}

// Extend globalThis interface for File System Access API
declare global {
  interface GlobalThis {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

@Component({
  selector: 'app-manga-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manga-detail.html',
  styleUrl: './manga-detail.css'
})
export class MangaDetailComponent implements OnInit {
  manga: Manga | null = null;
  private readonly _chapters = signal<Chapter[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal('');
  private readonly _showDownloadModal = signal(false);
  private readonly _selectedChapter = signal<Chapter | null>(null);
  private readonly _downloadSettings = signal<DownloadSettings>({
    savePath: '/home/ravin/Downloads/manga',
    quality: 'high',
    mangaTitle: ''
  });
  private readonly _downloadProgress = signal<DownloadProgress | null>(null);
  private readonly _downloading = signal(false);
  private readonly _selectedCommonPath = signal<string>('');
  private readonly _addingToLibrary = signal(false);
  private readonly _inLibrary = signal(false);
  private readonly _coverUrl = signal<string | null>(null);

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
    private readonly toastr: ToastrService
  ) {}

  get chapters() { return this._chapters(); }
  get loading() { return this._loading(); }
  get error() { return this._error(); }
  get showDownloadModal() { return this._showDownloadModal(); }
  get selectedChapter() { return this._selectedChapter(); }
  get downloadSettings() { return this._downloadSettings(); }
  get downloadProgress() { return this._downloadProgress(); }
  get addingToLibrary() { return this._addingToLibrary(); }
  get inLibrary() { return this._inLibrary(); }
  get downloading() { return this._downloading(); }
  get selectedCommonPath() { return this._selectedCommonPath(); }
  get coverUrl() { return this._coverUrl(); }

  ngOnInit() {
    // Check if manga was passed via router state
    const state = history.state as { manga?: Manga };
    if (state?.manga) {
      this.manga = state.manga;
      this.initializeManga();
    } else {
      const mangaId = this.route.snapshot.paramMap.get('id');
      if (mangaId) {
        this.loadMangaById();
      }
    }
  }

  private initializeManga() {
    const mangaData = this.manga;
    if (mangaData) {
      this.loadChapters();
      this.loadCoverImage();
      this._downloadSettings.set({
        ...this.downloadSettings,
        mangaTitle: mangaData.attributes?.title?.['en'] || mangaData.attributes?.title?.['jp'] || 'Unknown'
      });
      this._selectedCommonPath.set('/home/ravin/Downloads/manga');
    }
  }

  private async loadMangaById() {
    const mangaId = this.route.snapshot.paramMap.get('id');
    if (!mangaId) {
      this.router.navigate(['/search']);
      return;
    }

    this._loading.set(true);
    try {
      // Try to fetch from backend or MangaDex API
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
        this.initializeManga();
      } else {
        this._error.set('Manga not found');
        setTimeout(() => this.router.navigate(['/search']), 2000);
      }
    } catch (error) {
      console.error('Failed to load manga:', error);
      this.toastr.error('Failed to load manga details', 'Error');
      this._error.set('Failed to load manga details');
      setTimeout(() => this.router.navigate(['/search']), 2000);
    } finally {
      this._loading.set(false);
    }
  }

  private loadCoverImage(): void {
    if (!this.manga?.id) return;
    
    this.coverService.getCoverUrl(this.manga.id, '512').subscribe(url => {
      this._coverUrl.set(url);
    });
  }

  async loadChapters() {
    this._loading.set(true);
    this._error.set('');
    try {
      if (!this.manga) {
        this._error.set('No manga loaded');
        return;
      }
      const response = await firstValueFrom(this.apiService.getMangaChapters(this.manga.id));
      if (response && Array.isArray(response.data)) {
        this._chapters.set(response.data as Chapter[]);
      } else {
        this._error.set('No chapters found for this manga');
      }
    } catch (error) {
      console.error('Failed to load chapters:', error);
      this.toastr.error('Failed to load chapters', 'Error');
      this._error.set('Failed to load chapters');
    } finally {
      this._loading.set(false);
    }
  }

  openDownloadModal(chapter: Chapter) {
    this._selectedChapter.set(chapter);
    this._showDownloadModal.set(true);
  }

  closeDownloadModal() {
    this._showDownloadModal.set(false);
    this._selectedChapter.set(null);
    this._downloadProgress.set(null);
  }

  updateDownloadSetting(field: keyof DownloadSettings, value: string) {
    const settings = this.downloadSettings;
    this._downloadSettings.set({
      ...settings,
      [field]: value
    });
  }

  onCommonPathChange(selectedPath: string) {
    this._selectedCommonPath.set(selectedPath);
    if (selectedPath !== 'custom') {
      this.updateDownloadSetting('savePath', selectedPath);
    }
  }

  async openDirectoryPicker() {
    try {
      const showDirectoryPicker = (globalThis as any).showDirectoryPicker as (() => Promise<FileSystemDirectoryHandle>) | undefined;
      if (showDirectoryPicker) {
        const dirHandle = await showDirectoryPicker();
        this.updateDownloadSetting('savePath', dirHandle.name);
        this._selectedCommonPath.set('custom');
      } else {
        this.promptForCustomPath();
      }
    } catch (error: unknown) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.error('Directory picker error:', error);
        this.promptForCustomPath();
      }
    }
  }

  promptForCustomPath(): void {
    const customPath = prompt('Enter custom download path:', this.downloadSettings.savePath);
    if (customPath?.trim()) {
      this.updateDownloadSetting('savePath', customPath.trim());
      this._selectedCommonPath.set('custom');
    }
  }

  isValidPath(path: string): boolean {
    return !!(path && path.trim().length > 0 && path !== 'custom');
  }

  async downloadChapter() {
    const chapter = this.selectedChapter;
    const settings = this.downloadSettings;
    if (!chapter || !this.isValidPath(settings.savePath)) {
      this._error.set('Please provide a valid save path');
      return;
    }
    this._downloading.set(true);
    this._error.set('');
    try {
      const chapterTitle = chapter.attributes.title || `Chapter_${chapter.attributes.chapter}`;
      if (typeof this.apiService.downloadFiles !== 'function') {
        this._error.set('Download not supported. Method missing on Apiservice.');
        return;
      }
      const response = await firstValueFrom(this.apiService.downloadFiles(
        chapter.id,
        settings.savePath,
        settings.mangaTitle,
        chapterTitle,
        settings.quality
      ));
      if (response?.success) {
        this._downloadProgress.set(response as any);
      } else {
        this._error.set((response as any)?.error || 'Download failed');
      }
    } catch (error) {
      console.error('Failed to download chapter:', error);
      this.toastr.error('Failed to download chapter', 'Error');
      this._error.set('Failed to download chapter');
    } finally {
      this._downloading.set(false);
    }
  }

  getChapterTitle(chapter: Chapter): string {
    if (!chapter?.attributes) return '';
    const chapterNumber = chapter.attributes.chapter;
    const title = chapter.attributes.title;
    return title ? `Chapter ${chapterNumber}: ${title}` : `Chapter ${chapterNumber}`;
  }

  formatFileSize(quality: 'high' | 'saver'): string {
    return quality === 'high' ? '~15-20MB (PNG)' : '~3-5MB (JPG)';
  }

  getPathPreview(): string {
    const settings = this.downloadSettings;
    const chapter = this.selectedChapter;
    if (!settings?.savePath || !chapter) return '';
    const chapterTitle = chapter.attributes.title || `Chapter_${chapter.attributes.chapter}`;
    let sanitizedTitle = chapterTitle;
    ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
      .forEach(char => {
        sanitizedTitle = sanitizedTitle.replaceAll(char, "");
      });
    return `${settings.savePath}/${settings.mangaTitle}/${sanitizedTitle}/`;
  }

  addToLibrary(): void {
    if (!this.manga || !this.auth.isAuthenticated()) {
      return;
    }

    const userId = this.auth.getUserId();
    if (!userId) {
      this._error.set('User not authenticated');
      return;
    }

    this._addingToLibrary.set(true);
    this._error.set('');

    const mangaTitle = this.manga.attributes?.title?.['en'] || 
                      this.manga.attributes?.title?.['jp'] || 
                      'Unknown Title';

    this.http.post<{success: boolean; message: string}>('/api/progress/library/add', {
      user_id: userId,
      manga_id: this.manga.id,
      title: mangaTitle,
      status: 'PlanToRead'
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this._inLibrary.set(true);
          this._addingToLibrary.set(false);
          this.toastr.success(`Added "${mangaTitle}" to your library!`, 'Success');
        } else {
          this._error.set('Failed to add to library');
          this._addingToLibrary.set(false);
          this.toastr.error('Failed to add to library', 'Error');
        }
      },
      error: (err) => {
        this.toastr.error('Failed to add to library. Please try again.', 'Error');
        this._error.set('Failed to add to library. Please try again.');
        this._addingToLibrary.set(false);
      }
    });
  }
}
