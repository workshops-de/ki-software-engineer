import { Injectable } from '@angular/core';

type ErrorContext = { source: 'unhandled' } | { source: 'http'; method: string; url: string; status: number };

@Injectable({ providedIn: 'root' })
export class ErrorReporter {
  private readonly reportedErrors = new WeakSet<object>();

  report(error: unknown, context: ErrorContext): void {
    if (typeof error === 'object' && error !== null) {
      if (this.reportedErrors.has(error)) {
        return;
      }
      this.reportedErrors.add(error);
    }

    console.error('BookMonkey error', context, error);
  }
}
