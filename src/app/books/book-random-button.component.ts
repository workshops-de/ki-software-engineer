import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BookDialogService } from './book-dialog.service';
import { BookRandomDialogComponent } from './book-random-dialog.component';

@Component({
  selector: 'app-book-random-button',
  imports: [MatDialogModule],
  template: `
    <button
      #trigger
      type="button"
      aria-label="Zufälliges Buch auswürfeln"
      title="Zufälliges Buch auswürfeln"
      class="inline-flex size-11 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
      (click)="open(trigger)"
    >
      <svg aria-hidden="true" class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <g fill="currentColor" stroke="none">
          <circle cx="7.5" cy="7.5" r="1.5" />
          <circle cx="16.5" cy="7.5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="7.5" cy="16.5" r="1.5" />
          <circle cx="16.5" cy="16.5" r="1.5" />
        </g>
      </svg>
    </button>
  `
})
export class BookRandomButtonComponent {
  private readonly dialog = inject(MatDialog);
  private readonly books = inject(BookDialogService);
  private readonly destroyRef = inject(DestroyRef);

  open(trigger: HTMLButtonElement): void {
    // Safari does not focus buttons on mouse clicks; capture a reliable return target.
    trigger.focus();
    this.dialog
      .open<BookRandomDialogComponent, void, string>(BookRandomDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        maxHeight: '90dvh',
        autoFocus: 'first-heading',
        restoreFocus: true
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isbn => {
        if (isbn) this.books.openDetails(isbn);
      });
  }
}
