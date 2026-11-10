import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';
import { tap } from 'rxjs';

type ErrorReport =
  | { source: 'http'; method: string; status: number }
  | { source: 'runtime' | 'bootstrap'; error: unknown };

/** Local diagnostic sink; HTTP reports omit request URLs, query strings, and response bodies. */
export function reportError(report: ErrorReport): void {
  console.error('[BookMonkey]', report);
}

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    reportError({ source: 'runtime', error });
  }
}

/** Observe failures without changing the feature's original error or retry semantics. */
export const httpErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    tap({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status !== 404) {
          reportError({ source: 'http', method: request.method, status: error.status });
        }
      }
    })
  );
