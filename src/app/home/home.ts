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

      console.log('Cover File Name:', this.getCoverFileName(this.coverId));
      
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

getCoverId(manga: Manga): any {
  const coverId = manga.relationships.find(rel => rel.type === 'cover_art')?.id;
  return coverId;
}

getCoverFileName(coverId: string) {
  const coverFileName = this.apiService.getCoverArt(coverId).subscribe(response => {
    console.log('Cover File Name:', response);
    // Assuming the response contains the cover file name
    console.log('FileName: ', response.data.attributes['fileName'])
    response = response.data.attributes['fileName'];

    return response;
  }, error => {
    console.error('Error fetching cover file name:', error);
    return null;
  });
  return coverFileName;
}

}

