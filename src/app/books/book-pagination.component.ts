import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-book-pagination',
  standalone: true,
  host: { class: 'block' },
  templateUrl: './book-pagination.component.html'
})
export class BookPaginationComponent {
  @Input({ required: true }) currentPage!: number;
  @Input({ required: true }) pages!: readonly number[];
  @Output() readonly pageChange = new EventEmitter<number>();
}
