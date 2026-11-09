import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';

type BookListState = { status: 'loading' } | { status: 'success'; books: Book[] } | { status: 'error' };

interface BookListAction {
  type: 'search' | 'clear' | 'retry' | 'initial';
  term: string;
}

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [AsyncPipe, FormsModule, BookItemComponent],
  templateUrl: './book-list.component.html'
})
export class BookListComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly actions = new Subject<BookListAction>();

  @Input() pageSize = 10;
  searchTerm = '';

  readonly state$ = this.actions.pipe(
    startWith<BookListAction>({ type: 'initial', term: '' }),
    distinctUntilChanged((previous, current) => current.type === 'search' && previous.term === current.term),
    // Switch before the delay: a new action cancels both debounce and in-flight HTTP immediately.
    switchMap(action =>
      (action.type === 'search' ? timer(300) : of(0)).pipe(
        switchMap(() => this.bookApiClient.getBooks(this.pageSize, action.term)),
        map((books): BookListState => ({ status: 'success', books })),
        catchError(() => of<BookListState>({ status: 'error' })),
        startWith<BookListState>({ status: 'loading' })
      )
    )
  );

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.actions.next({ type: 'search', term });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.actions.next({ type: 'clear', term: '' });
  }

  retry(): void {
    this.actions.next({ type: 'retry', term: this.searchTerm });
  }
}
