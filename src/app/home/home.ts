import { Component } from '@angular/core';
import { Apiservice } from '../apiservice';
import { Manga, MangaAttributes, ApiResponse  } from '../interfaces/manga';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {

  mangaList: any[] = [];
  searchQuery: string = '';
  loading: boolean = false;
  debounceTimeout: any;

  constructor(private apiService: Apiservice) { }

  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
    this.loading = true;
    this.apiService.getAllManga().subscribe(
      response => {
        this.mangaList = response.data;
        this.loading = false;
      },
      error => {
        this.mangaList = [];
        this.loading = false;
      }
    );
  }

  onSearchChange(query: string) {
    clearTimeout(this.debounceTimeout);
    this.searchQuery = query;
    if (!query) {
      this.getAllData();
      return;
    }
    this.debounceTimeout = setTimeout(() => {
      this.searchManga(query);
    }, 400);
  }

  searchManga(query: string) {
    this.loading = true;
    this.apiService.semanticSearch(query).subscribe(
      response => {
        this.mangaList = response.data;
        this.loading = false;
      },
      error => {
        this.mangaList = [];
        this.loading = false;
      }
    );
  }

  getEnglishTitle(manga: Manga): string {
    return manga.attributes.title['en'] || '[No English Title]';
  }

  getEnglishDescription(manga: Manga): string {
    return manga.attributes.description['en']?.slice(0, 150) || '[No description]';
  }

  getCoverId(manga: Manga): any {
    return manga.relationships.find(rel => rel.type === 'cover_art')?.id;
  }

}

