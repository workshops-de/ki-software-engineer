import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';

@Component({
  selector: 'app-book-item',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './book-item.component.html'
})
export class BookItemComponent {
  @Input() book!: Book;
}
