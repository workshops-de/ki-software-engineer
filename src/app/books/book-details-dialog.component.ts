import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';

@Component({
  selector: 'app-book-details-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './book-details-dialog.component.html',
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    mat-form-field {
      width: 100%;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    dt {
      font-weight: 600;
    }
  `
})
export class BookDetailsDialogComponent implements OnInit {
  private readonly api = inject(BookApiClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly dialogRef = inject(MatDialogRef<BookDetailsDialogComponent, Book>);
  readonly data = inject<{ isbn: string }>(MAT_DIALOG_DATA);
  state: 'loading' | 'viewing' | 'editing' | 'saving' | 'error' = 'loading';
  book?: Book;
  loadError = '';
  saveError = '';
  coverFailed = false;

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    subtitle: new FormControl('', { nonNullable: true }),
    author: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    publisher: new FormControl('', { nonNullable: true }),
    numPages: new FormControl<number | null>(null, [
      Validators.required,
      control => (Number.isInteger(control.value) && control.value > 0 ? null : { positiveInteger: true })
    ]),
    price: new FormControl('', { nonNullable: true }),
    cover: new FormControl('', { nonNullable: true }),
    abstract: new FormControl('', { nonNullable: true })
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state = 'loading';
    this.loadError = '';
    this.api
      .getBook(this.data.isbn)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: book => {
          this.book = book;
          this.coverFailed = false;
          this.state = 'viewing';
        },
        error: (error: HttpErrorResponse) => {
          this.loadError =
            error.status === 404
              ? 'This book could not be found. It may have been removed.'
              : 'Could not load book details. Please try again.';
          this.state = 'error';
        }
      });
  }

  edit(): void {
    if (!this.book) return;
    this.form.reset({ ...this.book, subtitle: this.book.subtitle ?? '' });
    this.saveError = '';
    this.state = 'editing';
  }

  cancel(): void {
    if (this.state !== 'editing') return;
    this.form.reset();
    this.saveError = '';
    this.state = 'viewing';
  }

  save(): void {
    if (this.state !== 'editing' || !this.book) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const draft = this.form.getRawValue();
    const updated: Book = { ...this.book, ...draft, numPages: draft.numPages! };
    this.state = 'saving';
    this.saveError = '';
    this.dialogRef.disableClose = true;
    this.form.disable();
    this.api
      .updateBook(this.data.isbn, updated)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: book => this.dialogRef.close(book),
        error: () => {
          this.state = 'editing';
          this.dialogRef.disableClose = false;
          this.form.enable();
          this.saveError = 'Could not save your changes. Please try again.';
        }
      });
  }
}
