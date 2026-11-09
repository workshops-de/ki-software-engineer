import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';

interface BookDetailsState {
  loading: boolean;
  book: Book | null;
  error: 'not-found' | 'request' | null;
}

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto max-w-5xl px-4 py-12">
      <a
        routerLink="/"
        tabindex="0"
        class="mb-8 inline-block rounded text-blue-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
      >
        Back to book collection
      </a>

      <section *ngIf="state$ | async as state" [attr.aria-busy]="state.loading">
        <p *ngIf="state.loading" role="status" class="py-20 text-center text-gray-600">Loading book...</p>

        <div *ngIf="state.error === 'not-found'" class="rounded-xl bg-gray-50 p-8 text-center">
          <h1 class="mb-3 text-2xl font-bold text-gray-800">Book not found</h1>
          <p class="text-gray-600">The requested book could not be found.</p>
        </div>

        <div *ngIf="state.error === 'request'" role="alert" class="rounded-xl bg-gray-50 p-8 text-center">
          <h1 class="mb-3 text-2xl font-bold text-gray-800">Could not load book</h1>
          <p class="mb-6 text-gray-600">Please try again.</p>
          <button
            type="button"
            (click)="retry()"
            class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
          >
            Try again
          </button>
        </div>

        <article *ngIf="state.book as book" class="grid min-w-0 gap-8 md:grid-cols-[16rem_minmax(0,1fr)]">
          <div class="mx-auto aspect-[3/4] w-full max-w-64 overflow-hidden rounded-lg bg-gray-100">
            <img
              *ngIf="book.cover && !coverFailed; else noCover"
              [src]="book.cover"
              [alt]="'Cover of ' + book.title"
              (error)="coverFailed = true"
              class="h-full w-full object-contain"
            />
            <ng-template #noCover>
              <div class="flex h-full items-center justify-center p-4 text-gray-500">No cover available</div>
            </ng-template>
          </div>

          <div class="min-w-0 break-words">
            <h1 class="mb-2 text-3xl font-bold text-blue-700">{{ book.title }}</h1>
            <p *ngIf="book.subtitle" class="mb-3 text-xl text-gray-600">{{ book.subtitle }}</p>
            <p *ngIf="book.author" class="mb-6 text-lg text-gray-700">{{ book.author }}</p>

            <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-gray-700">
              <ng-container *ngIf="book.isbn">
                <dt class="font-semibold">ISBN</dt>
                <dd>{{ book.isbn }}</dd>
              </ng-container>
              <ng-container *ngIf="book.publisher">
                <dt class="font-semibold">Publisher</dt>
                <dd>{{ book.publisher }}</dd>
              </ng-container>
              <ng-container *ngIf="book.numPages">
                <dt class="font-semibold">Pages</dt>
                <dd>{{ book.numPages }}</dd>
              </ng-container>
              <ng-container *ngIf="book.price">
                <dt class="font-semibold">Price</dt>
                <dd>{{ book.price }}</dd>
              </ng-container>
            </dl>

            <section *ngIf="book.abstract" class="mt-8" aria-labelledby="book-description-heading">
              <h2 id="book-description-heading" class="mb-3 text-xl font-semibold text-gray-800">Description</h2>
              <p class="whitespace-pre-line leading-relaxed text-gray-700">{{ book.abstract }}</p>
            </section>
          </div>
        </article>
      </section>
    </div>
  `
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
        map((book): BookDetailsState => ({ loading: false, book, error: null })),
        catchError((error: HttpErrorResponse) =>
          of<BookDetailsState>({
            loading: false,
            book: null,
            error: error.status === 404 ? 'not-found' : 'request'
          })
        ),
        startWith<BookDetailsState>({ loading: true, book: null, error: null })
      );
    })
  );

  retry(): void {
    this.reload.next();
  }
}
