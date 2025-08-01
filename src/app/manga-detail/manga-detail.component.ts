import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiservice } from '../apiservice';

interface Chapter {
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
  imports: [CommonModule, FormsModule],
  templateUrl: './manga-detail.component.html',
  styleUrl: './manga-detail.component.css'
})
export class MangaDetailComponent implements OnInit {
  manga = signal<any>(null);
  
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
  downloadProgress = signal<any>(null);
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
    private apiService: Apiservice,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Get manga data from route state or load from API
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['manga']) {
      this.manga.set(navigation.extras.state['manga']);
      this.initializeManga();
    } else {
      // Fallback: try to get manga ID from route params and load from API
      const mangaId = this.route.snapshot.paramMap.get('id');
      if (mangaId) {
        this.loadMangaById(mangaId);
      }
    }
  }

  private initializeManga() {
    const mangaData = this.manga();
    if (mangaData) {
      this.loadChapters();
      this.downloadSettings.set({
        ...this.downloadSettings(),
        mangaTitle: mangaData.title || mangaData.name || 'Unknown'
      });
      
      // Set default path
      this.selectedCommonPath.set('/home/ravin/Downloads/manga');
    }
  }

  private loadMangaById(mangaId: string) {
    // This would load manga details from API using the ID
    // For now, redirect back to search if no manga data
    this.router.navigate(['/search']);
  }

  async loadChapters() {
    this.loading.set(true);
    this.error.set('');

    try {
      const response = await this.apiService.getMangaChapters(this.manga().id).toPromise();
      
      if (response && response.data) {
        this.chapters.set(response.data);
      } else {
        this.error.set('No chapters found for this manga');
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

  updateDownloadSetting(field: keyof DownloadSettings, value: any) {
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
      if (window.showDirectoryPicker) {
        const dirHandle = await window.showDirectoryPicker();
        this.updateDownloadSetting('savePath', dirHandle.name);
        this.selectedCommonPath.set('custom');
      } else {
        // Fallback: prompt user to enter path manually
        this.promptForCustomPath();
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Directory picker error:', error);
        this.promptForCustomPath();
      }
    }
  }

  // Fallback method for custom path input
  promptForCustomPath() {
    const customPath = prompt('Enter custom download path:', this.downloadSettings().savePath);
    if (customPath && customPath.trim()) {
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
      
      const response = await this.apiService.downloadFiles(
        chapter.id,
        settings.savePath,
        settings.mangaTitle,
        chapterTitle,
        settings.quality
      ).toPromise();

      if (response && response.success) {
        this.downloadProgress.set(response);
      } else {
        this.error.set(response?.error || 'Download failed');
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
    const sanitizedTitle = chapterTitle.replace(/[/\\:*?"<>|]/g, '');
    
    return `${settings.savePath}/${settings.mangaTitle}/${sanitizedTitle}/`;
  }

  // Track chapters for *ngFor performance
  chapterTracker(index: number, chapter: Chapter): string {
    return chapter.id;
  }
}
