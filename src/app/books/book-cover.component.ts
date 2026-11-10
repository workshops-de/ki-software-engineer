import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-book-cover',
  standalone: true,
  host: { class: 'block aspect-[3/4] overflow-hidden rounded-lg bg-subtle' },
  template: `
    @if (src && !failed) {
      <img [src]="src" [alt]="title" (error)="failed = true" class="h-full w-full object-contain" />
    } @else {
      <div class="flex h-full items-center justify-center p-4 text-center text-muted">No cover available</div>
    }
  `
})
export class BookCoverComponent implements OnChanges {
  @Input({ required: true }) src!: string;
  @Input({ required: true }) title!: string;
  protected failed = false;

  ngOnChanges(): void {
    this.failed = false;
  }
}
