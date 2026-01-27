import { Injectable } from '@angular/core';

export interface MangaLibraryItem {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url?: string;
  status: 'reading' | 'completed' | 'on_hold' | 'plan_to_read' | 'dropped';
  progress: {
    current_chapter: number;
    total_chapters?: number;
    current_volume: number;
    total_volumes?: number;
  };
  rating?: number;
  tags: string[];
  is_favorite: boolean;
  date_added: string;
  date_updated: string;
  notes: string;
}

export interface LibraryStats {
  total_manga: number;
  reading: number;
  completed: number;
  on_hold: number;
  plan_to_read: number;
  dropped: number;
  total_chapters_read: number;
  average_rating: number;
}

@Injectable({
  providedIn: 'root'
})
export class DemoDataService {
  
  /**
   * Get demo library data for guest users
   */
  getDemoLibrary(): MangaLibraryItem[] {
    return [
      {
        id: '1',
        title: 'One Piece',
        author: 'Eiichiro Oda',
        description: 'The story of Monkey D. Luffy and his journey to become Pirate King',
        cover_url: 'https://m.media-amazon.com/images/M/MV5BODcwNWE3OTMtMDc3MS00NDFjLWE1OTAtNDU3NjgxODMxY2UyXkEyXkFqcGdeQXVyNTAyODkwOQ@@._V1_.jpg',
        status: 'reading',
        progress: {
          current_chapter: 1095,
          total_chapters: undefined,
          current_volume: 108,
          total_volumes: undefined
        },
        rating: 5,
        tags: ['Action', 'Adventure', 'Comedy', 'Shounen'],
        is_favorite: true,
        date_added: '2023-01-15T10:00:00Z',
        date_updated: '2024-07-29T14:30:00Z',
        notes: 'Amazing adventure story! Currently following the Egghead arc.'
      },
      {
        id: '2',
        title: 'Attack on Titan',
        author: 'Hajime Isayama',
        description: 'Humanity fights for survival against giant humanoid Titans',
        cover_url: 'https://m.media-amazon.com/images/M/MV5BNzc5MTczNDQtNDFjNi00ZGM3LWE3OWMtZGEzNWY2Y2U4YmZiXkEyXkFqcGdeQXVyNTAyODkwOQ@@._V1_FMjpg_UX1000_.jpg',
        status: 'completed',
        progress: {
          current_chapter: 139,
          total_chapters: 139,
          current_volume: 34,
          total_volumes: 34
        },
        rating: 4,
        tags: ['Action', 'Drama', 'Fantasy', 'Military'],
        is_favorite: true,
        date_added: '2022-06-10T09:00:00Z',
        date_updated: '2023-04-09T16:45:00Z',
        notes: 'Incredible ending to an epic series. Mind-blowing plot twists!'
      },
      {
        id: '3',
        title: 'Demon Slayer',
        author: 'Koyoharu Gotouge',
        description: 'Tanjiro joins the Demon Slayer Corps to save his sister',
        cover_url: 'https://m.media-amazon.com/images/M/MV5BZjZjNzI5MDctY2Y4YS00NmM4LTljMmItZTFkOTExNGI3ODRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
        status: 'completed',
        progress: {
          current_chapter: 205,
          total_chapters: 205,
          current_volume: 23,
          total_volumes: 23
        },
        rating: 5,
        tags: ['Action', 'Historical', 'Shounen', 'Supernatural'],
        is_favorite: false,
        date_added: '2023-03-20T11:30:00Z',
        date_updated: '2023-08-15T13:20:00Z',
        notes: 'Beautiful art and emotional story. The anime adaptation is stunning!'
      },
      {
        id: '4',
        title: 'My Hero Academia',
        author: 'Kohei Horikoshi',
        description: 'Izuku Midoriya aims to become a hero in a world full of superpowers',
        status: 'on_hold',
        progress: {
          current_chapter: 280,
          total_chapters: undefined,
          current_volume: 29,
          total_volumes: undefined
        },
        rating: 3,
        tags: ['Action', 'School', 'Shounen', 'Super Power'],
        is_favorite: false,
        date_added: '2022-11-05T14:00:00Z',
        date_updated: '2024-02-10T10:15:00Z',
        notes: 'Taking a break but planning to catch up soon.'
      },
      {
        id: '5',
        title: 'Jujutsu Kaisen',
        author: 'Gege Akutami',
        description: 'Yuji Itadori joins the world of jujutsu sorcerers',
        status: 'plan_to_read',
        progress: {
          current_chapter: 0,
          total_chapters: undefined,
          current_volume: 0,
          total_volumes: undefined
        },
        rating: undefined,
        tags: ['Action', 'School', 'Shounen', 'Supernatural'],
        is_favorite: false,
        date_added: '2024-07-20T16:45:00Z',
        date_updated: '2024-07-20T16:45:00Z',
        notes: 'Heard great things about this series. Adding to reading list!'
      }
    ];
  }

  /**
   * Get demo stats for guest users
   */
  getDemoStats(): LibraryStats {
    return {
      total_manga: 5,
      reading: 1,
      completed: 2,
      on_hold: 1,
      plan_to_read: 1,
      dropped: 0,
      total_chapters_read: 1619,
      average_rating: 4.25
    };
  }

  /**
   * Check if demo data is available
   */
  isDemoDataAvailable(): boolean {
    return true;
  }
}
