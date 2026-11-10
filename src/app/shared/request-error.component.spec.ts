import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RequestErrorComponent } from './request-error.component';

@Component({
  imports: [RequestErrorComponent],
  template: `
    <app-request-error [retryable]="retryable" (retry)="attempts = attempts + 1">
      <h1>Book not found</h1>
      <p>Choose another book.</p>
    </app-request-error>
  `
})
class ErrorViewHost {
  retryable = false;
  attempts = 0;
}

describe('RequestErrorComponent', () => {
  it('preserves feature-owned content and only exposes Retry when requested', () => {
    const fixture = TestBed.createComponent(ErrorViewHost);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"] h1')?.textContent).toBe('Book not found');
    expect(element.querySelector('button')).toBeNull();
    fixture.componentInstance.retryable = true;
    fixture.detectChanges();
    element.querySelector('button')!.click();
    expect(fixture.componentInstance.attempts).toBe(1);
  });
});
