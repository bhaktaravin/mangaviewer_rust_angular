export interface MangaAttributes {
  title: { [lang: string]: string };
  description: { [lang: string]: string };
  status: string;
  lastChapter?: string;
  originalLanguage: string;
}

export interface Manga {
  id: string;
  type: string;
  attributes: MangaAttributes;
  relationships: {
    id: string;
    type: string;
  }[];
}

export interface ApiResponse<T> {
  result: string;
  response: string;
  data: T[];
  limit: number;
  offset: number;
  total: number;
}
