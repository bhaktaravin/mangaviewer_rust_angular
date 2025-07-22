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
  coverId: any;
  coverFileName: string = '';
  res: any;

  constructor(private apiService: Apiservice) { }



  ngOnInit() {
    this.getAllData();

    
  }

  /**
   * Fetches all manga data from the API and updates the mangaList.
   */
  getAllData(){
    this.apiService.getAllManga().subscribe(response => {
      console.log('Manga list:', response);
      this.mangaList = response.data;

      //Use the Cover Get Method to fetch cover images
      this.coverId = this.getCoverId(this.mangaList[0]);
      console.log('Cover Image:', this.coverId);

      
    }, error => {
      console.error('Error fetching manga list:', error);
      this.mangaList = [];
    });
  }

  getEnglishTitle(manga: Manga): string {
    return manga.attributes.title['en'] || '[No English Title]';
  }
  getEnglishDescription(manga: Manga): string {
  return manga.attributes.description['en']?.slice(0, 150) || '[No description]';
}

getCoverId(manga: any): string | null {
  const cover = manga.relationships.find((rel: any) => rel.type === 'cover_art');
  return cover?.id ?? null;
}



}

