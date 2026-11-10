import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Presentation only: the owning feature decides the heading, message, and retry behavior. */
@Component({
  selector: 'app-request-error',
  standalone: true,
  host: { class: 'block rounded-lg bg-gray-50 p-8', role: 'alert' },
  template: `
    <ng-content />
    @if (retryable) {
      <button
        type="button"
        (click)="retry.emit()"
        class="mt-6 rounded-md bg-blue-700 px-5 py-2 text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
      >
        Retry
      </button>
    }
  `
})
export class RequestErrorComponent {
  @Input() retryable = false;
  @Output() readonly retry = new EventEmitter<void>();
}
