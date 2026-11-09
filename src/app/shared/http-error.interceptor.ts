import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorReporter } from './error-reporter.service';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const reporter = inject(ErrorReporter);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500)) {
        reporter.report(error, {
          source: 'http',
          method: request.method,
          url: request.url,
          status: error.status
        });
      }

      // The feature owns error states and retry. Reporting never consumes the failure or shows a toast.
      return throwError(() => error);
    })
  );
};
