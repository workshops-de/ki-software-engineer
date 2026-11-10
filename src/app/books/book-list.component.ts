import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap, timer } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';
import { BookCatalogSelection } from './book-catalog-selection.service';
import { BookPaginationComponent } from './book-pagination.component';
import { RequestErrorComponent } from '../shared/request-error.component';

type CatalogIntent = { term: string; page: number; debounce: boolean };
type CatalogState =
  | { status: 'loading' | 'error' }
  | { status: 'success'; books: Book[]; page: number; pages: number[] };

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [AsyncPipe, FormsModule, BookItemComponent, BookPaginationComponent, RequestErrorComponent],
  templateUrl: './book-list.component.html'
})
export class BookListComponent {
  @Input() pageSize = 10;

  private readonly bookApiClient = inject(BookApiClient);
  private readonly catalogSelection = inject(BookCatalogSelection);
  private readonly requests = new BehaviorSubject<CatalogIntent>({
    ...this.catalogSelection.selection,
    debounce: false
  });

  // AsyncPipe owns the subscription. New intent cancels both debounce and HTTP work immediately.
  readonly state$: Observable<CatalogState> = this.requests.pipe(
    switchMap(({ term, page, debounce }) =>
      (debounce ? timer(300) : of(0)).pipe(
        switchMap(() =>
          this.bookApiClient.getBooksPage(this.pageSize, term, page).pipe(
            map(
              ({ books, total }): CatalogState => ({
                status: 'success',
                books,
                page,
                pages: Array.from({ length: Math.ceil(total / this.pageSize) }, (_, index) => index + 1)
              })
            ),
            catchError(() => of<CatalogState>({ status: 'error' }))
          )
        ),
        startWith<CatalogState>({ status: 'loading' })
      )
    )
  );

  get searchTerm(): string {
    return this.requests.value.term;
  }

  onSearchChange(term: string): void {
    if (term !== this.searchTerm) {
      this.request({ term, page: 1, debounce: term.length > 0 });
    }
  }

  clearSearch(): void {
    this.request({ term: '', page: 1, debounce: false });
  }

  retry(): void {
    this.request({ ...this.requests.value, debounce: false });
  }

  goToPage(page: number, pageCount: number): void {
    if (!Number.isInteger(page) || page < 1 || page > pageCount || page === this.requests.value.page) return;
    this.request({ term: this.searchTerm, page, debounce: false });
  }

  private request(intent: CatalogIntent): void {
    this.catalogSelection.selection = { term: intent.term, page: intent.page };
    this.requests.next(intent);
  }
}
