import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { Book } from './book';

export interface BookPage {
  books: Book[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class BookApiClient {
  private readonly apiUrl = `${inject(API_BASE_URL).replace(/\/$/, '')}/books`;

  constructor(private http: HttpClient) {}

  getBook(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  getBooks(pageSize: number = 10, searchTerm?: string): Observable<Book[]> {
    return this.getBooksPage(pageSize, searchTerm).pipe(map(result => result.books));
  }

  getBooksPage(pageSize: number = 10, searchTerm?: string, page: number = 1): Observable<BookPage> {
    let params = new HttpParams().set('_limit', pageSize.toString());

    // The API defaults to page one; retain the existing first-page request contract.
    if (page > 1) params = params.set('_page', page.toString());

    if (searchTerm) {
      // Search in title and author fields
      params = params.set('q', searchTerm);
    }

    return this.http.get<Book[]>(this.apiUrl, { params, observe: 'response' }).pipe(
      map(response => {
        const books = response.body ?? [];
        const total = Number(response.headers.get('X-Total-Count') ?? books.length);
        return { books, total: Number.isInteger(total) && total >= 0 ? total : books.length };
      })
    );
  }
}
