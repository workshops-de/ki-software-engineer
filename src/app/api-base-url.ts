import { InjectionToken } from '@angular/core';

/** API origin supplied by the application configuration, without a trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
