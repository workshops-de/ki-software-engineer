import { Routes } from '@angular/router';
import { BookListComponent } from './books/book-list.component';
import { BookDetailsComponent } from './books/book-details.component';

export const routes: Routes = [
  { path: '', component: BookListComponent },
  { path: 'books/:id', component: BookDetailsComponent },
  { path: '**', redirectTo: '' }
];
