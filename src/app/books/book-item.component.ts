import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';
import { BookCoverComponent } from './book-cover.component';

@Component({
  selector: 'app-book-item',
  standalone: true,
  imports: [RouterLink, BookCoverComponent],
  templateUrl: './book-item.component.html'
})
export class BookItemComponent {
  @Input({ required: true }) book!: Book;
}
