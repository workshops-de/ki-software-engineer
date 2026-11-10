import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';
import { BookCarouselComponent } from './book-carousel.component';

type BookListState = { status: 'loading' } | { status: 'success'; books: Book[] } | { status: 'error' };

interface BookListAction {
  type: 'search' | 'clear' | 'retry' | 'initial';
  term: string;
}

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [AsyncPipe, FormsModule, BookItemComponent, BookCarouselComponent],
  templateUrl: './book-list.component.html',
  host: { '(document:keydown)': 'onDocumentKeydown($event)' }
})
export class BookListComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly actions = new Subject<BookListAction>();

  @Input() pageSize = 10;
  searchTerm = '';
  view: 'list' | 'carousel' = 'list';
  partyMode = false;
  private partySequence = '';

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

  selectView(view: 'list' | 'carousel'): void {
    this.view = view;
    this.partyMode = false;
    this.partySequence = '';
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (this.view !== 'carousel') return;
    if (event.key === 'Escape') {
      this.partyMode = false;
      this.partySequence = '';
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.repeat) return;
    if (event.key.length !== 1) {
      this.partySequence = '';
      return;
    }
    this.partySequence = (this.partySequence + event.key.toLowerCase()).slice(-5);
    if (this.partySequence === 'party') {
      this.partyMode = true;
      this.partySequence = '';
    }
  }
}
