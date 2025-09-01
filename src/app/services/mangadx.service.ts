import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface MangaDxManga {
  id: string;
  attributes: {
    title: { [key: string]: string };
    description: { [key: string]: string };
    tags: Array<{
      id: string;
      attributes: {
        name: { [key: string]: string };
        group: string;
      };
    }>;
    status: string;
    originalLanguage: string;
    publicationDemographic?: string;
    lastVolume?: string;
    lastChapter?: string;
    year?: number;
    contentRating: string;
    state: string;
    chapterNumbersResetOnNewVolume: boolean;
    createdAt: string;
    updatedAt: string;
    version: number;
  };
  relationships: Array<{
    id: string;
    type: string;
    attributes?: any;
  }>;
}

export interface MangaDxResponse {
  result: string;
  response: string;
  data: MangaDxManga[];
  limit: number;
  offset: number;
  total: number;
}

export interface MangaDxCoverArt {
  id: string;
  attributes: {
    fileName: string;
    description: string;
    volume?: string;
    locale: string;
    createdAt: string;
    updatedAt: string;
    version: number;
  };
  relationships: Array<{
    id: string;
    type: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class MangadxService {
  private readonly baseUrl = 'https://api.mangadex.org';
  private readonly coverBaseUrl = 'https://uploads.mangadx.org/covers';

  constructor(private http: HttpClient) {}

  /**
   * Search for manga by title
   */
  searchManga(title: string, limit: number = 10): Observable<MangaDxManga[]> {
    const url = `${this.baseUrl}/manga`;
    const params = {
      title: title,
      limit: limit.toString(),
      'includes[]': ['cover_art', 'author', 'artist'],
      'order[relevance]': 'desc'
    };

    return this.http.get<MangaDxResponse>(url, { params }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error searching manga:', error);
        return of([]);
      })
    );
  }

  /**
   * Get cover image URL for a manga
   */
  getCoverImageUrl(mangaId: string, fileName: string, size: 'original' | '512' | '256' = '256'): string {
    if (size === 'original') {
      return `${this.coverBaseUrl}/${mangaId}/${fileName}`;
    }
    return `${this.coverBaseUrl}/${mangaId}/${fileName}.${size}.jpg`;
  }

  /**
   * Get cover art for a specific manga
   */
  getCoverArt(mangaId: string): Observable<string | null> {
    const url = `${this.baseUrl}/cover`;
    const params = {
      'manga[]': mangaId,
      limit: '1'
    };

    return this.http.get<{ data: MangaDxCoverArt[] }>(url, { params }).pipe(
      map(response => {
        if (response.data && response.data.length > 0) {
          const cover = response.data[0];
          return this.getCoverImageUrl(mangaId, cover.attributes.fileName);
        }
        return null;
      }),
      catchError(error => {
        console.error('Error fetching cover art:', error);
        return of(null);
      })
    );
  }

  /**
   * Get manga by exact title match and return cover URL
   */
  getMangaCoverByTitle(title: string): Observable<string | null> {
    // Clean up the title - remove "(Demo)" suffix and normalize
    const cleanTitle = title.replace(/\s*\(Demo\)\s*$/i, '').trim();
    
    return this.searchManga(cleanTitle, 1).pipe(
      map(manga => {
        if (manga.length === 0) return null;
        
        const firstManga = manga[0];
        const coverArt = firstManga.relationships.find(rel => rel.type === 'cover_art');
        
        if (coverArt && coverArt.attributes?.fileName) {
          return this.getCoverImageUrl(firstManga.id, coverArt.attributes.fileName);
        }
        
        return null;
      }),
      catchError(error => {
        console.error(`Error getting cover for "${title}":`, error);
        return of(null);
      })
    );
  }

  /**
   * Get fallback placeholder image
   */
  getPlaceholderImage(title: string, color: string = '6B46C1'): string {
    const encodedTitle = encodeURIComponent(title.replace(/\s+/g, '+'));
    return `https://via.placeholder.com/300x400/${color}/white?text=${encodedTitle}`;
  }
}
