import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiResponse } from './interfaces/manga'; // Adjust the import path as necessary
@Injectable({
  providedIn: 'root'
})
export class Apiservice {

  private apiUrl = 'https://mangaviewer-rust-angular.onrender.com'; 

  constructor(private http: HttpClient) { }

  getRoot(){
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/`);
  }

  getAllManga(limit: number = 10, offset: number = 0) {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/manga`);
  }

  getCoverArt(coverId: string) {
    return this.http.get<any>(`https://uploads.mangadex.org/cover/${coverId}`);
  }
  



}
