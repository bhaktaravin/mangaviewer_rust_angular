import { Component, signal, OnInit, Input } from '@angular/core';
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
  templateUrl: './manga-detail.html',
  styleUrl: './manga-detail.css'
})
export class MangaDetailComponent implements OnInit {
  private _mangaSignal = signal<any>(null);
  
  @Input() 
  set manga(value: any) {
    console.log('Manga input received:', value);
    if (value) {
      this._mangaSignal.set(value);
      // Trigger initialization when manga is set via input
      setTimeout(() => this.initializeManga(), 0);
    }
  }
  
  get manga() {
    return this._mangaSignal;
  }
  
  chapters = signal<Chapter[]>([]);
  loading = signal(false);
  error = signal('');
  
  // Download functionality
  showDownloadModal = signal(false);
  selectedChapter = signal<Chapter | null>(null);
  downloadSettings = signal<DownloadSettings>({
    savePath: this.getDefaultDownloadPath(),
    quality: 'high',
    mangaTitle: ''
  });
  downloadProgress = signal<any>(null);
  downloading = signal(false);
  
  // Bulk download functionality
  showBulkDownloadModal = signal(false);
  bulkDownloading = signal(false);
  bulkDownloadProgress = signal<{
    current: number;
    total: number;
    currentChapter: string;
    completed: string[];
    failed: string[];
  } | null>(null);
  isAuthenticated = signal(false); // This should be set based on actual auth state
  
  // Common download paths for quick selection
  commonPaths = this.getCommonPaths();
  selectedCommonPath = signal<string>('');

