import { Component, signal, OnInit, Input } from '@angular/core';
import { Manga } from '../interfaces/manga';
import { firstValueFrom } from 'rxjs';

// Exported Chapter interface (single declaration)
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

// Exported DownloadProgress interface (single declaration)
export interface DownloadProgress {
  progress: number;
  status: string;
  error?: string;
  message?: string;
}

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiservice } from '../apiservice';


interface DownloadSettings {
  savePath: string;
  quality: 'high' | 'saver';
  mangaTitle: string;
}

interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
}

// Extend Window interface for File System Access API
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

@Component({
  selector: 'app-manga-detail',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './manga-detail.component.html',
  styleUrl: './manga-detail.component.css'
})
export class MangaDetailComponent implements OnInit {
  @Input() manga: Manga | null = null;

  chapters = signal<Chapter[]>([]);
  loading = signal(false);
  error = signal('');

  // Download functionality
  showDownloadModal = signal(false);
  selectedChapter = signal<Chapter | null>(null);
  downloadSettings = signal<DownloadSettings>({
    savePath: '/home/ravin/Downloads/manga',
    quality: 'high',
    mangaTitle: ''
  });
  downloadProgress = signal<DownloadProgress | null>(null);
  downloading = signal(false);

  // Common download paths for quick selection
  commonPaths = [
    { label: '🏠 Home/Downloads', path: '/home/ravin/Downloads/manga' },
    { label: '💻 Desktop', path: '/home/ravin/Desktop/manga' },
    { label: '📁 Documents', path: '/home/ravin/Documents/manga' },
    { label: '📚 Manga Library', path: '/home/ravin/manga_library' },
    { label: '⬇️ Temporary Downloads', path: '/tmp/manga_downloads' },
    { label: '✏️ Custom Location', path: 'custom' }
  ];
  selectedCommonPath = signal<string>('');

  constructor(
    private readonly apiService: Apiservice,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit() {
    // Get manga data from route state or load from API
    // Deprecated: getCurrentNavigation() is deprecated, but used for compatibility
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['manga']) {
      this.manga = navigation.extras.state['manga'];
      this.initializeManga();
    } else {
      // Fallback: try to get manga ID from route params and load from API
      const mangaId = this.route.snapshot.paramMap.get('id');
      if (mangaId) {
        this.loadMangaById();
      }
    }
  }

  private initializeManga() {
    this.loadChapters();
    this.downloadSettings.set({
      ...this.downloadSettings(),
      mangaTitle: this.manga?.attributes?.title?.['en'] || this.manga?.attributes?.title?.['jp'] || 'Unknown'
    });
    // Set default path
    this.selectedCommonPath.set('/home/ravin/Downloads/manga');
  }

  private loadMangaById() {
    // This would load manga details from API using the ID
    // For now, redirect back to search if no manga data
    this.router.navigate(['/search']);
  }

  async loadChapters() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.manga) {
        this.error.set('No manga loaded');
        return;
      }
      const response = await firstValueFrom(this.apiService.getMangaChapters(this.manga.id));
      if (response?.data) {
        // If response.data is Manga[], map to Chapter[] if needed
        // But if API is fixed to return Chapter[], just assign
        this.chapters.set(response.data);
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
      this.error.set('Failed to load chapters');
    } finally {
      this.loading.set(false);
    }
  }

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
    const settings = this.downloadSettings();
    this.downloadSettings.set({
      ...settings,
      [field]: value
    });
  }

  // Handle common path selection
  onCommonPathChange(selectedPath: string) {
    this.selectedCommonPath.set(selectedPath);
    if (selectedPath !== 'custom') {
      this.updateDownloadSetting('savePath', selectedPath);
    }
  }

  // Modern browser directory picker (if supported)
  async openDirectoryPicker() {
    try {
      const win = globalThis as unknown as Window;
      if (typeof win.showDirectoryPicker === 'function') {
        const dirHandle = await win.showDirectoryPicker();
        this.updateDownloadSetting('savePath', dirHandle.name);
        this.selectedCommonPath.set('custom');
      } else {
        // Fallback: prompt user to enter path manually
        this.promptForCustomPath();
      }
    } catch (error: unknown) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.error('Directory picker error:', error);
        this.promptForCustomPath();
      }
    }
  }

  promptForCustomPath() {
    const customPath = prompt('Enter custom download path:', this.downloadSettings().savePath);
    if (customPath?.trim()) {
      this.updateDownloadSetting('savePath', customPath.trim());
      this.selectedCommonPath.set('custom');
    }
  }

  // Validate path
  isValidPath(path: string): boolean {
    return !!(path && path.trim().length > 0 && path !== 'custom');
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
        chapter.id,
        settings.savePath,
        settings.mangaTitle,
        chapterTitle,
        settings.quality
      ));
      if (response && typeof response === 'object' && 'progress' in response && 'status' in response) {
        this.downloadProgress.set(response as DownloadProgress);
      } else {
        this.error.set((response as any)?.error || (response as any)?.message || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      this.error.set('Failed to download chapter');
    } finally {
      this.downloading.set(false);
    }
  }

  getChapterTitle(chapter: Chapter): string {
    const chapterNumber = chapter.attributes.chapter;
    const title = chapter.attributes.title;
    return title ? `Chapter ${chapterNumber}: ${title}` : `Chapter ${chapterNumber}`;
  }

  formatFileSize(quality: 'high' | 'saver'): string {
    return quality === 'high' ? '~15-20MB (PNG)' : '~3-5MB (JPG)';
  }

  getPathPreview(): string {
    const settings = this.downloadSettings();
    const chapter = this.selectedChapter();
    if (!settings.savePath || !chapter) return '';
    const chapterTitle = chapter.attributes.title || `Chapter_${chapter.attributes.chapter}`;
    let sanitizedTitle = chapterTitle;
    const forbiddenChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    for (const char of forbiddenChars) {
      sanitizedTitle = sanitizedTitle.replaceAll(char, '');
    }
    return `${settings.savePath}/${settings.mangaTitle}/${sanitizedTitle}/`;
  }

  chapterTracker(index: number, chapter: Chapter): string {
    return chapter.id;
  }
}
