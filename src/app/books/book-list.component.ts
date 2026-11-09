import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap, timer } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';

type CatalogIntent = { term: string; debounce: boolean };
type CatalogState = { status: 'loading' | 'error' } | { status: 'success'; books: Book[] };

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [AsyncPipe, FormsModule, BookItemComponent],
  templateUrl: './book-list.component.html'
})
export class BookListComponent {
  @Input() pageSize = 10;

  private readonly bookApiClient = inject(BookApiClient);
  private readonly requests = new BehaviorSubject<CatalogIntent>({ term: '', debounce: false });

  // AsyncPipe owns the subscription. New intent cancels both debounce and HTTP work immediately.
  readonly state$: Observable<CatalogState> = this.requests.pipe(
    switchMap(({ term, debounce }) =>
      (debounce ? timer(300) : of(0)).pipe(
        switchMap(() =>
          this.bookApiClient.getBooks(this.pageSize, term).pipe(
            map((books): CatalogState => ({ status: 'success', books })),
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
      this.requests.next({ term, debounce: term.length > 0 });
    }
  }

  clearSearch(): void {
    this.requests.next({ term: '', debounce: false });
  }

  retry(): void {
    this.requests.next({ term: this.searchTerm, debounce: false });
  }
}