  constructor(
    private apiService: Apiservice,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  private getDefaultDownloadPath(): string {
    // Use a simple, universal default that works across platforms
    return './Downloads/manga';
  }

  private getCommonPaths() {
    // Provide generic, user-friendly path options that work across platforms
    return [
      { label: '🏠 Downloads Folder', path: './Downloads/manga' },
      { label: '💻 Desktop', path: './Desktop/manga' },
      { label: '📁 Documents', path: './Documents/manga' },
      { label: '📚 Current Directory', path: './manga' },
      { label: '� Manga Folder', path: './manga_library' },
      { label: '⬇️ Temp Downloads', path: './temp/manga' },
      { label: '✏️ Custom Location', path: 'custom' }
    ];
  }

  ngOnInit() {
    // Check if manga was passed as input (from modal)
    if (this.manga()) {
      this.initializeManga();
      return;
    }

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
    
    // TODO: Set authentication status based on actual auth service
    // For demo purposes, set to true. In real app, check with auth service
    this.isAuthenticated.set(true);
  }

  private initializeManga() {
    const mangaData = this.manga();
    if (mangaData) {
      this.loadChapters();
      this.downloadSettings.set({
        ...this.downloadSettings(),
        mangaTitle: mangaData.title || mangaData.name || 'Unknown'
      });
      
      // Set default path based on platform
      this.selectedCommonPath.set('./Downloads/manga');
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
      const mangaData = this.manga();
      
      // Check if this is demo data
      if (mangaData.demo || mangaData.id?.startsWith('demo-')) {
        console.log('Demo manga detected, creating mock chapters');
        // Create mock chapters for demo manga
        const mockChapters = this.createMockChapters(mangaData);
        this.chapters.set(mockChapters);
        this.loading.set(false);
        return;
      }

      const response = await this.apiService.getMangaChapters(mangaData.id).toPromise();
      
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

  private createMockChapters(manga: any): Chapter[] {
    // Create some mock chapters for demo purposes
    const chapterCount = manga.title === 'Death Note' ? 12 : 
                        manga.title === 'Naruto' ? 72 : 
                        manga.title === 'One Piece' ? 100 : 10;
    
    const mockChapters: Chapter[] = [];
    
    for (let i = 1; i <= Math.min(chapterCount, 20); i++) { // Limit to 20 chapters for demo
      mockChapters.push({
        id: `${manga.id}-chapter-${i}`,
        attributes: {
          volume: Math.ceil(i / 10).toString(),
          chapter: i.toString(),
          title: `Chapter ${i}: ${this.getChapterTitleForManga(manga.title, i)}`,
          translatedLanguage: 'en',
          pages: Math.floor(Math.random() * 30) + 15, // Random pages between 15-45
          publishAt: new Date(2020, 0, i).toISOString() // Mock publish dates
        }
      });
    }
    
    return mockChapters;
  }

  private getChapterTitleForManga(mangaTitle: string, chapterNum: number): string {
    const titles: { [key: string]: string[] } = {
      'Death Note': [
        'Boredom', 'Confrontation', 'Family', 'Pursuit', 'Tactics', 'Unraveling',
        'Overcast', 'Glare', 'Encounter', 'Doubt', 'Assault', 'Love'
      ],
      'Naruto': [
        'Uzumaki Naruto', 'My Name is Konohamaru', 'Sasuke and Sakura', 'The Test',
        'You Failed', 'A Dangerous Mission', 'The Land of Waves', 'The Oath of Pain'
      ],
      'One Piece': [
        'Romance Dawn', 'They Call Him Straw Hat Luffy', 'An Introduction', 'The Dawn of Adventure'
      ]
    };
    
    const mangaTitles = titles[mangaTitle] || ['The Adventure Continues'];
    return mangaTitles[(chapterNum - 1) % mangaTitles.length] || `Chapter ${chapterNum}`;
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
      
      // Check if this is a demo chapter
      if (chapter.id.includes('demo-')) {
        console.log('Demo download simulation');
        // Simulate download for demo
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
        this.downloadProgress.set({
          success: true,
          downloaded_count: chapter.attributes.pages,
          save_path: `${settings.savePath}/${settings.mangaTitle}/${chapterTitle.replace(/[/\\:*?"<>|]/g, '')}`,
          message: `Demo: Successfully "downloaded" ${chapter.attributes.pages} pages`
        });
        
        this.downloading.set(false);
        return;
      }
      
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

  // Bulk download functionality
  openBulkDownloadModal() {
    this.showBulkDownloadModal.set(true);
    this.bulkDownloadProgress.set(null);
  }

  closeBulkDownloadModal() {
    this.showBulkDownloadModal.set(false);
    this.bulkDownloadProgress.set(null);
    this.bulkDownloading.set(false);
  }

  async downloadAllChapters() {
    if (!this.isAuthenticated()) {
      this.error.set('Authentication required for bulk downloads');
      return;
    }

    const chapters = this.chapters();
    const settings = this.downloadSettings();
    
    if (!chapters.length || !this.isValidPath(settings.savePath)) {
      this.error.set('Please provide a valid save path and ensure chapters are loaded');
      return;
    }

    this.bulkDownloading.set(true);
    this.error.set('');
    
    const progress = {
      current: 0,
      total: chapters.length,
      currentChapter: '',
      completed: [] as string[],
      failed: [] as string[]
    };

    try {
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        progress.current = i + 1;
        progress.currentChapter = this.getChapterTitle(chapter);
        this.bulkDownloadProgress.set({ ...progress });

        try {
          await this.downloadSingleChapter(chapter, settings);
          progress.completed.push(chapter.id);
        } catch (error) {
          console.error(`Failed to download ${chapter.id}:`, error);
          progress.failed.push(chapter.id);
        }

        // Add small delay between downloads to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Final progress update
      this.bulkDownloadProgress.set({ ...progress });
      
      if (progress.failed.length === 0) {
        this.error.set('');
      } else {
        this.error.set(`${progress.failed.length} chapters failed to download`);
      }
    } catch (error) {
      console.error('Bulk download error:', error);
      this.error.set('Bulk download failed');
    } finally {
      this.bulkDownloading.set(false);
    }
  }

  private async downloadSingleChapter(chapter: Chapter, settings: DownloadSettings): Promise<void> {
    const chapterTitle = chapter.attributes.title || `Chapter_${chapter.attributes.chapter}`;
    
    // Check if this is a demo chapter
    if (chapter.id.includes('demo-')) {
      // Simulate download for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }
    
    // Real API call for actual chapters
    const response = await this.apiService.downloadFiles(
      chapter.id,
      settings.savePath,
      settings.mangaTitle,
      chapterTitle,
      settings.quality
    ).toPromise();

    if (!response || !response.success) {
      throw new Error(response?.error || 'Download failed');
    }
  }

  getBulkDownloadProgress(): string {
    const progress = this.bulkDownloadProgress();
    if (!progress) return '';
    
    return `${progress.current}/${progress.total} chapters`;
  }

  getBulkDownloadSummary(): string {
    const progress = this.bulkDownloadProgress();
    if (!progress || progress.current < progress.total) return '';
    
    const completed = progress.completed.length;
    const failed = progress.failed.length;
    
    if (failed === 0) {
      return `✅ Successfully downloaded all ${completed} chapters!`;
    } else {
      return `⚠️ Downloaded ${completed} chapters, ${failed} failed`;
    }
  }
}
