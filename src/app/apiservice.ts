import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Manga } from './interfaces/manga';
import { ApiResponse } from './interfaces/manga';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;  // Changed from number to string to match Rust backend
    username: string;
    email: string;
  };
  token?: string;
  message?: string;
}

export interface MangaSearchRequest {
  query: string;
  page?: number;
  limit?: number;
}

export interface MangaSearchResponse {
  success: boolean;
  manga?: Manga[];
  total_count?: number;
  message?: string;
}


export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  token?: string;
  message?: string;
}

export interface MangaSearchRequest {
  query: string;
  page?: number;
  limit?: number;
}

export interface MangaSearchResponse {
  success: boolean;
  manga?: Manga[];
  total_count?: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Apiservice {
  private baseUrl = this.getBaseUrl();

  constructor(private http: HttpClient) { }

  private getBaseUrl(): string {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    return 'https://api-nameless-haze-4648.fly.dev';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, credentials, {
      headers: this.getAuthHeaders()
    });
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/register`, userData, {
      headers: this.getAuthHeaders()
    });
  }

  logout(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.baseUrl}/api/auth/logout`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  searchManga(searchParams: MangaSearchRequest): Observable<MangaSearchResponse> {
    const params = new URLSearchParams();
    params.append('q', searchParams.query);
    if (searchParams.page) params.append('page', searchParams.page.toString());
    if (searchParams.limit) params.append('limit', searchParams.limit.toString());
    return this.http.get<MangaSearchResponse>(`${this.baseUrl}/api/manga/search?${params.toString()}`, {
      headers: this.getAuthHeaders()
    });
  }

  semanticSearch(query: string): Observable<ApiResponse<Manga>> {
    return this.http.post<ApiResponse<Manga>>(`${this.baseUrl}/api/manga/semantic-search`, { query }, {
      headers: this.getAuthHeaders()
    });
  }

  searchExternalManga(query: string): Observable<ApiResponse<Manga>> {
    return this.http.get<ApiResponse<Manga>>(`${this.baseUrl}/api/manga?title=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders()
    });
  }

  getMangaChapters(mangaId: string, chapter?: string, lang: string = 'en'): Observable<ApiResponse<Manga>> {
    let url = `${this.baseUrl}/api/manga/${mangaId}/chapters?translatedLanguage[]=${lang}`;
    if (chapter) {
      url += `&chapter=${encodeURIComponent(chapter)}`;
    }
    return this.http.get<ApiResponse<Manga>>(url, {
      headers: this.getAuthHeaders()
    });
  }

  getChapterDownloadInfo(chapterId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/api/manga/download?chapter_id=${chapterId}`, {
      headers: this.getAuthHeaders()
    });
  }

  getRecommendations(userId?: number): Observable<ApiResponse<Manga>> {
    const url = userId 
      ? `${this.baseUrl}/api/recommendations?userId=${userId}`
      : `${this.baseUrl}/api/recommendations`;
    return this.http.get<ApiResponse<Manga>>(url, {
      headers: this.getAuthHeaders()
    });
  }

  getUserProfile(): Observable<{ user: { id: string; username: string; email: string } }> {
    return this.http.get<{ user: { id: string; username: string; email: string } }>(`${this.baseUrl}/api/user/profile`, {
      headers: this.getAuthHeaders()
    });
  }

  updateUserProfile(profileData: { username?: string; email?: string; password?: string }): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.baseUrl}/api/user/profile`, profileData, {
      headers: this.getAuthHeaders()
    });
  }

  getUserLibrary(): Observable<{ manga: Manga[] }> {
    return this.http.get<{ manga: Manga[] }>(`${this.baseUrl}/api/library`, {
      headers: this.getAuthHeaders()
    });
  }

  getLibraryStats(): Observable<{ totalManga: number; currentlyReading: number; completed: number; planToRead: number }> {
    return this.http.get<{ totalManga: number; currentlyReading: number; completed: number; planToRead: number }>(`${this.baseUrl}/api/library/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  addMangaToLibrary(mangaData: Manga): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.baseUrl}/api/library`, mangaData, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaProgress(mangaId: string, progressData: { chapter: string; page: number }): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.baseUrl}/api/library/${mangaId}/progress`, progressData, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaStatus(mangaId: string, status: string): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.baseUrl}/api/library/${mangaId}/status`, { status }, {
      headers: this.getAuthHeaders()
    });
  }

  toggleMangaFavorite(mangaId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.baseUrl}/api/library/${mangaId}/favorite`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  removeMangaFromLibrary(mangaId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.baseUrl}/api/library/${mangaId}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaRating(mangaId: string, rating: number): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.baseUrl}/api/library/${mangaId}/rating`, { rating }, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaNotes(mangaId: string, notes: string): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.baseUrl}/api/library/${mangaId}/notes`, { notes }, {
      headers: this.getAuthHeaders()
    });
  }

  getAllManga(): Observable<{ manga: Manga[] }> {
    return this.getUserLibrary();
  }

  healthCheck(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}`, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  downloadFiles(
    chapterId: string,
    savePath: string,
    mangaTitle: string,
    chapterTitle: string,
    quality: 'high' | 'saver'
  ): Observable<{ success: boolean; message?: string }> {
    const requestBody = {
      chapter_id: chapterId,
      save_path: savePath,
      manga_title: mangaTitle,
      chapter_title: chapterTitle,
      quality: quality
    };
    return this.http.post<{ success: boolean; message?: string }>(`${this.baseUrl}/api/download-files`, requestBody, {
      headers: this.getAuthHeaders()
    });
  }
}
