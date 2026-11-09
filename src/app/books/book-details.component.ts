import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';

type BookDetailsState =
  | { status: 'loading' }
  | { status: 'success'; book: Book }
  | { status: 'not-found' }
  | { status: 'error' };

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  templateUrl: './book-details.component.html'
})
export class BookDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bookApiClient = inject(BookApiClient);
  private readonly reload = new Subject<void>();

  coverFailed = false;

  readonly state$ = combineLatest([
    this.route.paramMap.pipe(
      map(params => params.get('id')!),
      distinctUntilChanged()
    ),
    this.reload.pipe(startWith(undefined))
  ]).pipe(
    switchMap(([id]) => {
      this.coverFailed = false;
      return this.bookApiClient.getBook(id).pipe(
        map((book): BookDetailsState => ({ status: 'success', book })),
        catchError((error: HttpErrorResponse) =>
          of<BookDetailsState>({
            status: error.status === 404 ? 'not-found' : 'error'
          })
        ),
        startWith<BookDetailsState>({ status: 'loading' })
      );
    })
  );

  retry(): void {
    this.reload.next();
  }

  onCoverError(): void {
    this.coverFailed = true;
  }
}
