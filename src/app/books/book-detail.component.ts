import { AsyncPipe, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';

interface BookDetailState {
  loading: boolean;
  book?: Book;
  error?: 'not-found' | 'request';
}

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink],
  template: `
    <div class="container mx-auto px-4 py-12 max-w-5xl">
      <a routerLink="/" class="inline-block mb-8 text-blue-700 underline hover:text-blue-900">
        &larr; Back to book collection
      </a>

      <ng-container *ngIf="state$ | async as state">
        <div *ngIf="state.loading" role="status" class="py-20 text-center text-gray-600">
          <div
            aria-hidden="true"
            class="mx-auto mb-4 h-16 w-16 rounded-full border-4 border-blue-700 border-b-gray-200 animate-spin"
          ></div>
          Loading book details...
        </div>

        <section *ngIf="state.error" role="alert" class="bg-gray-50 rounded-xl p-8 text-center">
          <h1 class="text-2xl font-bold text-gray-800 mb-4">
            {{ state.error === 'not-found' ? 'Book not found' : 'Unable to load book' }}
          </h1>
          <p class="text-gray-600 mb-6">
            {{
              state.error === 'not-found'
                ? 'This book does not exist or is no longer available.'
                : 'Please check your connection and try again.'
            }}
          </p>
          <button
            *ngIf="state.error === 'request'"
            (click)="retry()"
            class="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md"
          >
            Try again
          </button>
        </section>

        <article *ngIf="state.book as book" class="bg-white rounded-lg shadow-md overflow-hidden">
          <div class="grid grid-cols-1 md:grid-cols-[18rem_1fr]">
            <div class="bg-gray-100 p-6 flex items-start justify-center">
              <img
                *ngIf="book.cover && !coverFailed"
                [src]="book.cover"
                [alt]="'Cover of ' + (book.title || 'this book')"
                (error)="coverFailed = true"
                class="w-full max-w-72 object-contain"
              />
              <p *ngIf="!book.cover || coverFailed" class="py-20 text-gray-500">No cover available</p>
            </div>
            <div class="p-6 md:p-8 min-w-0">
              <h1 class="text-3xl font-bold text-blue-700 mb-2 break-words">{{ book.title || 'Untitled book' }}</h1>
              <p *ngIf="book.subtitle" class="text-lg text-gray-600 mb-4">{{ book.subtitle }}</p>
              <p class="text-lg text-gray-700 mb-6">{{ book.author || 'Unknown author' }}</p>
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-gray-700 break-words">
                <dt class="font-semibold">ISBN</dt>
                <dd>{{ book.isbn || 'Not available' }}</dd>
                <dt class="font-semibold">Publisher</dt>
                <dd>{{ book.publisher || 'Not available' }}</dd>
                <dt class="font-semibold">Publication date</dt>
                <dd>{{ book.publishedAt || 'Not available' }}</dd>
                <dt class="font-semibold">Pages</dt>
                <dd>{{ book.numPages ?? 'Not available' }}</dd>
                <dt class="font-semibold">Price</dt>
                <dd>{{ book.price || 'Not available' }}</dd>
                <ng-container *ngIf="book.coAuthors?.length">
                  <dt class="font-semibold">Co-authors</dt>
                  <dd>{{ book.coAuthors?.join(', ') }}</dd>
                </ng-container>
              </dl>
            </div>
          </div>
          <section class="p-6 md:p-8 border-t border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Description</h2>
            <p class="text-gray-700 whitespace-pre-line break-words">
              {{ book.abstract || 'No description available.' }}
            </p>
          </section>
        </article>
      </ng-container>
    </div>
  `
})
export class BookDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bookApiClient = inject(BookApiClient);
  private readonly retryRequested = new Subject<void>();
  coverFailed = false;

  readonly state$ = this.route.paramMap.pipe(
    switchMap(params =>
      this.retryRequested.pipe(
        startWith(undefined),
        switchMap(() => {
          this.coverFailed = false;
          return this.bookApiClient.getBook(params.get('id')!).pipe(
            map(
              (book): BookDetailState => (book?.id ? { loading: false, book } : { loading: false, error: 'not-found' })
            ),
            catchError((error: HttpErrorResponse) =>
              of<BookDetailState>({ loading: false, error: error.status === 404 ? 'not-found' : 'request' })
            ),
            startWith<BookDetailState>({ loading: true })
          );
        })
      )
    )
  );

  retry(): void {
    this.retryRequested.next();
  }
}
