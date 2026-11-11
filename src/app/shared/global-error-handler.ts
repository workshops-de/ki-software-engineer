import { ErrorHandler, inject, Injectable, Injector, NgZone } from '@angular/core';
import { ErrorReporter } from './error-reporter.service';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly reporter = inject(ErrorReporter);
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly notifiedErrors = new WeakSet<object>();

  handleError(error: unknown): void {
    this.reporter.report(error, { source: 'unhandled' });

    if (typeof error === 'object' && error !== null) {
      if (this.notifiedErrors.has(error)) {
        return;
      }
      this.notifiedErrors.add(error);
    }

    // Resolve the notification lazily: ErrorHandler is also constructed during bootstrap.
    try {
      this.zone.run(() => {
        this.injector.get(ToastService).show('An unexpected error occurred. Please reload the page.', 6000);
      });
    } catch (notificationError) {
      this.reporter.report(notificationError, { source: 'unhandled' });
    }
  }
}
