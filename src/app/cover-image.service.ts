import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';

interface CoverArt {
  id: string;
  type: string;
  attributes: {
    fileName: string;
    volume: string | null;
  };
}

interface MangaDexResponse {
  data: CoverArt[];
}

@Injectable({
  providedIn: 'root'
})
export class CoverImageService {
  private coverCache = new Map<string, string>();
  private readonly placeholderUrl = 'https://via.placeholder.com/230x320/667eea/ffffff?text=No+Cover';

  constructor(private readonly http: HttpClient) {}

  /**
   * Get cover image URL for a manga from MangaDex API
   * @param mangaId The MangaDex manga ID
   * @param quality 'original' | '512' | '256' (default: '256')
   * @returns Observable of cover image URL
   */
  getCoverUrl(mangaId: string, quality: '256' | '512' | 'original' = '256'): Observable<string> {
    // Check cache first
    const cacheKey = `${mangaId}_${quality}`;
    if (this.coverCache.has(cacheKey)) {
      return of(this.coverCache.get(cacheKey)!);
    }

    // Fetch from MangaDex API
    return this.http.get<MangaDexResponse>(
      `https://api.mangadex.org/cover?manga[]=${mangaId}&limit=1&order[volume]=asc`
    ).pipe(
      map(response => {
        if (response.data && response.data.length > 0) {
          const cover = response.data[0];
          const fileName = cover.attributes.fileName;
          
          // Construct cover URL based on quality
          const baseUrl = 'https://uploads.mangadex.org/covers';
          let coverUrl: string;
          
          if (quality === 'original') {
            coverUrl = `${baseUrl}/${mangaId}/${fileName}`;
          } else {
            coverUrl = `${baseUrl}/${mangaId}/${fileName}.${quality}.jpg`;
          }
          
          // Cache the result
          this.coverCache.set(cacheKey, coverUrl);
          return coverUrl;
        }
        
        // No cover found, return placeholder
        return this.placeholderUrl;
      }),
      catchError(error => {
        console.error(`Error fetching cover for manga ${mangaId}:`, error);
        return of(this.placeholderUrl);
      })
    );
  }

  /**
   * Prefetch cover images for multiple manga IDs
   * @param mangaIds Array of manga IDs to prefetch
   */
  prefetchCovers(mangaIds: string[]): void {
    mangaIds.forEach(id => {
      this.getCoverUrl(id).subscribe(); // Subscribe to trigger the fetch and caching
    });
  }

  /**
   * Clear the cover cache
   */
  clearCache(): void {
    this.coverCache.clear();
  }

  /**
   * Get a direct cover URL if you already have the cover art relationship
   * @param mangaId The manga ID
   * @param fileName The cover art file name from the relationship
   * @param quality The desired quality
   */
  buildCoverUrl(mangaId: string, fileName: string, quality: '256' | '512' | 'original' = '256'): string {
    const baseUrl = 'https://uploads.mangadex.org/covers';
    
    if (quality === 'original') {
      return `${baseUrl}/${mangaId}/${fileName}`;
    }
    
    return `${baseUrl}/${mangaId}/${fileName}.${quality}.jpg`;
  }
}
