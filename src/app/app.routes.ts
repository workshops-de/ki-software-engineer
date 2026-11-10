import { Routes } from '@angular/router';
import { BookListComponent } from './books/book-list.component';
import { BookDetailComponent } from './books/book-detail.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
  { path: '', component: BookListComponent },
  { path: 'books/:id', component: BookDetailComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' }
];
