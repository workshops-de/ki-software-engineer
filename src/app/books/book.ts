export interface Book {
  id: string;
  isbn: string;
  title: string;
  subtitle?: string;
  author: string;
  publisher: string;
  numPages?: number;
  price: string;
  cover: string;
  abstract: string;
  userId: number;
  publishedAt?: string;
  coAuthors?: string[];
}
