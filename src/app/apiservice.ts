import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  manga?: any[];
  total_count?: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Apiservice {
  // Use local development server if available, fallback to production
  private baseUrl = this.getBaseUrl();
  
  constructor(private http: HttpClient) { }

  private getBaseUrl(): string {
    // Always use production backend on fly.io
    return 'https://api-nameless-haze-4648.fly.dev';
    
    // Uncomment below to use localhost for development:
    // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    //   return 'http://localhost:3000';
    // }
    // return 'https://api-nameless-haze-4648.fly.dev';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  // Authentication endpoints
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

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/logout`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Manga search endpoint (local database)
  searchManga(searchParams: MangaSearchRequest): Observable<MangaSearchResponse> {
    const params = new URLSearchParams();
    params.append('q', searchParams.query); // Use 'q' parameter as expected by backend
    if (searchParams.page) params.append('page', searchParams.page.toString());
    if (searchParams.limit) params.append('limit', searchParams.limit.toString());

    return this.http.get<MangaSearchResponse>(`${this.baseUrl}/api/manga/search?${params.toString()}`, {
      headers: this.getAuthHeaders()
    });
  }

  // External manga search (MangaDx API)
  searchExternalManga(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/manga?title=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders()
    });
  }

  // AI-powered manga recommendations (if available)
  getRecommendations(userId?: number): Observable<any> {
    const url = userId 
      ? `${this.baseUrl}/api/recommendations?userId=${userId}`
      : `${this.baseUrl}/api/recommendations`;
    
    return this.http.get(url, {
      headers: this.getAuthHeaders()
    });
  }

  // User profile endpoints
  getUserProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/user/profile`, {
      headers: this.getAuthHeaders()
    });
  }

  updateUserProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/user/profile`, profileData, {
      headers: this.getAuthHeaders()
    });
  }

  // Library management endpoints
  getUserLibrary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/library`, {
      headers: this.getAuthHeaders()
    });
  }

  getLibraryStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/library/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  addMangaToLibrary(mangaData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/library`, mangaData, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaProgress(mangaId: string, progressData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/library/${mangaId}/progress`, progressData, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaStatus(mangaId: string, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/library/${mangaId}/status`, { status }, {
      headers: this.getAuthHeaders()
    });
  }

  toggleMangaFavorite(mangaId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/library/${mangaId}/favorite`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  removeMangaFromLibrary(mangaId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/library/${mangaId}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaRating(mangaId: string, rating: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/library/${mangaId}/rating`, { rating }, {
      headers: this.getAuthHeaders()
    });
  }

  updateMangaNotes(mangaId: string, notes: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/library/${mangaId}/notes`, { notes }, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all manga - alias for getUserLibrary for backward compatibility
  getAllManga(): Observable<any> {
    return this.getUserLibrary();
  }

  // Health check endpoint
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}`, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  // Manga chapters endpoint
  getMangaChapters(mangaId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/manga/${mangaId}/chapters`, {
      headers: this.getAuthHeaders()
    });
  }

  // Download files endpoint
  downloadFiles(
    chapterId: string,
    savePath: string,
    mangaTitle: string,
    chapterTitle: string,
    quality: 'high' | 'saver'
  ): Observable<any> {
    const requestBody = {
      chapter_id: chapterId,
      save_path: savePath,
      manga_title: mangaTitle,
      chapter_title: chapterTitle,
      quality: quality
    };

    return this.http.post(`${this.baseUrl}/api/download-files`, requestBody, {
      headers: this.getAuthHeaders()
    });
  }
}
