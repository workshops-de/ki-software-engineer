import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Book } from './book';

@Component({
  selector: 'app-book-item',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div
      class="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
    >
      <div class="relative aspect-[3/4] overflow-hidden">
        <img
          *ngIf="book.cover && failedCover !== book.cover"
          [src]="book.cover"
          [alt]="book.title"
          (error)="failedCover = book.cover"
          class="w-full h-full object-contain bg-gray-100 dark:bg-gray-800"
        />
        <div
          *ngIf="!book.cover || failedCover === book.cover"
          class="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
        >
          <span class="text-gray-500 dark:text-gray-400 text-sm font-medium">No cover available</span>
        </div>
      </div>
      <div class="p-5 flex flex-col flex-grow">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1 line-clamp-2">{{ book.title }}</h2>
        <p *ngIf="book.subtitle" class="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
          {{ book.subtitle }}
        </p>
        <div class="text-sm text-gray-700 dark:text-gray-200 mt-auto">
          <p>
            <span class="text-blue-700 dark:text-blue-300">{{ book.author }}</span>
          </p>
          <p *ngIf="book.isbn" class="text-xs text-gray-500 dark:text-gray-400 mt-2">ISBN: {{ book.isbn }}</p>
        </div>
        <button
          mat-stroked-button
          type="button"
          class="mt-4"
          (click)="details.emit(book)"
          [attr.aria-label]="'Details for ' + book.title"
        >
          Details
        </button>
      </div>
    </div>
  `
})
export class BookItemComponent {
  @Input() book!: Book;
  @Output() details = new EventEmitter<Book>();
  failedCover: string | undefined;
}
