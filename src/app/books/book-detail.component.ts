import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookCoverComponent } from './book-cover.component';
import { RequestErrorComponent } from '../shared/request-error.component';

type BookDetailState = { status: 'loading' | 'not-found' | 'error' } | { status: 'success'; book: Book };

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [AsyncPipe, RouterLink, BookCoverComponent, RequestErrorComponent],
  templateUrl: './book-detail.component.html'
})
export class BookDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bookApiClient = inject(BookApiClient);
  private readonly retryRequests = new Subject<void>();

  // AsyncPipe owns the subscription; both switchMaps cancel obsolete requests.
  readonly state$: Observable<BookDetailState> = this.route.paramMap.pipe(
    map(params => params.get('id') ?? ''),
    distinctUntilChanged(),
    switchMap(id =>
      this.retryRequests.pipe(
        startWith(undefined),
        switchMap(() =>
          this.bookApiClient.getBook(id).pipe(
            map((book): BookDetailState => ({ status: 'success', book })),
            catchError((error: unknown) =>
              of<BookDetailState>({
                status: error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error'
              })
            ),
            startWith<BookDetailState>({ status: 'loading' })
          )
        )
      )
    )
  );

  retry(): void {
    this.retryRequests.next();
  }
}
