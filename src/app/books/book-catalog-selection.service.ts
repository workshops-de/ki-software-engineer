import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BookCatalogSelection {
  // Keep only navigation intent for this SPA visit, not book responses or persistent storage.
  selection = { term: '', page: 1 };
}
