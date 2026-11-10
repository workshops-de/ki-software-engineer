import { App } from './app/app';
import { appConfig } from './app/app.config';
import { bootstrapApplication } from '@angular/platform-browser';
import { reportError } from './app/shared/error-reporting';

bootstrapApplication(App, appConfig).catch((error: unknown) => reportError({ source: 'bootstrap', error }));
